import { useState } from 'react';
import { Layout, Typography, Button, Avatar } from 'antd';
import { SendOutlined, LogoutOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';
import PackageList from '@/components/PackageList';
import TrackingDetail from '@/components/TrackingDetail';
import AddPackageModal from '@/components/AddPackageModal';

const { Header, Content } = Layout;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            添加快递
          </Button>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <Typography.Text>{user.username}</Typography.Text>
            </div>
          )}
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </div>
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
            <PackageList />
          </div>
          <div
            style={{
              width: '70%',
              background: '#fafafa',
              padding: 24,
              overflow: 'auto',
            }}
          >
            <TrackingDetail />
          </div>
        </div>
      </Content>
      <AddPackageModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </Layout>
  );
};

export default Dashboard;
