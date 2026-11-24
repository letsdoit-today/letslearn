export interface LeverParams {
  f1: number;
  l1: number;
  theta1: number;
  f2: number;
  l2: number;
  theta2: number;
}

export type LeverType = '省力' | '费力' | '等臂';

export interface LeverState {
  arm1: number;
  arm2: number;
  m1: number;
  m2: number;
  net: number;
  balanced: boolean;
  tiltDeg: number;
  leverType: LeverType;
}

export interface LeverPreset {
  id: string;
  label: string;
  params: LeverParams;
}

const DEG = Math.PI / 180;
const BALANCE_RATIO = 0.01;
const MIN_TILT_DEG = 2;
const MAX_TILT_DEG = 8;

/** 有效力臂：支点到力的作用线的垂距 */
export function effectiveArm(length: number, thetaDeg: number): number {
  return length * Math.sin(thetaDeg * DEG);
}

/**
 * 杠杆力矩计算。
 * theta 为力与横梁的夹角（90° 表示垂直施力），有效力臂 = L·sin(theta)。
 * 横梁倾角仅作视觉反馈，不参与力矩运算。
 */
export function computeLever(params: LeverParams): LeverState {
  const { f1, l1, theta1, f2, l2, theta2 } = params;

  const arm1 = effectiveArm(l1, theta1);
  const arm2 = effectiveArm(l2, theta2);
  const m1 = f1 * arm1;
  const m2 = f2 * arm2;
  const net = m2 - m1;
  const total = m1 + m2;

  const ratio = total > 0 ? Math.abs(net) / total : 0;
  const balanced = ratio < BALANCE_RATIO;

  let tiltDeg = 0;
  if (!balanced && total > 0) {
    const scaled = Math.min(1, ratio);
    const magnitude = MIN_TILT_DEG + (MAX_TILT_DEG - MIN_TILT_DEG) * scaled;
    tiltDeg = net > 0 ? magnitude : -magnitude;
  }

  const armScale = Math.max(arm1, arm2, 1e-9);
  let leverType: LeverType;
  if (Math.abs(arm1 - arm2) / armScale < BALANCE_RATIO) {
    leverType = '等臂';
  } else {
    leverType = arm1 > arm2 ? '省力' : '费力';
  }

  return { arm1, arm2, m1, m2, net, balanced, tiltDeg, leverType };
}

export const LEVER_PRESETS: LeverPreset[] = [
  {
    id: 'equal-arm',
    label: '等臂天平',
    params: { f1: 20, l1: 1.0, theta1: 90, f2: 20, l2: 1.0, theta2: 90 },
  },
  {
    id: 'effort-saving',
    label: '省力杠杆',
    params: { f1: 10, l1: 1.4, theta1: 90, f2: 40, l2: 0.35, theta2: 90 },
  },
  {
    id: 'effort-heavy',
    label: '费力杠杆',
    params: { f1: 40, l1: 0.35, theta1: 90, f2: 10, l2: 1.4, theta2: 90 },
  },
  {
    id: 'tilted-force',
    label: '斜向施力对比',
    params: { f1: 30, l1: 1.2, theta1: 90, f2: 30, l2: 1.2, theta2: 45 },
  },
];

export const LEVER_DEFAULT_PARAMS: LeverParams = LEVER_PRESETS[0].params;