import { useEffect, useRef, useState, useCallback } from 'react';
import { Spin, Typography } from 'antd';
import { EnvironmentOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { loadAMap, isMockMode, resetLoader } from '@/utils/amapLoader';

const DEFAULT_CENTER: [number, number] = [104.195397, 35.86166];
const DEFAULT_ZOOM = 4;

const MockMapView: React.FC = () => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState({ lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lng: 0, lat: 0 });

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 1, 18));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 1, 3));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, lng: center.lng, lat: center.lat };
    },
    [center],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const factor = 5 / Math.pow(2, DEFAULT_ZOOM);
    setCenter({
      lng: dragStart.current.lng - dx * factor,
      lat: dragStart.current.lat + dy * factor,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #e8f4f8 0%, #d1ecf1 50%, #bee5eb 100%)',
        position: 'relative',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <EnvironmentOutlined style={{ fontSize: 48, color: '#1677ff', opacity: 0.6 }} />
        <Typography.Text
          strong
          style={{ fontSize: 16, color: '#1677ff', opacity: 0.8 }}
        >
          高德地图预览区域 (Mock)
        </Typography.Text>
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12 }}
        >
          配置 VITE_AMAP_JS_KEY 后可加载真实地图
        </Typography.Text>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          color: '#666',
          pointerEvents: 'none',
        }}
      >
        缩放: {zoom} | 中心: {center.lng.toFixed(4)}, {center.lat.toFixed(4)}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            width: 32,
            height: 32,
            border: '1px solid #d9d9d9',
            background: '#fff',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#333',
          }}
        >
          <PlusOutlined />
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            width: 32,
            height: 32,
            border: '1px solid #d9d9d9',
            borderTop: 'none',
            background: '#fff',
            borderRadius: '0 0 4px 4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#333',
          }}
        >
          <MinusOutlined />
        </button>
      </div>
    </div>
  );
};

const MapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMockMode()) return;

    let destroyed = false;

    const initMap = async () => {
      if (!containerRef.current) return;

      setLoading(true);
      try {
        const AMap = await loadAMap();
        if (destroyed) return;

        const map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          resizeEnable: true,
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: 'RT' }));

        mapInstanceRef.current = map;
        setError(null);
      } catch (err) {
        if (!destroyed) {
          setError('地图加载失败，请检查网络连接或 API Key 配置');
          console.error('AMap load error:', err);
        }
      } finally {
        if (!destroyed) {
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { destroy: () => void }).destroy();
        mapInstanceRef.current = null;
      }
      resetLoader();
    };
  }, []);

  if (isMockMode()) {
    return <MockMapView />;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 10,
          }}
        >
          <Spin size="large" tip="地图加载中..." />
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#fafafa',
            gap: 12,
            zIndex: 10,
          }}
        >
          <EnvironmentOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          <Typography.Text type="danger">{error}</Typography.Text>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default MapView;
