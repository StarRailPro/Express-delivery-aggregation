import { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  Spin,
  Empty,
  Select,
  Tooltip,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  LeftOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getApiStatsAPI, type IApiStatsResponse, type IDailyTrendItem, type ICategoryItem } from '@/api/admin';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const DAY_OPTIONS = [
  { value: 7, label: '近 7 天' },
  { value: 14, label: '近 14 天' },
  { value: 30, label: '近 30 天' },
];

const CATEGORY_COLORS: Record<string, string> = {
  '快递识别': '#1677ff',
  '物流查询': '#52c41a',
  'Geocoding': '#722ed1',
};

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IApiStatsResponse | null>(null);
  const [days, setDays] = useState(7);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getApiStatsAPI(days);
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [days]);

  const maxDailyTotal = useMemo(() => {
    if (!stats?.dailyTrend.length) return 0;
    return Math.max(...stats.dailyTrend.map((d) => d.total), 1);
  }, [stats?.dailyTrend]);

  const categoryColumns = [
    {
      title: 'API 类别',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string) => (
        <Tag color={CATEGORY_COLORS[name] || '#666'}>{name}</Tag>
      ),
    },
    {
      title: '调用次数',
      dataIndex: 'total',
      key: 'total',
      sorter: (a: ICategoryItem, b: ICategoryItem) => a.total - b.total,
      render: (val: number) => <Text strong>{val.toLocaleString()}</Text>,
    },
    {
      title: '成功',
      dataIndex: 'success',
      key: 'success',
      render: (val: number) => (
        <Text type="success">
          <CheckCircleOutlined style={{ marginRight: 4 }} />
          {val.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '失败',
      dataIndex: 'failed',
      key: 'failed',
      render: (val: number) =>
        val > 0 ? (
          <Text type="danger">
            <CloseCircleOutlined style={{ marginRight: 4 }} />
            {val.toLocaleString()}
          </Text>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: '成功率',
      key: 'successRate',
      render: (_: unknown, record: ICategoryItem) => {
        const rate = record.total > 0 ? (record.success / record.total) * 100 : 0;
        return (
          <Progress
            percent={Number(rate.toFixed(1))}
            size="small"
            status={rate >= 95 ? 'success' : rate >= 80 ? 'normal' : 'exception'}
            style={{ width: 100 }}
          />
        );
      },
    },
    {
      title: '平均耗时',
      dataIndex: 'avgDuration',
      key: 'avgDuration',
      render: (ms: number) => (
        <Text>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {ms} ms
        </Text>
      ),
    },
  ];

  const errorColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts: string) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: 'API',
      dataIndex: 'apiName',
      key: 'apiName',
      render: (name: string) => <Tag color="red">{name}</Tag>,
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (msg: string) => (
        <Tooltip title={msg}>
          <Text type="danger">{msg || '未知错误'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (ms: number) => `${ms} ms`,
    },
  ];

  const renderTrendBar = (item: IDailyTrendItem) => {
    const heightPercent = (item.total / maxDailyTotal) * 100;
    const successPercent = item.total > 0 ? (item.success / item.total) * 100 : 0;
    const failedPercent = 100 - successPercent;

    return (
      <div key={item.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Tooltip
          title={
            <div>
              <div>日期: {item.date}</div>
              <div>总计: {item.total}</div>
              <div style={{ color: '#52c41a' }}>成功: {item.success}</div>
              <div style={{ color: '#ff4d4f' }}>失败: {item.failed}</div>
            </div>
          }
        >
          <div
            style={{
              width: '100%',
              maxWidth: 40,
              height: Math.max(heightPercent * 1.5, 4),
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 4,
              overflow: 'hidden',
              background: '#f0f0f0',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${successPercent}%`,
                background: 'linear-gradient(180deg, #52c41a 0%, #389e0d 100%)',
              }}
            />
            <div
              style={{
                width: '100%',
                height: `${failedPercent}%`,
                background: 'linear-gradient(180deg, #ff7875 0%, #ff4d4f 100%)',
              }}
            />
          </div>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
          {item.date.slice(5)}
        </Text>
        <Text strong style={{ fontSize: 12 }}>
          {item.total}
        </Text>
      </div>
    );
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/dashboard')}>
            返回
          </Button>
          <DashboardOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            管理后台 - API 调用统计
          </Title>
        </div>
        <Select
          value={days}
          onChange={setDays}
          options={DAY_OPTIONS}
          style={{ width: 120 }}
        />
      </Header>

      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Spin size="large" tip="加载统计数据..." />
          </div>
        ) : !stats ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="总调用次数"
                    value={stats.overview.total}
                    prefix={<ApiOutlined style={{ color: '#1677ff' }} />}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="成功调用"
                    value={stats.overview.success}
                    prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="失败调用"
                    value={stats.overview.failed}
                    prefix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="成功率"
                    value={stats.overview.successRate}
                    precision={1}
                    suffix="%"
                    prefix={
                      stats.overview.successRate >= 95 ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <WarningOutlined style={{ color: '#faad14' }} />
                      )
                    }
                    valueStyle={{
                      color: stats.overview.successRate >= 95 ? '#52c41a' : '#faad14',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <span>
                      <ThunderboltOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      调用量趋势
                    </span>
                  }
                  extra={<Text type="secondary">{stats.dateRange.start} ~ {stats.dateRange.end}</Text>}
                >
                  {stats.dailyTrend.every((d) => d.total === 0) ? (
                    <Empty description="暂无调用数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 8, paddingTop: 20 }}>
                      {stats.dailyTrend.map(renderTrendBar)}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title={
                    <span>
                      <ApiOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                      分类统计
                    </span>
                  }
                >
                  {stats.categories.length === 0 ? (
                    <Empty description="暂无分类数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {stats.categories.map((cat) => {
                        const percent = stats.overview.total > 0
                          ? (cat.total / stats.overview.total) * 100
                          : 0;
                        return (
                          <div key={cat.apiName}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>
                                <Tag color={CATEGORY_COLORS[cat.displayName] || '#666'}>
                                  {cat.displayName}
                                </Tag>
                              </Text>
                              <Text type="secondary">
                                {cat.total.toLocaleString()} 次 ({percent.toFixed(1)}%)
                              </Text>
                            </div>
                            <Progress
                              percent={Number(percent.toFixed(1))}
                              strokeColor={CATEGORY_COLORS[cat.displayName] || '#666'}
                              showInfo={false}
                              size="small"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <Card
                  title={
                    <span>
                      <ApiOutlined style={{ marginRight: 8 }} />
                      API 类别详情
                    </span>
                  }
                >
                  <Table
                    dataSource={stats.categories}
                    columns={categoryColumns}
                    rowKey="apiName"
                    pagination={false}
                    size="small"
                    locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  />
                </Card>
              </Col>
            </Row>

            {stats.recentErrors.length > 0 && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24}>
                  <Card
                    title={
                      <span>
                        <CloseCircleOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                        最近失败记录
                      </span>
                    }
                  >
                    <Table
                      dataSource={stats.recentErrors}
                      columns={errorColumns}
                      rowKey={(r) => `${r.timestamp}-${r.apiName}`}
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
};

export default AdminPanel;
