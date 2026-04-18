import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, SendOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, fetchUserInfo } = useAuthStore();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      await fetchUserInfo();
      message.success('登录成功');
      navigate('/dashboard', { replace: true });
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={iconCircleStyle}>
            <SendOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Typography.Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>
            快递信息聚合平台
          </Typography.Title>
          <Typography.Text type="secondary">登录您的账号</Typography.Text>
        </div>
        <Form name="login" onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
              { max: 32, message: '密码最多32个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Typography.Text type="secondary">
            还没有账号？<Link to="/register">立即注册</Link>
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const cardStyle: React.CSSProperties = {
  width: 420,
  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  borderRadius: 12,
  border: 'none',
};

const iconCircleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #1677ff, #4096ff)',
  boxShadow: '0 4px 12px rgba(22, 119, 255, 0.4)',
};

export default Login;
