export const MU0 = 4 * Math.PI * 1e-7;

/** 固定采样帧数：与站点其他演示保持一致的帧密度 */
export const SAMPLE_COUNT = 800;

/** 教学线圈轴向长度，仅用于估算自感 */
export const COIL_LENGTH = 0.02;

/** 冲击电流计固有周期 */
export const POINTER_PERIOD = 2.5;

/** 冲击电流计阻尼比（欠阻尼，保证脉冲后回摆衰减） */
export const POINTER_DAMPING = 0.1;

/** 冲击电流计灵敏度：把回路电流折算为指针角加速度 */
export const POINTER_SENSITIVITY = 700;

/** 磁铁运动结束后的自由衰减观察窗口，用于呈现指针回摆与静止 */
export const POINTER_TAIL = 8;

export const POINTER_OMEGA = (2 * Math.PI) / POINTER_PERIOD;

export type MagnetTimelineMode = 'insert-withdraw' | 'pass-through';

export type MagnetPhase = 'approach' | 'hold' | 'withdraw' | 'pass';

export interface MagnetCoilParams {
  N: number;
  a: number;
  R: number;
  moment: number;
  z0: number;
  v: number;
  holdTime: number;
  mode: MagnetTimelineMode;
}

export interface MagnetCoilFrame {
  t: number;
  phase: MagnetPhase;
  z: number;
  v: number;
  phi: number;
  fluxLinkage: number;
  emf: number;
  current: number;
  lorentz: number;
  charge: number;
  heat: number;
  theta: number;
}

export interface MagnetCoilTiming {
  duration: number;
  motionDuration: number;
  sampleDt: number;
  travelTime: number;
}

export interface MagnetCoilPreset {
  id: string;
  label: string;
  params: MagnetCoilParams;
}

export const MAGNET_COIL_DEFAULT_PARAMS: MagnetCoilParams = {
  N: 200,
  a: 0.02,
  R: 2,
  moment: 0.5,
  z0: 0.15,
  v: 0.3,
  holdTime: 0.6,
  mode: 'insert-withdraw',
};

export const MAGNET_COIL_PRESETS: MagnetCoilPreset[] = [
  {
    id: 'standard',
    label: '标准插入',
    params: { ...MAGNET_COIL_DEFAULT_PARAMS },
  },
  {
    id: 'pass',
    label: '一次穿过',
    params: { ...MAGNET_COIL_DEFAULT_PARAMS, mode: 'pass-through', holdTime: 0 },
  },
  {
    id: 'small-coil',
    label: '小线圈',
    params: { ...MAGNET_COIL_DEFAULT_PARAMS, a: 0.01, N: 300 },
  },
  {
    id: 'large-r',
    label: '大电阻',
    params: { ...MAGNET_COIL_DEFAULT_PARAMS, R: 5 },
  },
];

/** 单匝磁通量 Φ(z) = μ0·m·a² / (2·(a² + z²)^(3/2)) */
export function fluxAt(params: MagnetCoilParams, z: number): number {
  const a2 = params.a * params.a;
  const denom = 2 * Math.pow(a2 + z * z, 1.5);
  return (MU0 * params.moment * a2) / denom;
}

/** 磁通量对轴向位置的导数，在 z = a/2 处绝对值取极大 */
export function dFluxDz(params: MagnetCoilParams, z: number): number {
  const a2 = params.a * params.a;
  const denom = 2 * Math.pow(a2 + z * z, 2.5);
  return (-3 * MU0 * params.moment * a2 * z) / denom;
}

/** 线圈自感 L = μ0·N²·A / l，仅作参考常量 */
export function inductanceOf(params: MagnetCoilParams, length = COIL_LENGTH): number {
  const area = Math.PI * params.a * params.a;
  return (MU0 * params.N * params.N * area) / length;
}

/** 自感时间常数 τ_L = L/R */
export function tauL(params: MagnetCoilParams): number {
  return inductanceOf(params) / params.R;
}

/** 单程磁通量变化量（从远处到线圈中心） */
export function oneWayFluxChange(params: MagnetCoilParams): number {
  return fluxAt(params, 0);
}

export function magnetCoilTiming(params: MagnetCoilParams): MagnetCoilTiming {
  const travelTime = params.z0 / params.v;
  const motionDuration =
    params.mode === 'pass-through' ? 2 * travelTime : 2 * travelTime + 2 * params.holdTime;
  return {
    duration: motionDuration + POINTER_TAIL,
    motionDuration,
    sampleDt: motionDuration / SAMPLE_COUNT,
    travelTime,
  };
}

export function stateAt(params: MagnetCoilParams, t: number): { phase: MagnetPhase; z: number; v: number } {
  const travel = params.z0 / params.v;
  if (params.mode === 'pass-through') {
    if (t >= 2 * travel) {
      return { phase: 'hold', z: params.z0, v: 0 };
    }
    return { phase: 'pass', z: -params.z0 + params.v * t, v: params.v };
  }
  if (t < travel) {
    return { phase: 'approach', z: -params.z0 + params.v * t, v: params.v };
  }
  if (t < travel + params.holdTime) {
    return { phase: 'hold', z: 0, v: 0 };
  }
  if (t < 2 * travel + params.holdTime) {
    const tt = t - travel - params.holdTime;
    return { phase: 'withdraw', z: -params.v * tt, v: -params.v };
  }
  return { phase: 'hold', z: -params.z0, v: 0 };
}

interface RawFrame {
  t: number;
  phase: MagnetPhase;
  z: number;
  v: number;
  phi: number;
  fluxLinkage: number;
  emf: number;
  current: number;
  lorentz: number;
}

function pushRaw(params: MagnetCoilParams, t: number, out: RawFrame[]): void {
  const state = stateAt(params, t);
  const phi = fluxAt(params, state.z);
  const fluxLinkage = params.N * phi;
  const emf = -params.N * dFluxDz(params, state.z) * state.v;
  const current = emf / params.R;
  const lorentz = current * params.N * dFluxDz(params, state.z);
  out.push({ t, ...state, phi, fluxLinkage, emf, current, lorentz });
}

function pointerTrace(currents: number[], sampleDt: number): number[] {
  const wn = POINTER_OMEGA;
  const zeta = POINTER_DAMPING;
  const k = POINTER_SENSITIVITY;
  const maxStep = Math.min(sampleDt / 10, POINTER_PERIOD / 400);
  const steps = Math.max(1, Math.ceil(sampleDt / maxStep));
  const h = sampleDt / steps;

  let theta = 0;
  let omega = 0;
  const trace: number[] = [0];

  for (let i = 1; i < currents.length; i += 1) {
    const i0 = currents[i - 1];
    const i1 = currents[i];
    for (let j = 0; j < steps; j += 1) {
      const tau0 = j / steps;
      const tau1 = (j + 1) / steps;
      const force = (tau: number) => k * (i0 + (i1 - i0) * tau);

      const accel = (om: number, th: number, f: number) => -2 * zeta * wn * om - wn * wn * th + f;

      const k1th = omega;
      const k1om = accel(omega, theta, force(tau0));
      const k2th = omega + (h / 2) * k1om;
      const k2om = accel(omega + (h / 2) * k1om, theta + (h / 2) * k1th, force((tau0 + tau1) / 2));
      const k3th = omega + (h / 2) * k2om;
      const k3om = accel(omega + (h / 2) * k2om, theta + (h / 2) * k2th, force((tau0 + tau1) / 2));
      const k4th = omega + h * k3om;
      const k4om = accel(omega + h * k3om, theta + h * k3th, force(tau1));

      theta += (h / 6) * (k1th + 2 * k2th + 2 * k3th + k4th);
      omega += (h / 6) * (k1om + 2 * k2om + 2 * k3om + k4om);
    }
    trace.push(theta);
  }
  return trace;
}

/**
 * 准静态解析帧序列：磁铁位置由时间给定，Φ 与 ε 逐帧解析求值；
 * 累计电荷与焦耳热按梯形法累积，指针由欠阻尼二阶系统 RK4 积分。
 */
export function integrateMagnetCoil(params: MagnetCoilParams): MagnetCoilFrame[] {
  const timing = magnetCoilTiming(params);
  const frameCount = Math.round(timing.duration / timing.sampleDt);
  const raw: RawFrame[] = [];
  for (let i = 0; i <= frameCount; i += 1) {
    pushRaw(params, i * timing.sampleDt, raw);
  }

  const currents = raw.map((frame) => frame.current);
  const thetas = pointerTrace(currents, timing.sampleDt);

  let charge = 0;
  let heat = 0;
  return raw.map((frame, i) => {
    if (i > 0) {
      const prev = raw[i - 1];
      charge += (Math.abs(prev.current) + Math.abs(frame.current)) / 2 * timing.sampleDt;
      heat +=
        (prev.current * prev.current + frame.current * frame.current) / 2 * params.R * timing.sampleDt;
    }
    return { ...frame, charge, heat, theta: thetas[i] ?? 0 };
  });
}

export function peakFluxLinkage(frames: MagnetCoilFrame[]): number {
  return frames.reduce((max, frame) => Math.max(max, Math.abs(frame.fluxLinkage)), 0);
}

export function peakEmf(frames: MagnetCoilFrame[]): number {
  return frames.reduce((max, frame) => Math.max(max, Math.abs(frame.emf)), 0);
}

export function peakTheta(frames: MagnetCoilFrame[]): number {
  return frames.reduce((max, frame) => Math.max(max, Math.abs(frame.theta)), 0);
}

export function totalCharge(frames: MagnetCoilFrame[]): number {
  return frames.length > 0 ? frames[frames.length - 1].charge : 0;
}

export function totalHeat(frames: MagnetCoilFrame[]): number {
  return frames.length > 0 ? frames[frames.length - 1].heat : 0;
}