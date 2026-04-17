import jwt, { SignOptions } from 'jsonwebtoken';
import { IJwtPayload } from '../types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload: IJwtPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): IJwtPayload {
  return jwt.verify(token, JWT_SECRET) as IJwtPayload;
}
