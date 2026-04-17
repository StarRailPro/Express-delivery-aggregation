import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import { IJwtPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: IJwtPayload;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('未提供认证令牌，请先登录', 401));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    next(new AppError('认证令牌无效或已过期，请重新登录', 401));
  }
}
