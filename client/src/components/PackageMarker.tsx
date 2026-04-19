import { useEffect, useRef, useMemo } from 'react';
import usePackageStore from '@/stores/packageStore';
import {
  getLatestPosition,
  hasTrackingPath,
  getMarkerColor,
  buildMarkerContent,
  buildClusterContent,
  buildInfoContent,
} from '@/utils/mapHelpers';

interface PackageMarkerProps {
  map: any;
  AMap: any;
}

const PackageMarker: React.FC<PackageMarkerProps> = ({ map, AMap }) => {
  const getFilteredPackages = usePackageStore((s) => s.getFilteredPackages);
  const searchKey = usePackageStore((s) => s.searchKey);
  const filterStatus = usePackageStore((s) => s.filterStatus);
  const allPackages = usePackageStore((s) => s.packages);
  const selectedPackageId = usePackageStore((s) => s.selectedPackageId);

  const packages = useMemo(() => getFilteredPackages(), [searchKey, filterStatus, allPackages]);
  const clusterRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markerMapRef = useRef<Map<string, any>>(new Map());
  const boundMarkerSetRef = useRef<Set<any>>(new Set());
  const prevSelectedIdRef = useRef<string | null>(null);
  const packagesRef = useRef(packages);
  const selectedIdRef = useRef<string | null>(selectedPackageId);
  const pendingMoveEndRef = useRef<(() => void) | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  packagesRef.current = packages;
  selectedIdRef.current = selectedPackageId;

  useEffect(() => {
    if (!map || !AMap) return;

    const infoWindow = new AMap.InfoWindow({
      isCustom: false,
      autoMove: true,
      offset: new AMap.Pixel(0, -42),
    });
    infoWindowRef.current = infoWindow;

    const closeHandler = () => infoWindow.close();
    map.on('click', closeHandler);

    return () => {
      map.off('click', closeHandler);
      infoWindow.close();
      infoWindowRef.current = null;
    };
  }, [map, AMap]);

  useEffect(() => {
    if (!map || !AMap) return;

    cancelledRef.current = false;

    if (clusterRef.current) {
      try { clusterRef.current.setMap(null); } catch { /* ignore */ }
      clusterRef.current = null;
    }
    markerMapRef.current.forEach((m) => {
      try { m.setMap(null); } catch { /* ignore */ }
    });
    markerMapRef.current.clear();
    boundMarkerSetRef.current.clear();

    const data: any[] = [];
    packages.forEach((pkg) => {
      const pos = getLatestPosition(pkg.trackingRecords);
      if (pos) {
        data.push({
          lnglat: [pos.lng, pos.lat] as [number, number],
          pkgId: pkg._id,
          pkg,
          pos,
        });
      }
    });

    if (data.length === 0) return;

    const renderMarkerFn = (context: any) => {
      const { marker } = context;
      const item = context.data[0];
      const color = getMarkerColor(item.pkg);
      const isSelected = item.pkgId === selectedIdRef.current;
      marker.setContent(buildMarkerContent(color, isSelected));
      marker.setOffset(new AMap.Pixel(-15, -40));
      marker.setzIndex(isSelected ? 200 : 100);
      markerMapRef.current.set(item.pkgId, marker);

      if (!boundMarkerSetRef.current.has(marker)) {
        boundMarkerSetRef.current.add(marker);
        marker.on('click', () => {
          const currentPkg = packagesRef.current.find((p) => p._id === item.pkgId);
          if (!currentPkg) return;
          const currentPos = getLatestPosition(currentPkg.trackingRecords);
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
            infoWindowRef.current.setContent(buildInfoContent(currentPkg, currentPos?.city || ''));
            infoWindowRef.current.open(map, marker.getPosition());
          }
        });
      }
    };

    const renderClusterMarkerFn = (context: any) => {
      const { marker, count } = context;
      marker.setContent(buildClusterContent(count));
      marker.setOffset(new AMap.Pixel(-22, -22));
    };

    const addMarkersDirectly = () => {
      if (cancelledRef.current) return;
      data.forEach((item) => {
        const color = getMarkerColor(item.pkg);
        const marker = new AMap.Marker({
          position: item.lnglat,
          content: buildMarkerContent(color, false),
          offset: new AMap.Pixel(-15, -40),
          zIndex: 100,
          map,
        });
        marker.on('click', () => {
          const currentPkg = packagesRef.current.find((p) => p._id === item.pkgId);
          if (!currentPkg) return;
          const currentPos = getLatestPosition(currentPkg.trackingRecords);
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
            infoWindowRef.current.setContent(buildInfoContent(currentPkg, currentPos?.city || ''));
            infoWindowRef.current.open(map, marker.getPosition());
          }
        });
        markerMapRef.current.set(item.pkgId, marker);
      });
    };

    const tryCreateCluster = (ClusterClass: any) => {
      if (cancelledRef.current) return;
      try {
        const cluster = new ClusterClass(map, data, {
          gridSize: 60,
          renderMarker: renderMarkerFn,
          renderClusterMarker: renderClusterMarkerFn,
        });
        clusterRef.current = cluster;
      } catch (err) {
        console.error('MarkerCluster init failed, falling back:', err);
        addMarkersDirectly();
      }
    };

    const ClusterClass = AMap.MarkerCluster || AMap.MarkerClusterer;
    if (typeof ClusterClass === 'function') {
      tryCreateCluster(ClusterClass);
    } else {
      try {
        AMap.plugin(['AMap.MarkerCluster'], () => {
          if (cancelledRef.current) return;
          const LoadedClass = AMap.MarkerCluster || AMap.MarkerClusterer;
          if (typeof LoadedClass === 'function') {
            tryCreateCluster(LoadedClass);
          } else {
            addMarkersDirectly();
          }
        });
      } catch {
        addMarkersDirectly();
      }
    }

    return () => {
      cancelledRef.current = true;
    };
  }, [map, AMap, packages]);

  useEffect(() => {
    if (!map) return;

    if (pendingMoveEndRef.current) {
      map.off('moveend', pendingMoveEndRef.current);
      pendingMoveEndRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (prevSelectedIdRef.current) {
      const prevMarker = markerMapRef.current.get(prevSelectedIdRef.current);
      if (prevMarker) {
        const prevPkg = packages.find((p) => p._id === prevSelectedIdRef.current);
        if (prevPkg) {
          prevMarker.setContent(buildMarkerContent(getMarkerColor(prevPkg), false));
          prevMarker.setzIndex(100);
        }
      }
    }

    if (!selectedPackageId) {
      if (infoWindowRef.current) infoWindowRef.current.close();
      prevSelectedIdRef.current = null;
      return;
    }

    const pkg = packages.find((p) => p._id === selectedPackageId);
    if (!pkg) {
      prevSelectedIdRef.current = selectedPackageId;
      return;
    }

    const pos = getLatestPosition(pkg.trackingRecords);
    if (pos) {
      const marker = markerMapRef.current.get(selectedPackageId);
      if (marker) {
        marker.setContent(buildMarkerContent(getMarkerColor(pkg), true));
        marker.setzIndex(200);
      }

      if (hasTrackingPath(pkg.trackingRecords)) {
        if (infoWindowRef.current) {
          const infoPos = marker
            ? marker.getPosition()
            : new AMap.LngLat(pos.lng, pos.lat);
          infoWindowRef.current.close();
          infoWindowRef.current.setContent(buildInfoContent(pkg, pos.city));
          infoWindowRef.current.open(map, infoPos);
        }
        prevSelectedIdRef.current = selectedPackageId;
        return;
      }

      let handled = false;

      const afterMove = () => {
        if (handled) return;
        handled = true;
        map.off('moveend', afterMove);
        pendingMoveEndRef.current = null;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }

        const currentMarker = markerMapRef.current.get(selectedPackageId);
        if (infoWindowRef.current) {
          const infoPos = currentMarker
            ? currentMarker.getPosition()
            : new AMap.LngLat(pos.lng, pos.lat);
          infoWindowRef.current.close();
          infoWindowRef.current.setContent(buildInfoContent(pkg, pos.city));
          infoWindowRef.current.open(map, infoPos);
          setTimeout(() => {
            map.panBy(0, 120);
          }, 50);
        }
      };

      pendingMoveEndRef.current = afterMove;
      map.on('moveend', afterMove);
      map.setZoomAndCenter(10, [pos.lng, pos.lat]);

      fallbackTimerRef.current = setTimeout(afterMove, 1200);
    }

    prevSelectedIdRef.current = selectedPackageId;
  }, [map, selectedPackageId, packages]);

  useEffect(() => {
    return () => {
      if (pendingMoveEndRef.current && map) {
        map.off('moveend', pendingMoveEndRef.current);
        pendingMoveEndRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (clusterRef.current) {
        try { clusterRef.current.setMap(null); } catch { /* ignore */ }
        clusterRef.current = null;
      }
      markerMapRef.current.forEach((marker) => {
        try { marker.setMap(null); } catch { /* ignore */ }
      });
      markerMapRef.current.clear();
      if (infoWindowRef.current) {
        try { infoWindowRef.current.close(); } catch { /* ignore */ }
        infoWindowRef.current = null;
      }
    };
  }, [map]);

  return null;
};

export default PackageMarker;
