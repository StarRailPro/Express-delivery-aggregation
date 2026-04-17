import { model, Schema, Document, Types } from 'mongoose';
import { ITrackingRecord } from '../types';

export type TrackingRecordDocument = ITrackingRecord & Document;

const trackingRecordSchema = new Schema<TrackingRecordDocument>(
  {
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      default: '',
    },
    location: {
      lng: {
        type: Number,
        default: null,
      },
      lat: {
        type: Number,
        default: null,
      },
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

trackingRecordSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const TrackingRecord = model<TrackingRecordDocument>('TrackingRecord', trackingRecordSchema);

export default TrackingRecord;
