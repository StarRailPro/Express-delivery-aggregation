import TrackingRecord from '../models/TrackingRecord';
import Package from '../models/Package';
import { parseCitiesFromTraces } from '../utils/cityParser';
import { normalizeCityName } from '../utils/cityMap';
import geocodingService from './geocodingService';
import { Types } from 'mongoose';

export interface TrackingTrace {
  timestamp: string;
  description: string;
  city: string;
}

export interface EnrichedTrackingTrace extends TrackingTrace {
  location: { lng: number; lat: number } | null;
}

export async function enrichTracesWithCoordinates(
  traces: TrackingTrace[],
): Promise<EnrichedTrackingTrace[]> {
  if (!traces || traces.length === 0) {
    return [];
  }

  const parsedCities = parseCitiesFromTraces(traces);

  const uniqueCities = [
    ...new Set(
      parsedCities
        .filter((c) => c.matched && c.city)
        .map((c) => normalizeCityName(c.city)),
    ),
  ];

  const cityCoordinates = await geocodingService.batchGetCoordinates(uniqueCities);

  const enrichedTraces: EnrichedTrackingTrace[] = traces.map((trace, index) => {
    const parsed = parsedCities[index];
    let location: { lng: number; lat: number } | null = null;

    if (parsed.matched && parsed.city) {
      const normalizedCity = normalizeCityName(parsed.city);
      const geoResult = cityCoordinates.get(normalizedCity) || cityCoordinates.get(parsed.city);
      if (geoResult && geoResult.coordinate) {
        location = { lng: geoResult.coordinate.lng, lat: geoResult.coordinate.lat };
      }
    }

    return {
      timestamp: trace.timestamp,
      description: trace.description,
      city: parsed.matched ? parsed.city : trace.city,
      location,
    };
  });

  return enrichedTraces;
}

export async function syncTrackingRecords(
  packageId: Types.ObjectId,
  traces: TrackingTrace[],
): Promise<Types.ObjectId[]> {
  const enrichedTraces = await enrichTracesWithCoordinates(traces);

  const recordIds: Types.ObjectId[] = [];
  for (const trace of enrichedTraces) {
    const record = await TrackingRecord.create({
      packageId,
      timestamp: new Date(trace.timestamp),
      description: trace.description,
      city: trace.city,
      location: trace.location ? { lng: trace.location.lng, lat: trace.location.lat } : null,
      syncedAt: new Date(),
    });
    recordIds.push(record._id as Types.ObjectId);
  }

  return recordIds;
}

export async function updatePackageCities(
  packageId: Types.ObjectId,
  traces: TrackingTrace[],
): Promise<void> {
  if (!traces || traces.length === 0) return;

  const parsedCities = parseCitiesFromTraces(traces);

  const fromCity = parsedCities.length > 0 && parsedCities[0].matched
    ? parsedCities[0].city
    : '';

  const lastIdx = parsedCities.length - 1;
  const toCity = lastIdx >= 0 && parsedCities[lastIdx].matched
    ? parsedCities[lastIdx].city
    : '';

  const updateData: Record<string, unknown> = {};
  if (fromCity) updateData.fromCity = fromCity;
  if (toCity) updateData.toCity = toCity;

  if (Object.keys(updateData).length > 0) {
    await Package.findByIdAndUpdate(packageId, updateData);
    console.log(
      `[TrackingSync] 更新快递城市: ${packageId}, fromCity=${fromCity}, toCity=${toCity}`,
    );
  }
}
