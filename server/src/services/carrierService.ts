interface CarrierInfo {
  carrier: string;
  carrierCode: string;
}

const CARRIER_PREFIX_MAP: Record<string, CarrierInfo> = {
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
};

const DEFAULT_CARRIER: CarrierInfo = {
  carrier: '未知快递公司',
  carrierCode: 'unknown',
};

export function detectCarrier(trackingNo: string): CarrierInfo {
  if (!trackingNo || trackingNo.trim().length === 0) {
    return DEFAULT_CARRIER;
  }

  const upperNo = trackingNo.toUpperCase().trim();

  for (const [prefix, info] of Object.entries(CARRIER_PREFIX_MAP)) {
    if (upperNo.startsWith(prefix)) {
      return info;
    }
  }

  if (/^75\d+$/.test(upperNo)) {
    return { carrier: '圆通速递', carrierCode: 'yuantong' };
  }
  if (/^78\d+$/.test(upperNo)) {
    return { carrier: '中通快递', carrierCode: 'zhongtong' };
  }
  if (/^77\d+$/.test(upperNo)) {
    return { carrier: '申通快递', carrierCode: 'shentong' };
  }
  if (/^\d{13}$/.test(upperNo)) {
    return { carrier: '韵达快递', carrierCode: 'yunda' };
  }

  return DEFAULT_CARRIER;
}
