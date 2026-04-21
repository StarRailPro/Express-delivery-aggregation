import { useState, useMemo } from 'react';
import { Layout, Typography, Button, Avatar, Row, Col, Input, Select } from 'antd';
import {
  SendOutlined,
  LogoutOutlined,
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  CarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InboxOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';
import usePackageStore from '@/stores/packageStore';
import type { FilterStatus } from '@/stores/packageStore';
import PackageList from '@/components/PackageList';
import TrackingDetail from '@/components/TrackingDetail';
import MapView from '@/components/MapView';
import AddPackageModal from '@/components/AddPackageModal';
import StatusNotifier from '@/components/StatusNotifier';

const { Header, Content } = Layout;

const STATUS_FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'in_transit', label: '运输中' },
  { value: 'delivered', label: '已签收' },
  { value: 'exception', label: '异常' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const searchKey = usePackageStore((s) => s.searchKey);
  const filterStatus = usePackageStore((s) => s.filterStatus);
  const setSearchKey = usePackageStore((s) => s.setSearchKey);
  const setFilterStatus = usePackageStore((s) => s.setFilterStatus);
  const getStats = usePackageStore((s) => s.getStats);
  const packages = usePackageStore((s) => s.packages);

  const stats = useMemo(() => getStats(), [searchKey, filterStatus, packages]);

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
          <Button
            icon={<DashboardOutlined />}
            onClick={() => navigate('/admin')}
          >
            管理后台
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
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
              <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #e6f4ff, #bae0ff)',
                      borderRadius: 8,
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <InboxOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff', lineHeight: '28px' }}>
                      {stats.total}
                    </div>
                    <div style={{ fontSize: 11, color: '#69b1ff' }}>总单数</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #e6f4ff, #91caff)',
                      borderRadius: 8,
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <CarOutlined style={{ fontSize: 18, color: '#0958d9' }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0958d9', lineHeight: '28px' }}>
                      {stats.in_transit}
                    </div>
                    <div style={{ fontSize: 11, color: '#69b1ff' }}>运输中</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f6ffed, #d9f7be)',
                      borderRadius: 8,
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <CheckCircleOutlined style={{ fontSize: 18, color: '#389e0d' }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#389e0d', lineHeight: '28px' }}>
                      {stats.delivered}
                    </div>
                    <div style={{ fontSize: 11, color: '#73d13d' }}>已签收</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #fff2f0, #ffccc7)',
                      borderRadius: 8,
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <WarningOutlined style={{ fontSize: 18, color: '#cf1322' }} />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#cf1322', lineHeight: '28px' }}>
                      {stats.exception}
                    </div>
                    <div style={{ fontSize: 11, color: '#ff7875' }}>异常件</div>
                  </div>
                </Col>
              </Row>

              <Input
                placeholder="搜索单号或别名..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                allowClear
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                style={{ marginBottom: 8 }}
              />

              <Select
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
                options={STATUS_FILTER_OPTIONS}
                style={{ width: '100%', marginBottom: 12 }}
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
              <PackageList />
            </div>
          </div>
          <div
            style={{
              width: '70%',
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: '1 1 55%',
                minHeight: 300,
                position: 'relative',
              }}
            >
              <MapView />
            </div>
            <div
              style={{
                flex: '1 1 45%',
                borderTop: '1px solid #f0f0f0',
                padding: 24,
                overflow: 'auto',
                background: '#fff',
              }}
            >
              <TrackingDetail />
            </div>
          </div>
        </div>
      </Content>
      <AddPackageModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <StatusNotifier />
    </Layout>
  );
};

export default Dashboard;
