const CITY_PATTERNS: RegExp[] = [
  /【([^】]*?[市省区县])】/,
  /[【[]([^】\]]*?市)[】\]]/,
  /[【[]([^】\]]*?自治[区州县])[】\]]/,
  /([\u4e00-\u9fa5]{2,3}(?:省|市|自治区|特别行政区))/,
  /([\u4e00-\u9fa5]{2,4}(?:地区|州|盟))/,
  /([\u4e00-\u9fa5]{2,6}(?:自治州|自治县|自治旗))/,
  /[【[]([\u4e00-\u9fa5]{2,6})[】\]]/,
  /(?:从|由|自|在|到达|到达|发往|寄往|寄到|送往|送至|派送至|投递至|转运至|到达)([\u4e00-\u9fa5]{2,6}(?:市|区|县|镇))/,
  /(?:已到达|已到|到达|抵达)([\u4e00-\u9fa5]{2,6}(?:市|区|县))/,
  /([\u4e00-\u9fa5]{2,3}省[\u4e00-\u9fa5]{2,3}市)/,
];

const PROVINCE_CITY_PATTERN = /([\u4e00-\u9fa5]{2,3})省([\u4e00-\u9fa5]{2,3}市)/;

const EXCLUDE_WORDS: string[] = [
  '转运中心',
  '分拨中心',
  '集散中心',
  '营业部',
  '配送站',
  '代收点',
  '服务站',
  '快递柜',
  '驿站',
  '网点',
  '中心',
  '总部',
  '仓库',
  '站点',
];

function isExcludedCity(text: string): boolean {
  return EXCLUDE_WORDS.some((word) => text.includes(word));
}

function cleanCityName(raw: string): string {
  let cleaned = raw.trim();

  const provinceMatch = cleaned.match(PROVINCE_CITY_PATTERN);
  if (provinceMatch && provinceMatch[2]) {
    cleaned = provinceMatch[2];
  }

  if (cleaned.endsWith('市市')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}

export interface CityParseResult {
  city: string;
  matched: boolean;
  raw: string;
}

export function parseCityFromText(text: string): CityParseResult {
  if (!text || typeof text !== 'string') {
    return { city: '', matched: false, raw: '' };
  }

  for (const pattern of CITY_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (isExcludedCity(raw)) {
        continue;
      }
      const city = cleanCityName(raw);
      if (city.length >= 2) {
        return { city, matched: true, raw };
      }
    }
  }

  return { city: '', matched: false, raw: '' };
}

export function parseCitiesFromTraces(
  traces: Array<{ description: string; city?: string }>,
): Array<{ city: string; matched: boolean }> {
  return traces.map((trace) => {
    if (trace.city && trace.city.trim()) {
      const cleaned = cleanCityName(trace.city.trim());
      if (cleaned.length >= 2 && !isExcludedCity(cleaned)) {
        return { city: cleaned, matched: true };
      }
    }

    const result = parseCityFromText(trace.description);
    return { city: result.city, matched: result.matched };
  });
}
