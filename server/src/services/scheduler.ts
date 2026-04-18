import cron from 'node-cron';
import Package from '../models/Package';
import TrackingRecord from '../models/TrackingRecord';
import expressApiService from './expressApiService';
import { syncTrackingRecords, updatePackageCities } from './trackingSyncService';
import { runWithConcurrency, TaskResult } from '../utils/concurrency';
import { Types } from 'mongoose';

const DEFAULT_CRON_EXPRESSION = '0 */2 * * *';
const SCHEDULER_CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 500;

interface RefreshLog {
  timestamp: Date;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  details: Array<{
    packageId: string;
    trackingNo: string;
    status: 'success' | 'failure' | 'skipped';
    error?: string;
  }>;
}

const refreshLogs: RefreshLog[] = [];
const MAX_LOG_ENTRIES = 100;

let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;

function getCronExpression(): string {
  return process.env.SCHEDULER_CRON_EXPRESSION || DEFAULT_CRON_EXPRESSION;
}

async function refreshSinglePackage(pkg: {
  _id: Types.ObjectId;
  trackingNo: string;
  carrierCode: string;
  status: string;
}): Promise<{ status: 'success' | 'failure' | 'skipped'; error?: string }> {
  if (pkg.status === 'delivered') {
    return { status: 'skipped' };
  }

  try {
    const trackingResult = await expressApiService.getTrackingInfo(
      pkg.trackingNo,
      pkg.carrierCode,
    );

    await TrackingRecord.deleteMany({ packageId: pkg._id });

    const recordIds = await syncTrackingRecords(pkg._id, trackingResult.traces);

    const updateData: Record<string, unknown> = {
      lastSyncAt: new Date(),
      trackingRecords: recordIds,
    };

    if (
      trackingResult.status === 'delivered' ||
      trackingResult.status === 'exception' ||
      trackingResult.status === 'in_transit'
    ) {
      updateData.status = trackingResult.status;
    }

    await updatePackageCities(pkg._id, trackingResult.traces);

    await Package.findByIdAndUpdate(pkg._id, updateData);

    return { status: 'success' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Scheduler] 刷新快递失败: ${pkg.trackingNo} - ${errorMessage}`,
    );
    return { status: 'failure', error: errorMessage };
  }
}

async function executeScheduledRefresh(): Promise<RefreshLog> {
  const log: RefreshLog = {
    timestamp: new Date(),
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    details: [],
  };

  console.log('[Scheduler] ===== 定时刷新任务开始 =====');

  const packages = await Package.find({
    status: { $in: ['in_transit', 'exception'] },
    isArchived: false,
  }).select('_id trackingNo carrierCode status');

  console.log(
    `[Scheduler] 查询到 ${packages.length} 个需要刷新的快递（状态: in_transit / exception）`,
  );

  if (packages.length === 0) {
    log.totalProcessed = 0;
    addLog(log);
    console.log('[Scheduler] 无需刷新的快递，任务结束');
    return log;
  }

  const packageItems = packages.map((p) => ({
    _id: p._id as Types.ObjectId,
    trackingNo: p.trackingNo,
    carrierCode: p.carrierCode,
    status: p.status,
  }));

  const results: TaskResult<typeof packageItems[0]>[] = await runWithConcurrency(
    packageItems,
    (item) => refreshSinglePackage(item),
    {
      concurrency: SCHEDULER_CONCURRENCY,
      delayBetweenBatches: DELAY_BETWEEN_BATCHES_MS,
    },
  );

  for (const r of results) {
    const refreshResult = r.result as Awaited<ReturnType<typeof refreshSinglePackage>> | undefined;
    const detail = {
      packageId: String(r.item._id),
      trackingNo: r.item.trackingNo,
      status: refreshResult?.status || 'failure',
      error: refreshResult?.error,
    };

    log.details.push(detail);

    if (detail.status === 'success') {
      log.successCount++;
    } else if (detail.status === 'skipped') {
      log.skippedCount++;
    } else {
      log.failureCount++;
    }
  }

  log.totalProcessed = packages.length;

  addLog(log);

  console.log(
    `[Scheduler] ===== 定时刷新任务完成 ===== 总计: ${log.totalProcessed}, 成功: ${log.successCount}, 失败: ${log.failureCount}, 跳过: ${log.skippedCount}`,
  );

  return log;
}

function addLog(log: RefreshLog): void {
  refreshLogs.push(log);
  if (refreshLogs.length > MAX_LOG_ENTRIES) {
    refreshLogs.splice(0, refreshLogs.length - MAX_LOG_ENTRIES);
  }
}

export function startScheduler(): void {
  if (schedulerTask) {
    console.log('[Scheduler] 定时任务已在运行中，跳过重复启动');
    return;
  }

  const cronExpression = getCronExpression();

  if (!cron.validate(cronExpression)) {
    console.error(
      `[Scheduler] 无效的 cron 表达式: "${cronExpression}"，使用默认值: "${DEFAULT_CRON_EXPRESSION}"`,
    );
    schedulerTask = cron.schedule(DEFAULT_CRON_EXPRESSION, async () => {
      if (isRunning) {
        console.log('[Scheduler] 上一次刷新尚未完成，跳过本次执行');
        return;
      }
      isRunning = true;
      try {
        await executeScheduledRefresh();
      } catch (error) {
        console.error(
          '[Scheduler] 定时刷新任务异常:',
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        isRunning = false;
      }
    });
  } else {
    console.log(`[Scheduler] 定时任务已配置，cron 表达式: "${cronExpression}"（默认每2小时执行一次）`);
    schedulerTask = cron.schedule(cronExpression, async () => {
      if (isRunning) {
        console.log('[Scheduler] 上一次刷新尚未完成，跳过本次执行');
        return;
      }
      isRunning = true;
      try {
        await executeScheduledRefresh();
      } catch (error) {
        console.error(
          '[Scheduler] 定时刷新任务异常:',
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        isRunning = false;
      }
    });
  }

  console.log('[Scheduler] 定时刷新服务已启动');
}

export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] 定时刷新服务已停止');
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerTask !== null;
}

export function getRefreshLogs(limit: number = 10): RefreshLog[] {
  return refreshLogs.slice(-limit);
}

export { executeScheduledRefresh, RefreshLog };
