import { Types } from 'mongoose';

export interface IUser {
  username: string;
  password: string;
  packages: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type PackageStatus = 'in_transit' | 'delivered' | 'exception';

export interface IPackage {
  userId: Types.ObjectId;
  trackingNo: string;
  carrier: string;
  carrierCode: string;
  alias: string;
  status: PackageStatus;
  fromCity: string;
  toCity: string;
  lastSyncAt: Date | null;
  isArchived: boolean;
  trackingRecords: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrackingRecord {
  packageId: Types.ObjectId;
  timestamp: Date;
  description: string;
  city: string;
  location: {
    lng: number;
    lat: number;
  } | null;
  syncedAt: Date;
}

export interface IApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

export interface IJwtPayload {
  userId: string;
  username: string;
}

export interface INotification {
  userId: Types.ObjectId;
  packageId: Types.ObjectId;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
