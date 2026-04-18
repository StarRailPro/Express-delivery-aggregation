import crypto from 'crypto';
import { retryWithBackoff } from '../utils/retry';
import { recordApiCall } from './apiCounterService';
import {
  getCachedCarrier,
  setCachedCarrier,
  getCachedTracking,
  setCachedTracking,
  getTrackingPrefix,
  CarrierCacheValue,
} from './cacheService';

export interface DetectCarrierResult {
  carrier: string;
  carrierCode: string;
}

export interface TrackingTrace {
  timestamp: string;
  description: string;
  city: string;
}

export interface GetTrackingResult {
  status: string;
  traces: TrackingTrace[];
  fromCity: string;
  toCity: string;
}

const API_PROVIDER = process.env.EXPRESS_API_PROVIDER || 'kdniao';
const API_KEY = process.env.EXPRESS_API_KEY || '';
const API_SECRET = process.env.EXPRESS_API_SECRET || '';

function isMockMode(): boolean {
  return !API_KEY || API_KEY.trim() === '' || API_KEY.trim().toLowerCase() === 'mock';
}

class ExpressApiService {
  async detectCarrier(trackingNo: string): Promise<DetectCarrierResult> {
    const prefix = getTrackingPrefix(trackingNo);

    const cached = getCachedCarrier(prefix);
    if (cached) {
      console.log(`[ExpressApi] 快递公司识别缓存命中: ${prefix} -> ${cached.carrier}`);
      return cached;
    }

    if (isMockMode()) {
      return this.mockDetectCarrier(trackingNo, prefix);
    }

    const result = (await recordApiCall('detectCarrier', () =>
      retryWithBackoff(() => this.realDetectCarrier(trackingNo)),
    )) as DetectCarrierResult;

    setCachedCarrier(prefix, { carrier: result.carrier, carrierCode: result.carrierCode });
    return result;
  }

  async getTrackingInfo(trackingNo: string, carrierCode: string): Promise<GetTrackingResult> {
    const cached = getCachedTracking(trackingNo);
    if (cached) {
      console.log(`[ExpressApi] 物流轨迹缓存命中: ${trackingNo}`);
      return cached;
    }

    if (isMockMode()) {
      return this.mockGetTrackingInfo(trackingNo, carrierCode);
    }

    const result = (await recordApiCall('getTrackingInfo', () =>
      retryWithBackoff(() => this.realGetTrackingInfo(trackingNo, carrierCode)),
    )) as GetTrackingResult;

    setCachedTracking(trackingNo, result);
    return result;
  }

  private async realDetectCarrier(trackingNo: string): Promise<DetectCarrierResult> {
    if (API_PROVIDER === 'kuaidi100') {
      return this.kuaidi100DetectCarrier(trackingNo);
    }
    return this.kdniaoDetectCarrier(trackingNo);
  }

  private async realGetTrackingInfo(
    trackingNo: string,
    carrierCode: string,
  ): Promise<GetTrackingResult> {
    if (API_PROVIDER === 'kuaidi100') {
      return this.kuaidi100GetTrackingInfo(trackingNo, carrierCode);
    }
    return this.kdniaoGetTrackingInfo(trackingNo, carrierCode);
  }

  private async kdniaoDetectCarrier(trackingNo: string): Promise<DetectCarrierResult> {
    const requestData = JSON.stringify({ LogisticCode: trackingNo });
    const dataSign = this.kdniaoSign(requestData, API_SECRET);

    const url = 'https://api.kdniao.com/Ebusiness/EbusinessOrderHandle.aspx';
    const body = new URLSearchParams({
      RequestData: requestData,
      EBusinessID: API_KEY,
      RequestType: '2002',
      DataSign: dataSign,
      DataType: '2',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`快递鸟识别接口返回 HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      Success: boolean;
      Shippers?: Array<{ ShipperCode: string; ShipperName: string }>;
      Reason?: string;
    };

    if (!json.Success || !json.Shippers || json.Shippers.length === 0) {
      throw new Error(json.Reason || '快递公司识别失败');
    }

    const shipper = json.Shippers[0];
    return {
      carrier: shipper.ShipperName,
      carrierCode: shipper.ShipperCode.toLowerCase(),
    };
  }

  private async kdniaoGetTrackingInfo(
    trackingNo: string,
    carrierCode: string,
  ): Promise<GetTrackingResult> {
    const requestData = JSON.stringify({
      OrderCode: '',
      ShipperCode: carrierCode.toUpperCase(),
      LogisticCode: trackingNo,
    });
    const dataSign = this.kdniaoSign(requestData, API_SECRET);

    const url = 'https://api.kdniao.com/Ebusiness/EbusinessOrderHandle.aspx';
    const body = new URLSearchParams({
      RequestData: requestData,
      EBusinessID: API_KEY,
      RequestType: '8002',
      DataSign: dataSign,
      DataType: '2',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`快递鸟物流查询接口返回 HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      Success: boolean;
      State?: string;
      Traces?: Array<{
        AcceptTime: string;
        AcceptStation: string;
        Location?: string;
      }>;
      Reason?: string;
      Sender?: { City?: string };
      Receiver?: { City?: string };
    };

    if (!json.Success) {
      throw new Error(json.Reason || '物流查询失败');
    }

    const stateMap: Record<string, string> = {
      '0': 'in_transit',
      '1': 'in_transit',
      '2': 'exception',
      '3': 'in_transit',
      '4': 'delivered',
    };

    const traces: TrackingTrace[] = (json.Traces || []).map((t) => ({
      timestamp: t.AcceptTime,
      description: t.AcceptStation,
      city: this.extractCityFromDesc(t.AcceptStation, t.Location),
    }));

    return {
      status: stateMap[String(json.State)] || 'in_transit',
      traces,
      fromCity: json.Sender?.City || '',
      toCity: json.Receiver?.City || '',
    };
  }

  private async kuaidi100DetectCarrier(trackingNo: string): Promise<DetectCarrierResult> {
    const url = 'https://poll.kuaidi100.com/autonumber/autoComNum';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        resultv2: '1',
        text: trackingNo,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`快递100识别接口返回 HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      auto?: Array<{ comCode: string }>;
    };

    if (!json.auto || json.auto.length === 0) {
      throw new Error('快递100未能识别该单号');
    }

    const comCode = json.auto[0].comCode;
    const nameMap = this.getCarrierNameMap();
    return {
      carrier: nameMap[comCode] || comCode,
      carrierCode: comCode,
    };
  }

  private async kuaidi100GetTrackingInfo(
    trackingNo: string,
    carrierCode: string,
  ): Promise<GetTrackingResult> {
    const param = JSON.stringify({
      com: carrierCode,
      num: trackingNo,
    });
    const sign = crypto
      .createHash('md5')
      .update(param + API_KEY + API_SECRET)
      .digest('hex')
      .toUpperCase();

    const url = 'https://poll.kuaidi100.com/poll/query.do';
    const body = new URLSearchParams({
      customer: API_KEY,
      param,
      sign,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`快递100物流查询接口返回 HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      status: string;
      state: string;
      data?: Array<{
        time: string;
        context: string;
        location?: string;
        ftime: string;
      }>;
      message?: string;
      com?: string;
    };

    if (json.status === '400' || !json.data) {
      throw new Error(json.message || '物流查询失败');
    }

    const stateMap: Record<string, string> = {
      '0': 'in_transit',
      '1': 'in_transit',
      '2': 'exception',
      '3': 'in_transit',
      '4': 'delivered',
    };

    const traces: TrackingTrace[] = json.data.map((d) => ({
      timestamp: d.time,
      description: d.context,
      city: this.extractCityFromDesc(d.context, d.location),
    }));

    return {
      status: stateMap[json.state] || 'in_transit',
      traces,
      fromCity: traces.length > 0 ? this.extractCityFromDesc(traces[0].description) : '',
      toCity:
        traces.length > 0 ? this.extractCityFromDesc(traces[traces.length - 1].description) : '',
    };
  }

  private kdniaoSign(data: string, secret: string): string {
    const md5 = crypto.createHash('md5').update(data + secret).digest('hex');
    return Buffer.from(md5).toString('base64');
  }

  private extractCityFromDesc(desc: string, location?: string): string {
    if (location && location.trim()) return location.trim();

    const patterns = [
      /【([^】]*?[市省区])】/,
      /[【[]([^】\]]*?市)[】\]]/,
      /([\u4e00-\u9fa5]{2,4}(?:省|市|自治区|特别行政区))/,
      /[【[]([\u4e00-\u9fa5]{2,6})[】\]]/,
    ];

    for (const pattern of patterns) {
      const match = desc.match(pattern);
      if (match && match[1]) return match[1].trim();
    }

    return '';
  }

  private getCarrierNameMap(): Record<string, string> {
    return {
      shunfeng: '顺丰速运',
      yuantong: '圆通速递',
      zhongtong: '中通快递',
      shentong: '申通快递',
      yunda: '韵达快递',
      jingdong: '京东物流',
      jitu: '极兔速递',
      ems: '中国邮政EMS',
      debang: '德邦快递',
      kuayue: '跨越速运',
      youzhengguonei: '中国邮政',
      tiantian: '天天快递',
      huitongkuaidi: '百世快递',
      annengwuliu: '安能物流',
      suer: '速尔快递',
      longbanwuliu: '龙邦速递',
    };
  }

  private mockDetectCarrier(trackingNo: string, prefix: string): DetectCarrierResult {
    const mockMap: Record<string, CarrierCacheValue> = {
      SF: { carrier: '顺丰速运', carrierCode: 'shunfeng' },
      YT: { carrier: '圆通速递', carrierCode: 'yuantong' },
      ZTO: { carrier: '中通快递', carrierCode: 'zhongtong' },
      STO: { carrier: '申通快递', carrierCode: 'shentong' },
      YD: { carrier: '韵达快递', carrierCode: 'yunda' },
      JD: { carrier: '京东物流', carrierCode: 'jingdong' },
      JT: { carrier: '极兔速递', carrierCode: 'jitu' },
      EMS: { carrier: '中国邮政EMS', carrierCode: 'ems' },
      DB: { carrier: '德邦快递', carrierCode: 'debang' },
      KY: { carrier: '跨越速运', carrierCode: 'kuayue' },
      '75': { carrier: '圆通速递', carrierCode: 'yuantong' },
      '78': { carrier: '中通快递', carrierCode: 'zhongtong' },
      '77': { carrier: '申通快递', carrierCode: 'shentong' },
    };

    const result = mockMap[prefix] || { carrier: '未知快递公司', carrierCode: 'unknown' };

    setCachedCarrier(prefix, result);
    console.log(`[ExpressApi] Mock模式 - 识别快递公司: ${trackingNo} -> ${result.carrier}`);
    return result;
  }

  private mockGetTrackingInfo(trackingNo: string, carrierCode: string): GetTrackingResult {
    const now = new Date();
    const lastChar = trackingNo.slice(-1);
    const lastDigit = /\d/.test(lastChar) ? parseInt(lastChar, 10) : 0;

    let mockStatus: 'in_transit' | 'delivered' | 'exception';
    if (lastDigit <= 6) {
      mockStatus = 'in_transit';
    } else if (lastDigit <= 8) {
      mockStatus = 'delivered';
    } else {
      mockStatus = 'exception';
    }

    const traces = this.generateMockTraces(carrierCode, now, mockStatus);
    const fromCity = traces.length > 0 ? traces[0].city : '';
    const toCity = traces.length > 0 ? traces[traces.length - 1].city : '';

    const result: GetTrackingResult = {
      status: mockStatus,
      traces,
      fromCity,
      toCity,
    };

    setCachedTracking(trackingNo, result);
    console.log(
      `[ExpressApi] Mock模式 - 生成物流轨迹: ${trackingNo} (${carrierCode}), 状态: ${mockStatus}, ${traces.length}条记录`,
    );
    return result;
  }

  private generateMockTraces(
    carrierCode: string,
    baseTime: Date,
    status: 'in_transit' | 'delivered' | 'exception',
  ): TrackingTrace[] {
    const carrierRoutes: Record<string, { from: string; to: string; cities: string[] }> = {
      shunfeng: {
        from: '深圳市',
        to: '北京市',
        cities: ['深圳市', '广州市', '武汉市', '郑州市', '北京市'],
      },
      yuantong: {
        from: '上海市',
        to: '成都市',
        cities: ['上海市', '南京市', '合肥市', '武汉市', '重庆市', '成都市'],
      },
      zhongtong: { from: '杭州市', to: '西安市', cities: ['杭州市', '南京市', '郑州市', '西安市'] },
      shentong: { from: '广州市', to: '长沙市', cities: ['广州市', '韶关市', '衡阳市', '长沙市'] },
      yunda: {
        from: '北京市',
        to: '上海市',
        cities: ['北京市', '天津市', '济南市', '南京市', '上海市'],
      },
      jingdong: {
        from: '北京市',
        to: '广州市',
        cities: ['北京市', '石家庄市', '武汉市', '长沙市', '广州市'],
      },
      jitu: {
        from: '成都市',
        to: '深圳市',
        cities: ['成都市', '重庆市', '贵阳市', '南宁市', '广州市', '深圳市'],
      },
      ems: {
        from: '拉萨市',
        to: '上海市',
        cities: ['拉萨市', '成都市', '武汉市', '南京市', '上海市'],
      },
      debang: { from: '上海市', to: '沈阳市', cities: ['上海市', '济南市', '天津市', '沈阳市'] },
      kuayue: { from: '深圳市', to: '杭州市', cities: ['深圳市', '福州市', '杭州市'] },
    };

    const route = carrierRoutes[carrierCode] || {
      from: '上海市',
      to: '北京市',
      cities: ['上海市', '南京市', '济南市', '天津市', '北京市'],
    };

    const traces: TrackingTrace[] = [];
    const totalCities = route.cities.length;
    let stopIndex: number;

    if (status === 'delivered') {
      stopIndex = totalCities - 1;
    } else if (status === 'exception') {
      stopIndex = Math.min(2, totalCities - 1);
    } else {
      stopIndex = Math.floor(Math.random() * (totalCities - 2)) + 1;
    }

    const hoursPerStep = Math.floor(24 / totalCities);

    for (let i = 0; i <= stopIndex; i++) {
      const hoursAgo = (stopIndex - i) * hoursPerStep;
      const timestamp = new Date(baseTime.getTime() - hoursAgo * 3600 * 1000);

      if (i === 0) {
        traces.push({
          timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19),
          description: `【${route.cities[i]}】快件已从${route.cities[i]}发出`,
          city: route.cities[i],
        });
      } else if (i === totalCities - 1 && status === 'delivered') {
        const arrivedTime = new Date(timestamp.getTime() - 2 * 3600 * 1000);
        traces.push({
          timestamp: arrivedTime.toISOString().replace('T', ' ').substring(0, 19),
          description: `【${route.cities[i]}】快件已到达${route.cities[i]}转运中心`,
          city: route.cities[i],
        });
        const deliveredTime = new Date(timestamp.getTime());
        traces.push({
          timestamp: deliveredTime.toISOString().replace('T', ' ').substring(0, 19),
          description: `【${route.cities[i]}】快件已签收，签收人：本人`,
          city: route.cities[i],
        });
      } else if (status === 'exception' && i === stopIndex) {
        const arrivedTime = new Date(timestamp.getTime() - 1 * 3600 * 1000);
        traces.push({
          timestamp: arrivedTime.toISOString().replace('T', ' ').substring(0, 19),
          description: `【${route.cities[i]}】快件已到达${route.cities[i]}转运中心`,
          city: route.cities[i],
        });
        const exceptionTime = new Date(timestamp.getTime());
        const exceptionMsgs = [
          '快件滞留，原因：地址不详，请联系派送员',
          '派送失败，原因：收件人不在，请预约再次派送',
          '快件异常，原因：包装破损，正在核实处理',
        ];
        traces.push({
          timestamp: exceptionTime.toISOString().replace('T', ' ').substring(0, 19),
          description: `【${route.cities[i]}】${exceptionMsgs[Math.floor(Math.random() * exceptionMsgs.length)]}`,
          city: route.cities[i],
        });
      } else {
        const arrivedTime = new Date(timestamp.getTime() - 1 * 3600 * 1000);
        traces.push({
          timestamp: arrivedTime.toISOString().replace('T', ' ').substring(0, 19),
          description: `【${route.cities[i]}】快件已到达${route.cities[i]}转运中心`,
          city: route.cities[i],
        });
        if (i < stopIndex || status === 'in_transit') {
          const departedTime = new Date(timestamp.getTime());
          const nextCity = route.cities[i + 1] || '目的地';
          traces.push({
            timestamp: departedTime.toISOString().replace('T', ' ').substring(0, 19),
            description: `【${route.cities[i]}】快件已从${route.cities[i]}发出，下一站${nextCity}转运中心`,
            city: route.cities[i],
          });
        }
      }
    }

    return traces;
  }
}

const expressApiService = new ExpressApiService();

export default expressApiService;
