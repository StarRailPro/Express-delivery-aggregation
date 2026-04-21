import request from './request';
import type { IApiResponse } from '@/types';

export interface IDailyTrendItem {
  date: string;
  total: number;
  success: number;
  failed: number;
}

export interface ICategoryItem {
  apiName: string;
  displayName: string;
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}

export interface IRecentError {
  apiName: string;
  errorMessage: string;
  timestamp: string;
  durationMs: number;
}

export interface IApiStatsOverview {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgDuration: number;
}

export interface IApiStatsResponse {
  days: number;
  dateRange: {
    start: string;
    end: string;
  };
  overview: IApiStatsOverview;
  dailyTrend: IDailyTrendItem[];
  categories: ICategoryItem[];
  recentErrors: IRecentError[];
}

export async function getApiStatsAPI(days?: number): Promise<IApiStatsResponse> {
  const params: Record<string, unknown> = {};
  if (days) params.days = days;
  const res = await request.get<unknown, IApiResponse<IApiStatsResponse>>('/admin/api-stats', {
    params,
  });
  return res.data!;
}
