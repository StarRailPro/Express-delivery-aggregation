import { model, Schema, Document } from 'mongoose';

export interface IApiCallLog {
  apiName: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  timestamp: Date;
}

export type ApiCallLogDocument = IApiCallLog & Document;

const apiCallLogSchema = new Schema<ApiCallLogDocument>(
  {
    apiName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    durationMs: {
      type: Number,
      required: true,
      min: 0,
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  },
);

apiCallLogSchema.index({ timestamp: -1 });
apiCallLogSchema.index({ apiName: 1, timestamp: -1 });

apiCallLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const ApiCallLog = model<ApiCallLogDocument>('ApiCallLog', apiCallLogSchema);

export default ApiCallLog;
