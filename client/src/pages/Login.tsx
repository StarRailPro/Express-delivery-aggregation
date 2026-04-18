import { Card, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { SendOutlined } from '@ant-design/icons';

const Login: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SendOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Typography.Title level={3} style={{ marginTop: 12, marginBottom: 0 }}>
            登录
          </Typography.Title>
        </div>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          登录页面（待实现）
        </Typography.Paragraph>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Typography.Text>
            还没有账号？<Link to="/register">立即注册</Link>
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
