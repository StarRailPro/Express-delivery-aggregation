import { PACKAGE_STATUS_MAP } from '@/types';
import type { PackageStatus, ITrackingRecord, IPackage } from '@/types';

const STATUS_COLOR: Record<PackageStatus, string> = {
  in_transit: '#1677ff',
  delivered: '#52c41a',
  exception: '#ff4d4f',
};

const CARRIER_COLOR_MAP: Record<string, string> = {
  '顺丰速运': '#FF6600',
  '中通快递': '#1E90FF',
  '圆通速递': '#FA541C',
  '韵达快递': '#722ED1',
  '申通快递': '#13C2C2',
  '百世快递': '#EB2F96',
  '极兔速递': '#52C41A',
  '京东物流': '#FAAD14',
  '邮政EMS': '#2F54EB',
  '天天快递': '#A0D911',
};

export function getLatestPosition(
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

export function hasTrackingPath(records: ITrackingRecord[]): boolean {
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

export function getMarkerColor(pkg: IPackage): string {
  if (CARRIER_COLOR_MAP[pkg.carrier]) return CARRIER_COLOR_MAP[pkg.carrier];
  return STATUS_COLOR[pkg.status];
}

export function buildMarkerContent(color: string, isSelected: boolean): string {
  const scale = isSelected ? 1.2 : 1;
  const shadow = isSelected
    ? `filter:drop-shadow(0 0 6px ${color});`
    : '';
  return `<div style="width:30px;height:40px;position:relative;cursor:pointer;transform:scale(${scale});transform-origin:bottom center;${shadow}">
  <svg viewBox="0 0 30 40" width="30" height="40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25C30 6.716 23.284 0 15 0z" fill="${color}"/>
    <circle cx="15" cy="14" r="6" fill="#fff"/>
  </svg>
</div>`;
}

export function buildClusterContent(count: number): string {
  let size = 44;
  let fontSize = 14;
  if (count >= 100) {
    size = 56;
    fontSize = 16;
  } else if (count >= 10) {
    size = 50;
    fontSize = 15;
  }
  return `<div style="
    width:${size}px;
    height:${size}px;
    border-radius:50%;
    background:linear-gradient(135deg, #1677ff, #4096ff);
    color:#fff;
    font-size:${fontSize}px;
    font-weight:bold;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:0 2px 10px rgba(22,119,255,0.45);
    border:2.5px solid #fff;
    cursor:pointer;
    line-height:1;
  ">${count}</div>`;
}

export function buildInfoContent(pkg: IPackage, city: string): string {
  const statusText = PACKAGE_STATUS_MAP[pkg.status];
  const statusColor = STATUS_COLOR[pkg.status];
  const carrierColor = getMarkerColor(pkg);
  const displayName = pkg.alias || pkg.trackingNo;
  return `<div style="padding:12px 16px;min-width:220px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#333;">${displayName}</div>
  <div style="font-size:13px;color:#888;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${carrierColor};"></span>
    ${pkg.carrier} · ${pkg.trackingNo}
  </div>
  <div style="margin-bottom:6px;"><span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;color:#fff;background:${statusColor};">${statusText}</span></div>
  ${city ? `<div style="font-size:13px;color:#555;">📍 ${city}</div>` : ''}
</div>`;
}

export function getAllPackagePositions(packages: IPackage[]): [number, number][] {
  const positions: [number, number][] = [];
  for (const pkg of packages) {
    const pos = getLatestPosition(pkg.trackingRecords);
    if (pos) {
      positions.push([pos.lng, pos.lat]);
    }
  }
  return positions;
}
