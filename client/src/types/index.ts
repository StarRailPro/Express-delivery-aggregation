export type PackageStatus = 'in_transit' | 'delivered' | 'exception';

export interface IPackage {
  _id: string;
  userId: string;
  trackingNo: string;
  carrier: string;
  carrierCode: string;
  alias: string;
  status: PackageStatus;
  fromCity: string;
  toCity: string;
  lastSyncAt: string | null;
  isArchived: boolean;
  trackingRecords: ITrackingRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ITrackingRecord {
  _id: string;
  packageId: string;
  timestamp: string;
  description: string;
  city: string;
  location: {
    lng: number;
    lat: number;
  } | null;
  syncedAt: string;
}

export interface IUser {
  _id: string;
  username: string;
  packages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

export interface ILoginParams {
  username: string;
  password: string;
}

export interface IRegisterParams {
  username: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  user: IUser;
}

export const PACKAGE_STATUS_MAP: Record<PackageStatus, string> = {
  in_transit: '运输中',
  delivered: '已签收',
  exception: '异常',
};
