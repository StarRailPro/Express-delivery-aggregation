import AMapLoader from '@amap/amap-jsapi-loader';

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

const AMAP_JS_KEY = import.meta.env.VITE_AMAP_JS_KEY as string;
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE as string;

export const isMockMode = (): boolean => {
  return !AMAP_JS_KEY || AMAP_JS_KEY === '' || AMAP_JS_KEY === 'mock';
};

type AMapConstructor = Awaited<ReturnType<typeof AMapLoader.load>>;

let loadPromise: Promise<AMapConstructor> | null = null;

export const loadAMap = (): Promise<AMapConstructor> => {
  if (loadPromise) return loadPromise;

  if (isMockMode()) {
    loadPromise = Promise.reject(new Error('AMap is in mock mode'));
    return loadPromise;
  }

  if (AMAP_SECURITY_CODE) {
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_CODE,
    };
  }

  loadPromise = AMapLoader.load({
    key: AMAP_JS_KEY,
    version: '2.0',
    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.ControlBar'],
  });

  return loadPromise;
};

export const resetLoader = (): void => {
  loadPromise = null;
};
