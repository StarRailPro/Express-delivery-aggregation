import { create } from 'zustand';
import { loginAPI, registerAPI, getMeAPI } from '@/api/auth';

interface UserInfo {
  id: string;
  username: string;
  packageCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUserInfo: () => Promise<void>;
}

const TOKEN_KEY = 'token';

const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),

  login: async (username: string, password: string) => {
    const res = await loginAPI({ username, password });
    const authData = res.data!;
    localStorage.setItem(TOKEN_KEY, authData.token);
    set({
      token: authData.token,
      user: {
        id: authData.user.id,
        username: authData.user.username,
        createdAt: authData.user.createdAt,
      },
      isAuthenticated: true,
    });
  },

  register: async (username: string, password: string) => {
    await registerAPI({ username, password });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchUserInfo: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await getMeAPI();
      const meData = res.data!;
      set({
        user: {
          id: meData.id,
          username: meData.username,
          packageCount: meData.packageCount,
          createdAt: meData.createdAt,
          updatedAt: meData.updatedAt,
        },
      });
    } catch {
      get().logout();
    }
  },
}));

export default useAuthStore;
