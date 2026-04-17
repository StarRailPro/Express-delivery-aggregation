import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/responseHandler';
import { MongoError } from 'mongodb';

export class AppError extends Error {
  public statusCode: number;
  public code: number;

  constructor(message: string, statusCode: number = 500, code?: number) {
    super(message);
    this.statusCode = statusCode;
    this.code = code ?? statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function isMongoDuplicateKeyError(err: Error): boolean {
  const mongoErr = err as MongoError;
  return mongoErr.code === 11000;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    errorResponse(res, err.message, err.statusCode, err.code);
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    errorResponse(res, '数据已存在，请检查输入', 409);
    return;
  }

  console.error('[Unhandled Error]', err);
  errorResponse(res, '服务器内部错误', 500);
}
