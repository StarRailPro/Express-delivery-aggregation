import { Response } from 'express';
import { IApiResponse } from '../types';

export function successResponse<T>(
  res: Response,
  data: T,
  message: string = '操作成功',
  statusCode: number = 200,
): Response {
  const response: IApiResponse<T> = {
    code: statusCode,
    message,
    data,
  };
  return res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  message: string = '操作失败',
  statusCode: number = 500,
  code?: number,
): Response {
  const response: IApiResponse<never> = {
    code: code ?? statusCode,
    message,
  };
  return res.status(statusCode).json(response);
}
