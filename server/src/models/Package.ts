import { model, Schema, Document } from 'mongoose';
import { IPackage, PackageStatus } from '../types';

export type PackageDocument = IPackage & Document;

const packageSchema = new Schema<PackageDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trackingNo: {
      type: String,
      required: true,
      trim: true,
    },
    carrier: {
      type: String,
      default: '',
    },
    carrierCode: {
      type: String,
      default: '',
    },
    alias: {
      type: String,
      default: '',
      maxlength: 50,
    },
    status: {
      type: String,
      enum: ['in_transit', 'delivered', 'exception'] as PackageStatus[],
      default: 'in_transit',
      index: true,
    },
    fromCity: {
      type: String,
      default: '',
    },
    toCity: {
      type: String,
      default: '',
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    trackingRecords: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TrackingRecord',
      },
    ],
  },
  {
    timestamps: true,
  },
);

packageSchema.index({ userId: 1, status: 1 });
packageSchema.index({ userId: 1, isArchived: 1 });
packageSchema.index({ userId: 1, trackingNo: 1 });

packageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Package = model<PackageDocument>('Package', packageSchema);

export default Package;
