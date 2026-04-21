import request from './request';
import type { IApiResponse, INotification } from '@/types';

export interface IUnreadNotificationsResponse {
  notifications: INotification[];
  total: number;
}

export interface IMarkReadResponse {
  id: string;
  isRead: boolean;
}

export interface IMarkBatchReadResponse {
  modifiedCount: number;
}

export function getUnreadNotificationsAPI() {
  return request.get<void, IApiResponse<IUnreadNotificationsResponse>>('/notifications/unread');
}

export function markNotificationReadAPI(id: string) {
  return request.put<void, IApiResponse<IMarkReadResponse>>(`/notifications/${id}/read`);
}

export function markAllNotificationsReadAPI() {
  return request.put<void, IApiResponse<IMarkBatchReadResponse>>('/notifications/read/all');
}

export function markBatchNotificationsReadAPI(ids: string[]) {
  return request.put<void, IApiResponse<IMarkBatchReadResponse>>('/notifications/read/batch', { ids });
}
