import request from './request';
import { IApiResponse, ILoginParams, IRegisterParams } from '@/types';

interface AuthData {
  token: string;
  user: {
    id: string;
    username: string;
    createdAt: string;
  };
}

interface MeData {
  id: string;
  username: string;
  packages: string[];
  packageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function loginAPI(params: ILoginParams) {
  return request.post<void, IApiResponse<AuthData>>('/auth/login', params);
}

export function registerAPI(params: IRegisterParams) {
  return request.post<void, IApiResponse<AuthData>>('/auth/register', params);
}

export function getMeAPI() {
  return request.get<void, IApiResponse<MeData>>('/auth/me');
}
