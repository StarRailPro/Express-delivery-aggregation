import { Request, Response } from 'express';
import ApiCallLog from '../models/ApiCallLog';
import { successResponse } from '../utils/responseHandler';
import { AuthenticatedRequest } from '../middleware/auth';

interface DailyAggregation {
  _id: string;
  total: number;
  success: number;
  failed: number;
}

interface CategoryAggregation {
  _id: string;
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}

interface OverviewAggregation {
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}

function getDateRange(days: number): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

function fillMissingDates(
  aggregations: DailyAggregation[],
  startDate: Date,
  endDate: Date,
): DailyAggregation[] {
  const dateMap = new Map<string, DailyAggregation>();
  for (const item of aggregations) {
    dateMap.set(item._id, item);
  }

  const result: DailyAggregation[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const existing = dateMap.get(dateStr);
    result.push(
      existing || { _id: dateStr, total: 0, success: 0, failed: 0 },
    );
    current.setDate(current.getDate() + 1);
  }
  return result;
}

const API_CATEGORY_MAP: Record<string, string> = {
  detectCarrier: '快递识别',
  getTrackingInfo: '物流查询',
  geocoding: 'Geocoding',
};

function mapCategoryName(apiName: string): string {
  return API_CATEGORY_MAP[apiName] || apiName;
}

export async function getApiStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 30);
  const { startDate, endDate } = getDateRange(days);

  const [dailyStats, categoryStats, overview, recentErrors] = await Promise.all([
    ApiCallLog.aggregate<DailyAggregation>([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp',
              timezone: '+08:00',
            },
          },
          total: { $sum: 1 },
          success: {
            $sum: { $cond: ['$success', 1, 0] },
          },
          failed: {
            $sum: { $cond: ['$success', 0, 1] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    ApiCallLog.aggregate<CategoryAggregation>([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$apiName',
          total: { $sum: 1 },
          success: {
            $sum: { $cond: ['$success', 1, 0] },
          },
          failed: {
            $sum: { $cond: ['$success', 0, 1] },
          },
          avgDuration: { $avg: '$durationMs' },
        },
      },
      { $sort: { total: -1 } },
    ]),

    ApiCallLog.aggregate<OverviewAggregation>([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: { $cond: ['$success', 1, 0] },
          },
          failed: {
            $sum: { $cond: ['$success', 0, 1] },
          },
          avgDuration: { $avg: '$durationMs' },
        },
      },
    ]),

    ApiCallLog.find({
      timestamp: { $gte: startDate, $lte: endDate },
      success: false,
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('apiName errorMessage timestamp durationMs')
      .lean(),
  ]);

  const filledDaily = fillMissingDates(dailyStats, startDate, endDate);

  const mappedCategories = categoryStats.map((cat) => ({
    apiName: cat._id,
    displayName: mapCategoryName(cat._id),
    total: cat.total,
    success: cat.success,
    failed: cat.failed,
    avgDuration: Math.round(cat.avgDuration),
  }));

  const overviewData = overview[0] || { total: 0, success: 0, failed: 0, avgDuration: 0 };

  successResponse(res, {
    days,
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    overview: {
      total: overviewData.total,
      success: overviewData.success,
      failed: overviewData.failed,
      successRate:
        overviewData.total > 0
          ? Number(((overviewData.success / overviewData.total) * 100).toFixed(1))
          : 0,
      avgDuration: Math.round(overviewData.avgDuration),
    },
    dailyTrend: filledDaily.map((d) => ({
      date: d._id,
      total: d.total,
      success: d.success,
      failed: d.failed,
    })),
    categories: mappedCategories,
    recentErrors,
  });
}
