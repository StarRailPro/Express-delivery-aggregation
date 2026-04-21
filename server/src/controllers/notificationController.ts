import { Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import { successResponse } from '../utils/responseHandler';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { Types } from 'mongoose';

export async function getUnread(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const notifications = await Notification.find({
      userId: new Types.ObjectId(userId),
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    successResponse(res, { notifications, total: notifications.length });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!notification) {
      next(new AppError('通知不存在或无权访问', 404));
      return;
    }

    notification.isRead = true;
    await notification.save();

    successResponse(res, {
      id: notification._id,
      isRead: notification.isRead,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const result = await Notification.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );

    successResponse(res, { modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
}

export async function markBatchAsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      next(new AppError('请提供要标记已读的通知ID列表', 400));
      return;
    }

    const objectIds = ids.map((id: string) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new AppError(`无效的通知ID: ${id}`, 400);
      }
      return new Types.ObjectId(id);
    });

    const result = await Notification.updateMany(
      {
        _id: { $in: objectIds },
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      { isRead: true },
    );

    successResponse(res, { modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
}
