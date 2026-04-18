import { useEffect, useCallback } from 'react';
import { List, Tag, Button, Popconfirm, Spin, Empty, Typography } from 'antd';
import {
  CarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import usePackageStore from '@/stores/packageStore';
import type { IPackage, PackageStatus } from '@/types';
import { PACKAGE_STATUS_MAP } from '@/types';

const STATUS_CONFIG: Record<
  PackageStatus,
  { color: string; icon: React.ReactNode; bgColor: string }
> = {
  in_transit: {
    color: '#1677ff',
    icon: <CarOutlined />,
    bgColor: '#e6f4ff',
  },
  delivered: {
    color: '#52c41a',
    icon: <CheckCircleOutlined />,
    bgColor: '#f6ffed',
  },
  exception: {
    color: '#ff4d4f',
    icon: <WarningOutlined />,
    bgColor: '#fff2f0',
  },
};

const STATUS_ORDER: PackageStatus[] = ['in_transit', 'delivered', 'exception'];

const PackageList: React.FC = () => {
  const { packages, listLoading, selectedPackageId, fetchPackages, selectPackage, deletePackage } =
    usePackageStore();

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleDelete = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        await deletePackage(id);
      } catch {
        // error handled by axios interceptor
      }
    },
    [deletePackage],
  );

  const grouped = STATUS_ORDER.reduce(
    (acc, status) => {
      const items = packages.filter((p) => p.status === status);
      if (items.length > 0) {
        acc.push({ status, items });
      }
      return acc;
    },
    [] as { status: PackageStatus; items: IPackage[] }[],
  );

  if (listLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Empty description="暂无快递，快去添加吧" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {grouped.map(({ status, items }) => {
        const config = STATUS_CONFIG[status];
        return (
          <div key={status} style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: `2px solid ${config.bgColor}`,
              }}
            >
              <span style={{ color: config.color, fontSize: 16 }}>{config.icon}</span>
              <Typography.Text strong style={{ color: config.color }}>
                {PACKAGE_STATUS_MAP[status]}
              </Typography.Text>
              <Tag
                color={config.color}
                style={{ marginLeft: 'auto', borderRadius: 10, fontSize: 12 }}
              >
                {items.length}
              </Tag>
            </div>
            <List
              dataSource={items}
              renderItem={(pkg) => {
                const isSelected = selectedPackageId === pkg._id;
                return (
                  <List.Item
                    key={pkg._id}
                    onClick={() => selectPackage(pkg._id)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderRadius: 8,
                      marginBottom: 4,
                      background: isSelected ? config.bgColor : 'transparent',
                      border: isSelected ? `1px solid ${config.color}` : '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    actions={[
                      <Popconfirm
                        key="delete"
                        title="确认删除"
                        description={`确定要删除快递 ${pkg.trackingNo} 吗？`}
                        onConfirm={(e) => handleDelete(pkg._id, e as React.MouseEvent)}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Typography.Text
                            ellipsis
                            style={{ maxWidth: 140, fontSize: 14 }}
                          >
                            {pkg.alias || pkg.trackingNo}
                          </Typography.Text>
                          <Tag
                            color={config.color}
                            style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
                          >
                            {pkg.carrier}
                          </Tag>
                        </div>
                      }
                      description={
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                          ellipsis
                        >
                          {pkg.fromCity && pkg.toCity
                            ? `${pkg.fromCity} → ${pkg.toCity}`
                            : pkg.trackingNo}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PackageList;
