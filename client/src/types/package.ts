import type { IPackage, ITrackingRecord, PackageStatus } from './index';

export type { IPackage, ITrackingRecord, PackageStatus };

export interface IPackageListItem {
  id: string;
  trackingNo: string;
  carrier: string;
  carrierCode: string;
  alias: string;
  status: PackageStatus;
  fromCity: string;
  toCity: string;
  lastSyncAt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPackageListResponse {
  total: number;
  grouped: Record<PackageStatus, IPackage[]>;
  packages: IPackage[];
}

export interface IPackageDetailResponse {
  package: IPackageListItem;
  trackingRecords: ITrackingRecord[];
}

export interface IPackageCreateParams {
  trackingNo: string;
  alias?: string;
}

export interface IPackageUpdateParams {
  alias?: string;
  status?: PackageStatus;
}
