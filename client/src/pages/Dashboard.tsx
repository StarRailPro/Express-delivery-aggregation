import { Layout, Typography, Button } from 'antd';
import { SendOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SendOutlined style={{ fontSize: 24, color: '#1677ff', marginRight: 12 }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            快递信息聚合平台
          </Typography.Title>
        </div>
        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
          退出登录
        </Button>
      </Header>
      <Content>
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
          <div
            style={{
              width: '30%',
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              padding: 24,
              overflow: 'auto',
            }}
          >
            <Typography.Text type="secondary">快递列表区域（待实现）</Typography.Text>
          </div>
          <div
            style={{
              width: '70%',
              background: '#fafafa',
              padding: 24,
              overflow: 'auto',
            }}
          >
            <Typography.Text type="secondary">物流详情区域（待实现）</Typography.Text>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default Dashboard;
