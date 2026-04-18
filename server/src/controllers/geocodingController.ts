import { Response, NextFunction } from 'express';
import { successResponse } from '../utils/responseHandler';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { parseCityFromText, parseCitiesFromTraces } from '../utils/cityParser';
import geocodingService from '../services/geocodingService';

export async function parseCity(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      next(new AppError('请提供待解析的物流文本', 400));
      return;
    }

    const parseResult = parseCityFromText(text);

    let geocodingResult = null;
    if (parseResult.matched && parseResult.city) {
      geocodingResult = await geocodingService.getCoordinates(parseResult.city);
    }

    successResponse(res, {
      originalText: text,
      parsedCity: parseResult.city,
      matched: parseResult.matched,
      raw: parseResult.raw,
      geocoding: geocodingResult
        ? {
            city: geocodingResult.city,
            coordinate: geocodingResult.coordinate,
            source: geocodingResult.source,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function batchParseAndGeocode(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { traces } = req.body as { traces?: Array<{ description: string; city?: string }> };

    if (!traces || !Array.isArray(traces) || traces.length === 0) {
      next(new AppError('请提供物流轨迹数组', 400));
      return;
    }

    const parsedCities = parseCitiesFromTraces(traces);

    const uniqueCities = [
      ...new Set(parsedCities.filter((c) => c.matched && c.city).map((c) => c.city)),
    ];

    const cityCoordinates = await geocodingService.batchGetCoordinates(uniqueCities);

    const results = traces.map((trace, index) => {
      const parsed = parsedCities[index];
      const city = parsed.matched ? parsed.city : '';
      const geoResult = city ? cityCoordinates.get(city) : null;

      return {
        description: trace.description,
        originalCity: trace.city || '',
        parsedCity: city,
        matched: parsed.matched,
        coordinate: geoResult?.coordinate || null,
        source: geoResult?.source || null,
      };
    });

    successResponse(res, {
      total: traces.length,
      matchedCount: parsedCities.filter((c) => c.matched).length,
      uniqueCities,
      results,
    });
  } catch (error) {
    next(error);
  }
}
