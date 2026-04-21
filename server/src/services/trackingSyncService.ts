import TrackingRecord from '../models/TrackingRecord';
import Package from '../models/Package';
import Notification from '../models/Notification';
import { parseCitiesFromTraces } from '../utils/cityParser';
import { normalizeCityName } from '../utils/cityMap';
import geocodingService from './geocodingService';
import { Types } from 'mongoose';
import { PackageStatus } from '../types';

const DELIVERY_KEYWORD_PATTERN = /已签收|签收人[：:]|本人签收|他人代收|代收点签收|已妥投|投递并签收|客户签收|签收完毕|门卫代收|前台代收|快递柜签收|丰巢签收|驿站签收|自提点签收|代收签收|菜鸟驿站.*签收|智能柜.*取件/;

const NOT_DELIVERED_PATTERN = /等待签收|待签收|预约签收|即将签收|准备签收|未签收/;

export function detectDeliveryFromTraces(traces: TrackingTrace[]): boolean {
  if (!traces || traces.length === 0) return false;

  for (let i = traces.length - 1; i >= 0; i--) {
    const desc = traces[i].description;
    if (!desc) continue;
    if (NOT_DELIVERED_PATTERN.test(desc)) continue;
    if (DELIVERY_KEYWORD_PATTERN.test(desc)) {
      return true;
    }
  }

  return false;
}

export function resolvePackageStatus(
  apiStatus: string,
  traces: TrackingTrace[],
): 'in_transit' | 'delivered' | 'exception' {
  if (apiStatus === 'delivered') return 'delivered';

  if (detectDeliveryFromTraces(traces)) {
    console.log('[TrackingSync] 轨迹描述检测到签收关键词，状态自动更新为 delivered');
    return 'delivered';
  }

  if (apiStatus === 'exception') return 'exception';

  return 'in_transit';
}

export interface TrackingTrace {
  timestamp: string;
  description: string;
  city: string;
}

export interface EnrichedTrackingTrace extends TrackingTrace {
  location: { lng: number; lat: number } | null;
}

export async function enrichTracesWithCoordinates(
  traces: TrackingTrace[],
): Promise<EnrichedTrackingTrace[]> {
  if (!traces || traces.length === 0) {
    return [];
  }

  const parsedCities = parseCitiesFromTraces(traces);

  const uniqueCities = [
    ...new Set(
      parsedCities
        .filter((c) => c.matched && c.city)
        .map((c) => normalizeCityName(c.city)),
    ),
  ];

  const cityCoordinates = await geocodingService.batchGetCoordinates(uniqueCities);

  const enrichedTraces: EnrichedTrackingTrace[] = traces.map((trace, index) => {
    const parsed = parsedCities[index];
    let location: { lng: number; lat: number } | null = null;

    if (parsed.matched && parsed.city) {
      const normalizedCity = normalizeCityName(parsed.city);
      const geoResult = cityCoordinates.get(normalizedCity) || cityCoordinates.get(parsed.city);
      if (geoResult && geoResult.coordinate) {
        location = { lng: geoResult.coordinate.lng, lat: geoResult.coordinate.lat };
      }
    }

    return {
      timestamp: trace.timestamp,
      description: trace.description,
      city: parsed.matched ? parsed.city : trace.city,
      location,
    };
  });

  return enrichedTraces;
}

export async function syncTrackingRecords(
  packageId: Types.ObjectId,
  traces: TrackingTrace[],
): Promise<Types.ObjectId[]> {
  const enrichedTraces = await enrichTracesWithCoordinates(traces);

  const recordIds: Types.ObjectId[] = [];
  for (const trace of enrichedTraces) {
    const record = await TrackingRecord.create({
      packageId,
      timestamp: new Date(trace.timestamp),
      description: trace.description,
      city: trace.city,
      location: trace.location ? { lng: trace.location.lng, lat: trace.location.lat } : null,
      syncedAt: new Date(),
    });
    recordIds.push(record._id as Types.ObjectId);
  }

  return recordIds;
}

export async function updatePackageCities(
  packageId: Types.ObjectId,
  traces: TrackingTrace[],
): Promise<void> {
  if (!traces || traces.length === 0) return;

  const parsedCities = parseCitiesFromTraces(traces);

  const fromCity = parsedCities.length > 0 && parsedCities[0].matched
    ? parsedCities[0].city
    : '';

  const lastIdx = parsedCities.length - 1;
  const toCity = lastIdx >= 0 && parsedCities[lastIdx].matched
    ? parsedCities[lastIdx].city
    : '';

  const updateData: Record<string, unknown> = {};
  if (fromCity) updateData.fromCity = fromCity;
  if (toCity) updateData.toCity = toCity;

  if (Object.keys(updateData).length > 0) {
    await Package.findByIdAndUpdate(packageId, updateData);
    console.log(
      `[TrackingSync] 更新快递城市: ${packageId}, fromCity=${fromCity}, toCity=${toCity}`,
    );
  }
}

const STATUS_CHANGE_TITLE: Record<PackageStatus, string> = {
  delivered: '快递已签收',
  exception: '快递状态异常',
  in_transit: '快递状态更新',
};

const STATUS_CHANGE_CONTENT: Record<PackageStatus, string> = {
  delivered: '您的快递已成功签收，可前往详情查看完整物流轨迹',
  exception: '您的快递出现异常，请及时查看详情了解情况',
  in_transit: '您的快递状态已更新为运输中',
};

export async function createStatusChangeNotification(
  packageId: Types.ObjectId,
  userId: Types.ObjectId,
  oldStatus: PackageStatus,
  newStatus: PackageStatus,
  trackingNo: string,
  alias: string,
): Promise<void> {
  if (oldStatus === newStatus) return;

  const title = STATUS_CHANGE_TITLE[newStatus] || '快递状态变更';
  const displayName = alias || trackingNo;
  const content = `${displayName}：${STATUS_CHANGE_CONTENT[newStatus] || '状态已变更'}`;

  try {
    await Notification.create({
      userId,
      packageId,
      title,
      content,
      isRead: false,
    });
    console.log(
      `[TrackingSync] 创建状态变更通知: ${trackingNo}, ${oldStatus} -> ${newStatus}`,
    );
  } catch (error) {
    console.error(
      '[TrackingSync] 创建状态变更通知失败:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
