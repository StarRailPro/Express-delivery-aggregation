import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import useAuthStore from '@/stores/authStore';

const AuthGuard: React.FC = () => {
  const { token, user, fetchUserInfo } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchUserInfo();
    }
  }, [token, user, fetchUserInfo]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (token && !user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;
