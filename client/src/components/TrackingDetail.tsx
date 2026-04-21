import { useCallback } from 'react';
import { Timeline, Button, Spin, Empty, Typography, Tag, Descriptions, Card, Alert, notification } from 'antd';
import {
  ReloadOutlined,
  CarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import usePackageStore from '@/stores/packageStore';
import { PACKAGE_STATUS_MAP } from '@/types';
import type { PackageStatus } from '@/types';

const STATUS_TAG_COLOR: Record<PackageStatus, string> = {
  in_transit: 'processing',
  delivered: 'success',
  exception: 'error',
};

const STATUS_ICON: Record<PackageStatus, React.ReactNode> = {
  in_transit: <CarOutlined style={{ fontSize: 20, color: '#1677ff' }} />,
  delivered: <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
  exception: <WarningOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />,
};

const TrackingDetail: React.FC = () => {
  const {
    selectedPackageId,
    selectedPackage,
    trackingRecords,
    detailLoading,
    refreshLoading,
    refreshPackage,
  } = usePackageStore();

  const handleRefresh = useCallback(async () => {
    if (!selectedPackageId) return;
    try {
      const result = await refreshPackage(selectedPackageId);
      if (result && result.oldStatus !== 'delivered' && result.newStatus === 'delivered') {
        notification.success({
          message: '🎉 您的快递已签收！',
          description: '恭喜！您的快递已成功签收，可前往详情查看物流轨迹',
          placement: 'topRight',
          duration: 5,
        });
      }
    } catch {
      // error handled by axios interceptor
    }
  }, [selectedPackageId, refreshPackage]);

  if (!selectedPackageId) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          gap: 16,
        }}
      >
        <EnvironmentOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
        <Typography.Text type="secondary" style={{ fontSize: 16 }}>
          请从左侧选择一个快递查看物流详情
        </Typography.Text>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin size="large" tip="加载物流详情..." />
      </div>
    );
  }

  if (!selectedPackage) {
    return null;
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {STATUS_ICON[selectedPackage.status]}
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {selectedPackage.alias || selectedPackage.trackingNo}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {selectedPackage.carrier} · {selectedPackage.trackingNo}
              </Typography.Text>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={STATUS_TAG_COLOR[selectedPackage.status]}>
              {PACKAGE_STATUS_MAP[selectedPackage.status]}
            </Tag>
            <Button
              type="primary"
              ghost
              icon={<ReloadOutlined />}
              loading={refreshLoading}
              onClick={handleRefresh}
              size="small"
            >
              刷新
            </Button>
          </div>
        </div>
      </Card>

      {selectedPackage.fromCity || selectedPackage.toCity ? (
        <Card
          size="small"
          style={{ marginBottom: 16, borderRadius: 8 }}
          styles={{ body: { padding: '12px 20px' } }}
        >
          <Descriptions size="small" column={3} colon={false}>
            {selectedPackage.fromCity && (
              <Descriptions.Item label="发货地">
                <Typography.Text style={{ fontSize: 13 }}>
                  {selectedPackage.fromCity}
                </Typography.Text>
              </Descriptions.Item>
            )}
            {selectedPackage.toCity && (
              <Descriptions.Item label="目的地">
                <Typography.Text style={{ fontSize: 13 }}>
                  {selectedPackage.toCity}
                </Typography.Text>
              </Descriptions.Item>
            )}
            {selectedPackage.lastSyncAt && (
              <Descriptions.Item label="最近同步">
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatTime(selectedPackage.lastSyncAt)}
                </Typography.Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      ) : null}

      {trackingRecords.length > 0 &&
        !trackingRecords.some(
          (r) => r.location && typeof r.location.lng === 'number' && typeof r.location.lat === 'number',
        ) && (
          <Alert
            message="暂无地图位置"
            description="该快递的物流信息暂无法解析出地理位置，无法在地图上标注"
            type="info"
            showIcon
            icon={<EnvironmentOutlined />}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

      <Card
        size="small"
        title={
          <span style={{ fontSize: 14 }}>
            <ClockCircleOutlined style={{ marginRight: 6 }} />
            物流轨迹
          </span>
        }
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        {trackingRecords.length === 0 ? (
          <Empty description="暂无物流轨迹信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Timeline
            items={trackingRecords.map((record, index) => ({
              color: index === 0 ? 'blue' : 'gray',
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Typography.Text
                      strong={index === 0}
                      style={{ fontSize: 13, color: index === 0 ? '#1677ff' : undefined }}
                    >
                      {formatTime(record.timestamp)}
                    </Typography.Text>
                    {record.city && (
                      <Tag
                        style={{ fontSize: 11, lineHeight: '16px', padding: '0 4px' }}
                        icon={<EnvironmentOutlined />}
                      >
                        {record.city}
                      </Tag>
                    )}
                  </div>
                  <Typography.Text
                    type={index === 0 ? undefined : 'secondary'}
                    style={{ fontSize: 13 }}
                  >
                    {record.description}
                  </Typography.Text>
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
};

export default TrackingDetail;
