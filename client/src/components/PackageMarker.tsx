import { useEffect, useRef } from 'react';
import usePackageStore from '@/stores/packageStore';
import { PACKAGE_STATUS_MAP } from '@/types';
import type { PackageStatus, ITrackingRecord, IPackage } from '@/types';

interface PackageMarkerProps {
  map: any;
  AMap: any;
}

const STATUS_COLOR: Record<PackageStatus, string> = {
  in_transit: '#1677ff',
  delivered: '#52c41a',
  exception: '#ff4d4f',
};

function getLatestPosition(
  records: ITrackingRecord[],
): { lng: number; lat: number; city: string } | null {
  if (!records || records.length === 0) return null;
  const sorted = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  for (const record of sorted) {
    const loc = record.location;
    if (loc && typeof loc.lng === 'number' && typeof loc.lat === 'number') {
      return { lng: loc.lng, lat: loc.lat, city: record.city || '' };
    }
  }
  return null;
}

function hasTrackingPath(records: ITrackingRecord[]): boolean {
  if (!records || records.length < 2) return false;
  let count = 0;
  for (const r of records) {
    if (r.location && typeof r.location.lng === 'number' && typeof r.location.lat === 'number') {
      count++;
      if (count >= 2) return true;
    }
  }
  return false;
}

function buildInfoContent(pkg: IPackage, city: string): string {
  const statusText = PACKAGE_STATUS_MAP[pkg.status];
  const statusColor = STATUS_COLOR[pkg.status];
  const displayName = pkg.alias || pkg.trackingNo;
  return `<div style="padding:12px 16px;min-width:220px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#333;">${displayName}</div>
  <div style="font-size:13px;color:#888;margin-bottom:8px;">${pkg.carrier} · ${pkg.trackingNo}</div>
  <div style="margin-bottom:6px;"><span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;color:#fff;background:${statusColor};">${statusText}</span></div>
  ${city ? `<div style="font-size:13px;color:#555;">📍 ${city}</div>` : ''}
</div>`;
}

function buildMarkerContent(status: PackageStatus): string {
  const color = STATUS_COLOR[status];
  return `<div style="width:30px;height:40px;position:relative;cursor:pointer;">
  <svg viewBox="0 0 30 40" width="30" height="40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25C30 6.716 23.284 0 15 0z" fill="${color}"/>
    <circle cx="15" cy="14" r="6" fill="#fff"/>
  </svg>
</div>`;
}

const PackageMarker: React.FC<PackageMarkerProps> = ({ map, AMap }) => {
  const packages = usePackageStore((s) => s.packages);
  const selectedPackageId = usePackageStore((s) => s.selectedPackageId);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const prevSelectedIdRef = useRef<string | null>(null);
  const packagesRef = useRef(packages);
  const pendingMoveEndRef = useRef<(() => void) | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  packagesRef.current = packages;

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

    const currentMarkers = markersRef.current;
    const validIds = new Set<string>();

    packages.forEach((pkg) => {
      const pos = getLatestPosition(pkg.trackingRecords);
      if (!pos) {
        const existing = currentMarkers.get(pkg._id);
        if (existing) {
          existing.setMap(null);
          currentMarkers.delete(pkg._id);
        }
        return;
      }

      validIds.add(pkg._id);
      const lnglat: [number, number] = [pos.lng, pos.lat];

      if (currentMarkers.has(pkg._id)) {
        const existingMarker = currentMarkers.get(pkg._id)!;
        existingMarker.setPosition(lnglat);
        existingMarker.setContent(buildMarkerContent(pkg.status));
      } else {
        const marker = new AMap.Marker({
          position: lnglat,
          content: buildMarkerContent(pkg.status),
          offset: new AMap.Pixel(-15, -40),
          zIndex: 100,
        });

        marker.on('click', () => {
          const currentPkg = packagesRef.current.find((p) => p._id === pkg._id);
          if (!currentPkg) return;
          const currentPos = getLatestPosition(currentPkg.trackingRecords);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(buildInfoContent(currentPkg, currentPos?.city || ''));
            infoWindowRef.current.open(map, marker.getPosition());
          }
        });

        marker.setMap(map);
        currentMarkers.set(pkg._id, marker);
      }
    });

    currentMarkers.forEach((marker, id) => {
      if (!validIds.has(id)) {
        marker.setMap(null);
        currentMarkers.delete(id);
      }
    });
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
      const prevMarker = markersRef.current.get(prevSelectedIdRef.current);
      if (prevMarker) prevMarker.setzIndex(100);
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
      if (hasTrackingPath(pkg.trackingRecords)) {
        const marker = markersRef.current.get(selectedPackageId);
        if (marker) {
          marker.setzIndex(200);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(buildInfoContent(pkg, pos.city));
            infoWindowRef.current.open(map, marker.getPosition());
          }
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

        const marker = markersRef.current.get(selectedPackageId);
        if (marker) {
          marker.setzIndex(200);
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(buildInfoContent(pkg, pos.city));
            infoWindowRef.current.open(map, marker.getPosition());
            setTimeout(() => {
              map.panBy(0, 120);
            }, 50);
          }
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
      markersRef.current.forEach((marker) => {
        try {
          marker.setMap(null);
        } catch {
          /* map already destroyed */
        }
      });
      markersRef.current.clear();
      if (infoWindowRef.current) {
        try {
          infoWindowRef.current.close();
        } catch {
          /* map already destroyed */
        }
        infoWindowRef.current = null;
      }
    };
  }, [map]);

  return null;
};

export default PackageMarker;
