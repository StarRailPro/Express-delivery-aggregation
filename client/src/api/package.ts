import request from './request';
import type { IApiResponse } from '@/types';
import type {
  IPackageListResponse,
  IPackageDetailResponse,
  IPackageListItem,
  IPackageCreateParams,
  IPackageUpdateParams,
} from '@/types/package';

export function listPackagesAPI() {
  return request.get<void, IApiResponse<IPackageListResponse>>('/packages');
}

export function getPackageAPI(id: string) {
  return request.get<void, IApiResponse<IPackageDetailResponse>>(`/packages/${id}`);
}

export function createPackageAPI(params: IPackageCreateParams) {
  return request.post<void, IApiResponse<IPackageListItem>>('/packages', params);
}

export function deletePackageAPI(id: string) {
  return request.delete<void, IApiResponse<null>>(`/packages/${id}`);
}

export function refreshPackageAPI(id: string) {
  return request.post<void, IApiResponse<IPackageDetailResponse>>(`/packages/${id}/refresh`);
}

export function updatePackageAPI(id: string, params: IPackageUpdateParams) {
  return request.put<void, IApiResponse<IPackageListItem>>(`/packages/${id}`, params);
}
