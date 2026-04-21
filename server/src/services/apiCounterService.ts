import ApiCallLog from '../models/ApiCallLog';

interface ApiCallRecord {
  apiName: string;
  timestamp: Date;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
}

interface DailyStats {
  date: string;
  total: number;
  success: number;
  failed: number;
  byApi: Record<string, { total: number; success: number; failed: number }>;
}

const MAX_RECORDS = 10000;

class ApiCounterService {
  private records: ApiCallRecord[] = [];

  record(apiName: string, success: boolean, durationMs: number, errorMessage?: string): void {
    const entry: ApiCallRecord = {
      apiName,
      timestamp: new Date(),
      success,
      durationMs,
      errorMessage,
    };

    this.records.push(entry);

    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(-MAX_RECORDS);
    }

    ApiCallLog.create({
      apiName,
      success,
      durationMs,
      errorMessage: errorMessage || null,
      timestamp: entry.timestamp,
    }).catch(() => {});
  }

  getDailyStats(dateStr?: string): DailyStats {
    const targetDate = dateStr ?? new Date().toISOString().split('T')[0];
    const dayRecords = this.records.filter(
      (r) => r.timestamp.toISOString().split('T')[0] === targetDate,
    );

    const stats: DailyStats = {
      date: targetDate,
      total: dayRecords.length,
      success: dayRecords.filter((r) => r.success).length,
      failed: dayRecords.filter((r) => !r.success).length,
      byApi: {},
    };

    for (const record of dayRecords) {
      if (!stats.byApi[record.apiName]) {
        stats.byApi[record.apiName] = { total: 0, success: 0, failed: 0 };
      }
      stats.byApi[record.apiName].total++;
      if (record.success) {
        stats.byApi[record.apiName].success++;
      } else {
        stats.byApi[record.apiName].failed++;
      }
    }

    return stats;
  }

  getRecentRecords(limit: number = 50): ApiCallRecord[] {
    return this.records.slice(-limit);
  }

  getStatsRange(startDate: string, endDate: string): DailyStats[] {
    const stats: DailyStats[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      stats.push(this.getDailyStats(dateStr));
    }

    return stats;
  }
}

const apiCounterService = new ApiCounterService();

export async function recordApiCall(apiName: string, fn: () => Promise<unknown>): Promise<unknown> {
  const startTime = Date.now();
  try {
    const result = await fn();
    apiCounterService.record(apiName, true, Date.now() - startTime);
    return result;
  } catch (error) {
    apiCounterService.record(
      apiName,
      false,
      Date.now() - startTime,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

export { apiCounterService };
