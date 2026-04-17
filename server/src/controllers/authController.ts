import { Response, NextFunction } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { successResponse } from '../utils/responseHandler';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

export async function register(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      next(new AppError('用户名已存在', 409));
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      username,
      password: hashedPassword,
      packages: [],
    });

    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
    });

    successResponse(
      res,
      {
        token,
        user: {
          id: user._id,
          username: user.username,
          createdAt: user.createdAt,
        },
      },
      '注册成功',
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      next(new AppError('用户名或密码错误', 401));
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      next(new AppError('用户名或密码错误', 401));
      return;
    }

    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
    });

    successResponse(
      res,
      {
        token,
        user: {
          id: user._id,
          username: user.username,
          createdAt: user.createdAt,
        },
      },
      '登录成功',
    );
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      next(new AppError('用户不存在', 404));
      return;
    }

    successResponse(res, {
      id: user._id,
      username: user.username,
      packages: user.packages,
      packageCount: user.packages.length,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
}
