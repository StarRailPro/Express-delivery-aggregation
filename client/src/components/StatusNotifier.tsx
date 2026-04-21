import { useEffect, useRef, useCallback } from 'react';
import { notification as antNotification } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  getUnreadNotificationsAPI,
  markBatchNotificationsReadAPI,
} from '@/api/notification';
import type { INotification } from '@/types';
import usePackageStore from '@/stores/packageStore';

const MAX_DISPLAY_NOTIFICATIONS = 3;
const POLL_INTERVAL_MS = 60_000;

const NOTIFICATION_ICON_MAP: Record<string, React.ReactNode> = {
  delivered: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />,
  exception: <WarningOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />,
  in_transit: <SwapOutlined style={{ color: '#1677ff', fontSize: 24 }} />,
};

function getNotificationType(title: string): string {
  if (title.includes('签收')) return 'delivered';
  if (title.includes('异常')) return 'exception';
  return 'in_transit';
}

const StatusNotifier: React.FC = () => {
  const displayedIdsRef = useRef<Set<string>>(new Set());
  const fetchPackages = usePackageStore((s) => s.fetchPackages);

  const fetchAndShowNotifications = useCallback(async () => {
    try {
      const res = await getUnreadNotificationsAPI();
      const { notifications } = res.data!;

      if (!notifications || notifications.length === 0) return;

      const undisplayed = notifications.filter(
        (n: INotification) => !displayedIdsRef.current.has(n._id),
      );

      if (undisplayed.length === 0) return;

      const toDisplay = undisplayed.slice(0, MAX_DISPLAY_NOTIFICATIONS);

      const idsToMark: string[] = [];

      toDisplay.forEach((n: INotification) => {
        const type = getNotificationType(n.title);
        const icon = NOTIFICATION_ICON_MAP[type];

        antNotification.open({
          message: n.title,
          description: n.content,
          icon,
          placement: 'topRight',
          duration: 6,
          key: n._id,
          onClose: () => {
            displayedIdsRef.current.delete(n._id);
          },
        });

        idsToMark.push(n._id);
        displayedIdsRef.current.add(n._id);
      });

      if (idsToMark.length > 0) {
        try {
          await markBatchNotificationsReadAPI(idsToMark);
        } catch {
          console.warn('[StatusNotifier] 标记通知已读失败，将在下次轮询重试');
        }
      }

      const hasStatusChange = toDisplay.some(
        (n: INotification) =>
          n.title.includes('签收') || n.title.includes('异常'),
      );
      if (hasStatusChange) {
        fetchPackages();
      }
    } catch {
      // silently ignore - network errors handled by axios interceptor
    }
  }, [fetchPackages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAndShowNotifications();
    }, 1500);

    const interval = setInterval(fetchAndShowNotifications, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAndShowNotifications]);

  return null;
};

export default StatusNotifier;
