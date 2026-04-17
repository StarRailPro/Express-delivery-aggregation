import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  type?: 'string' | 'number';
}

export function validateBody(rules: ValidationRule[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} 为必填项`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${rule.field} 必须为字符串类型`);
        continue;
      }

      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} 长度不能少于 ${rule.minLength} 个字符`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} 长度不能超过 ${rule.maxLength} 个字符`);
        }
      }
    }

    if (errors.length > 0) {
      next(new AppError(errors.join('; '), 400));
      return;
    }

    next();
  };
}

export const registerValidation = validateBody([
  { field: 'username', required: true, type: 'string', minLength: 3, maxLength: 20 },
  { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 32 },
]);

export const loginValidation = validateBody([
  { field: 'username', required: true, type: 'string' },
  { field: 'password', required: true, type: 'string' },
]);
