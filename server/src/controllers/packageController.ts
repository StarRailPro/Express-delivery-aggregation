import { Response, NextFunction } from 'express';
import Package from '../models/Package';
import TrackingRecord from '../models/TrackingRecord';
import User from '../models/User';
import { successResponse } from '../utils/responseHandler';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { detectCarrier } from '../services/carrierService';
import { Types } from 'mongoose';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { trackingNo, alias } = req.body;

    if (!trackingNo || trackingNo.trim().length === 0) {
      next(new AppError('快递单号不能为空', 400));
      return;
    }

    const trimmedNo = trackingNo.trim();

    const existingPackage = await Package.findOne({ userId, trackingNo: trimmedNo });
    if (existingPackage) {
      next(new AppError('该快递单号已存在', 409));
      return;
    }

    const carrierInfo = detectCarrier(trimmedNo);

    const pkg = await Package.create({
      userId: new Types.ObjectId(userId),
      trackingNo: trimmedNo,
      carrier: carrierInfo.carrier,
      carrierCode: carrierInfo.carrierCode,
      alias: alias || '',
      status: 'in_transit',
      fromCity: '',
      toCity: '',
      lastSyncAt: null,
      isArchived: false,
      trackingRecords: [],
    });

    await User.findByIdAndUpdate(userId, {
      $push: { packages: pkg._id },
    });

    successResponse(
      res,
      {
        id: pkg._id,
        trackingNo: pkg.trackingNo,
        carrier: pkg.carrier,
        carrierCode: pkg.carrierCode,
        alias: pkg.alias,
        status: pkg.status,
        fromCity: pkg.fromCity,
        toCity: pkg.toCity,
        isArchived: pkg.isArchived,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      },
      '快递添加成功',
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const packages = await Package.find({ userId, isArchived: false })
      .sort({ createdAt: -1 })
      .populate('trackingRecords');

    const grouped = {
      in_transit: packages.filter((p) => p.status === 'in_transit'),
      delivered: packages.filter((p) => p.status === 'delivered'),
      exception: packages.filter((p) => p.status === 'exception'),
    };

    successResponse(res, {
      total: packages.length,
      grouped,
      packages,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const pkg = await Package.findOne({ _id: id, userId }).populate('trackingRecords');

    if (!pkg) {
      next(new AppError('快递记录不存在或无权访问', 404));
      return;
    }

    const trackingRecords = await TrackingRecord.find({ packageId: id }).sort({ timestamp: -1 });

    successResponse(res, {
      package: {
        id: pkg._id,
        trackingNo: pkg.trackingNo,
        carrier: pkg.carrier,
        carrierCode: pkg.carrierCode,
        alias: pkg.alias,
        status: pkg.status,
        fromCity: pkg.fromCity,
        toCity: pkg.toCity,
        lastSyncAt: pkg.lastSyncAt,
        isArchived: pkg.isArchived,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      },
      trackingRecords,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { alias, status } = req.body;

    const pkg = await Package.findOne({ _id: id, userId });
    if (!pkg) {
      next(new AppError('快递记录不存在或无权访问', 404));
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (alias !== undefined) {
      if (typeof alias !== 'string' || alias.length > 50) {
        next(new AppError('别名长度不能超过50个字符', 400));
        return;
      }
      updateData.alias = alias;
    }
    if (status !== undefined) {
      const validStatuses = ['in_transit', 'delivered', 'exception'];
      if (!validStatuses.includes(status)) {
        next(new AppError('无效的状态值，有效值: in_transit, delivered, exception', 400));
        return;
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      next(new AppError('未提供需要更新的字段', 400));
      return;
    }

    const updatedPkg = await Package.findOneAndUpdate({ _id: id, userId }, updateData, {
      new: true,
    });

    successResponse(res, {
      id: updatedPkg!._id,
      trackingNo: updatedPkg!.trackingNo,
      carrier: updatedPkg!.carrier,
      carrierCode: updatedPkg!.carrierCode,
      alias: updatedPkg!.alias,
      status: updatedPkg!.status,
      fromCity: updatedPkg!.fromCity,
      toCity: updatedPkg!.toCity,
      isArchived: updatedPkg!.isArchived,
      createdAt: updatedPkg!.createdAt,
      updatedAt: updatedPkg!.updatedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePackage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const pkg = await Package.findOne({ _id: id, userId });
    if (!pkg) {
      next(new AppError('快递记录不存在或无权访问', 404));
      return;
    }

    await TrackingRecord.deleteMany({ packageId: id });

    await Package.deleteOne({ _id: id, userId });

    await User.findByIdAndUpdate(userId, {
      $pull: { packages: id },
    });

    successResponse(res, null, '快递删除成功');
  } catch (error) {
    next(error);
  }
}

export async function archive(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const pkg = await Package.findOne({ _id: id, userId });
    if (!pkg) {
      next(new AppError('快递记录不存在或无权访问', 404));
      return;
    }

    if (pkg.isArchived) {
      next(new AppError('该快递已归档', 400));
      return;
    }

    const updatedPkg = await Package.findOneAndUpdate(
      { _id: id, userId },
      { isArchived: true },
      { new: true },
    );

    successResponse(res, {
      id: updatedPkg!._id,
      trackingNo: updatedPkg!.trackingNo,
      carrier: updatedPkg!.carrier,
      status: updatedPkg!.status,
      isArchived: updatedPkg!.isArchived,
      updatedAt: updatedPkg!.updatedAt,
    });
  } catch (error) {
    next(error);
  }
}
