import { model, Schema, Document } from 'mongoose';
import { INotification } from '../types';

export type NotificationDocument = INotification & Document;

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Notification = model<NotificationDocument>('Notification', notificationSchema);

export default Notification;
