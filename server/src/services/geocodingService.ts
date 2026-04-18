import { getCachedGeocoding, setCachedGeocoding } from './cacheService';
import { normalizeCityName, getMockCoordinate, CHINA_CENTER } from '../utils/cityMap';
import { recordApiCall } from './apiCounterService';
import { retryWithBackoff } from '../utils/retry';

const AMAP_SERVER_KEY = process.env.AMAP_SERVER_KEY || '';

function isMockMode(): boolean {
  return (
    !AMAP_SERVER_KEY ||
    AMAP_SERVER_KEY.trim() === '' ||
    AMAP_SERVER_KEY.trim().toLowerCase() === 'mock'
  );
}

export interface Coordinate {
  lng: number;
  lat: number;
}

export interface GeocodingResult {
  city: string;
  coordinate: Coordinate | null;
  source: 'cache' | 'mock' | 'amap';
}

class GeocodingService {
  async getCoordinates(cityName: string): Promise<GeocodingResult> {
    if (!cityName || cityName.trim() === '') {
      return { city: '', coordinate: null, source: 'mock' };
    }

    const normalizedCity = normalizeCityName(cityName);

    const cached = getCachedGeocoding(normalizedCity);
    if (cached) {
      console.log(`[Geocoding] 缓存命中: ${normalizedCity} -> [${cached.lng}, ${cached.lat}]`);
      return {
        city: normalizedCity,
        coordinate: { lng: cached.lng, lat: cached.lat },
        source: 'cache',
      };
    }

    if (isMockMode()) {
      return this.mockGetCoordinates(normalizedCity);
    }

    try {
      const result = (await recordApiCall('geocoding', () =>
        retryWithBackoff(() => this.amapGetCoordinates(normalizedCity)),
      )) as GeocodingResult;

      if (result.coordinate) {
        setCachedGeocoding(normalizedCity, {
          lng: result.coordinate.lng,
          lat: result.coordinate.lat,
          city: normalizedCity,
        });
      }

      return result;
    } catch (error) {
      console.warn(
        `[Geocoding] 高德API调用失败，降级到Mock模式: ${normalizedCity}`,
        error instanceof Error ? error.message : String(error),
      );
      return this.mockGetCoordinates(normalizedCity);
    }
  }

  async batchGetCoordinates(
    cities: string[],
  ): Promise<Map<string, GeocodingResult>> {
    const results = new Map<string, GeocodingResult>();

    const uniqueCities = [...new Set(cities.filter((c) => c && c.trim()))];

    for (const city of uniqueCities) {
      const result = await this.getCoordinates(city);
      results.set(city, result);
    }

    return results;
  }

  private async amapGetCoordinates(cityName: string): Promise<GeocodingResult> {
    const url = new URL('https://restapi.amap.com/v3/geocode/geo');
    url.searchParams.set('key', AMAP_SERVER_KEY);
    url.searchParams.set('address', cityName);
    url.searchParams.set('output', 'JSON');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`高德Geocoding接口返回 HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      status: string;
      count: string;
      geocodes?: Array<{
        location: string;
        formatted_address: string;
        city?: string;
      }>;
      info?: string;
    };

    if (json.status !== '1' || !json.geocodes || json.geocodes.length === 0) {
      console.warn(
        `[Geocoding] 高德API未找到坐标: ${cityName}, info: ${json.info || '无结果'}`,
      );
      return this.mockGetCoordinates(cityName);
    }

    const location = json.geocodes[0].location;
    const [lngStr, latStr] = location.split(',');
    const lng = parseFloat(lngStr);
    const lat = parseFloat(latStr);

    if (isNaN(lng) || isNaN(lat)) {
      console.warn(`[Geocoding] 高德API返回无效坐标: ${location}`);
      return this.mockGetCoordinates(cityName);
    }

    console.log(`[Geocoding] 高德API解析成功: ${cityName} -> [${lng}, ${lat}]`);

    return {
      city: cityName,
      coordinate: { lng, lat },
      source: 'amap',
    };
  }

  private mockGetCoordinates(cityName: string): GeocodingResult {
    const normalizedCity = normalizeCityName(cityName);
    const mockCoord = getMockCoordinate(normalizedCity);

    if (mockCoord) {
      setCachedGeocoding(normalizedCity, {
        lng: mockCoord.lng,
        lat: mockCoord.lat,
        city: normalizedCity,
      });

      console.log(
        `[Geocoding] Mock模式 - 城市坐标: ${normalizedCity} -> [${mockCoord.lng}, ${mockCoord.lat}]`,
      );

      return {
        city: normalizedCity,
        coordinate: { lng: mockCoord.lng, lat: mockCoord.lat },
        source: 'mock',
      };
    }

    console.log(
      `[Geocoding] Mock模式 - 城市不在字典中，返回中国中心点: ${normalizedCity}`,
    );

    return {
      city: normalizedCity,
      coordinate: { lng: CHINA_CENTER.lng, lat: CHINA_CENTER.lat },
      source: 'mock',
    };
  }
}

const geocodingService = new GeocodingService();

export default geocodingService;
