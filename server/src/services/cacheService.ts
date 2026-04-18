interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

class MemoryCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const carrierCache = new MemoryCache();
const trackingCache = new MemoryCache();
const geocodingCache = new MemoryCache();

export interface CarrierCacheValue {
  carrier: string;
  carrierCode: string;
}

export function getCachedCarrier(prefix: string): CarrierCacheValue | null {
  return carrierCache.get<CarrierCacheValue>(`carrier:${prefix}`);
}

export function setCachedCarrier(prefix: string, value: CarrierCacheValue): void {
  carrierCache.set(`carrier:${prefix}`, value);
}

export function getTrackingPrefix(trackingNo: string): string {
  const upper = trackingNo.toUpperCase().trim();
  const letterMatch = upper.match(/^[A-Z]+/);
  if (letterMatch) return letterMatch[0];
  if (/^\d{2}/.test(upper)) return upper.substring(0, 2);
  return upper.substring(0, 3);
}

export interface TrackingCacheValue {
  status: string;
  traces: Array<{
    timestamp: string;
    description: string;
    city: string;
  }>;
  fromCity: string;
  toCity: string;
}

export function getCachedTracking(trackingNo: string): TrackingCacheValue | null {
  return trackingCache.get<TrackingCacheValue>(`tracking:${trackingNo}`);
}

export function setCachedTracking(
  trackingNo: string,
  value: TrackingCacheValue,
  ttlMs?: number,
): void {
  trackingCache.set(`tracking:${trackingNo}`, value, ttlMs ?? 30 * 60 * 1000);
}

export interface GeocodingCacheValue {
  lng: number;
  lat: number;
  city: string;
}

export function getCachedGeocoding(city: string): GeocodingCacheValue | null {
  return geocodingCache.get<GeocodingCacheValue>(`geocoding:${city}`);
}

export function setCachedGeocoding(city: string, value: GeocodingCacheValue): void {
  geocodingCache.set(`geocoding:${city}`, value, 7 * 24 * 60 * 60 * 1000);
}

export { carrierCache, trackingCache, geocodingCache };
