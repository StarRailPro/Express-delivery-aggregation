import { useEffect, useRef } from 'react';
import usePackageStore from '@/stores/packageStore';
import type { ITrackingRecord } from '@/types';

interface TrackingPathProps {
  map: any;
  AMap: any;
}

interface CoordPoint {
  lng: number;
  lat: number;
  city: string;
  timestamp: string;
}

function extractValidCoordinates(records: ITrackingRecord[]): CoordPoint[] {
  if (!records || records.length === 0) return [];
  return records
    .filter(
      (r) =>
        r.location &&
        typeof r.location.lng === 'number' &&
        typeof r.location.lat === 'number',
    )
    .map((r) => ({
      lng: r.location!.lng,
      lat: r.location!.lat,
      city: r.city || '',
      timestamp: r.timestamp,
    }))
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

function buildEndpointContent(label: string, bgColor: string): string {
  return `<div style="
    display:flex;
    align-items:center;
    justify-content:center;
    width:32px;
    height:32px;
    border-radius:50%;
    background:${bgColor};
    color:#fff;
    font-size:14px;
    font-weight:bold;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    border:2.5px solid #fff;
    cursor:pointer;
    line-height:1;
  ">${label}</div>`;
}

const TrackingPath: React.FC<TrackingPathProps> = ({ map, AMap }) => {
  const selectedPackageId = usePackageStore((s) => s.selectedPackageId);
  const trackingRecords = usePackageStore((s) => s.trackingRecords);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !AMap) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }

    if (!selectedPackageId || !trackingRecords || trackingRecords.length === 0) {
      return;
    }

    const coords = extractValidCoordinates(trackingRecords);
    if (coords.length === 0) return;

    if (coords.length >= 2) {
      const path = coords.map((c) => [c.lng, c.lat]);

      const polyline = new AMap.Polyline({
        path,
        strokeColor: '#1677ff',
        strokeWeight: 5,
        strokeOpacity: 0.85,
        strokeStyle: 'solid',
        showDir: true,
        dirColor: '#fff',
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50,
      });
      polyline.setMap(map);
      polylineRef.current = polyline;
    }

    const startMarker = new AMap.Marker({
      position: [coords[0].lng, coords[0].lat],
      content: buildEndpointContent('起', '#52c41a'),
      offset: new AMap.Pixel(-16, -16),
      zIndex: 300,
    });
    startMarker.setMap(map);
    startMarkerRef.current = startMarker;

    if (coords.length >= 2) {
      const endCoord = coords[coords.length - 1];
      const endMarker = new AMap.Marker({
        position: [endCoord.lng, endCoord.lat],
        content: buildEndpointContent('终', '#ff4d4f'),
        offset: new AMap.Pixel(-16, -16),
        zIndex: 300,
      });
      endMarker.setMap(map);
      endMarkerRef.current = endMarker;
    }

    const overlays: any[] = [];
    if (polylineRef.current) overlays.push(polylineRef.current);
    if (startMarkerRef.current) overlays.push(startMarkerRef.current);
    if (endMarkerRef.current) overlays.push(endMarkerRef.current);

    if (coords.length >= 2 && overlays.length > 0) {
      map.setFitView(overlays, false, [80, 80, 80, 80], 15);
    } else if (coords.length === 1) {
      map.setZoomAndCenter(10, [coords[0].lng, coords[0].lat]);
    }
  }, [map, AMap, selectedPackageId, trackingRecords]);

  useEffect(() => {
    return () => {
      if (polylineRef.current) {
        try {
          polylineRef.current.setMap(null);
        } catch {
          /* map already destroyed */
        }
        polylineRef.current = null;
      }
      if (startMarkerRef.current) {
        try {
          startMarkerRef.current.setMap(null);
        } catch {
          /* map already destroyed */
        }
        startMarkerRef.current = null;
      }
      if (endMarkerRef.current) {
        try {
          endMarkerRef.current.setMap(null);
        } catch {
          /* map already destroyed */
        }
        endMarkerRef.current = null;
      }
    };
  }, []);

  return null;
};

export default TrackingPath;
