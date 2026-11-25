export type InductionMode = 'inertia' | 'constant-force' | 'constant-velocity';

export interface InductionParams {
  mode: InductionMode;
  B: number;
  L: number;
  R: number;
  m: number;
  v0: number;
  force: number;
  vTarget: number;
}

export interface InductionFrame {
  t: number;
  x: number;
  v: number;
  emf: number;
  current: number;
  ampForce: number;
  power: number;
  heat: number;
  kinetic: number;
}

export interface InductionTiming {
  tau: number;
  duration: number;
  sampleDt: number;
  stepDt: number;
}

export interface InductionDerived {
  emf: number;
  current: number;
  ampForce: number;
  power: number;
}

export interface InductionPreset {
  id: string;
  label: string;
  params: InductionParams;
}

/** 固定采样帧数：无论 τ 多大，帧数都保持在 800 附近 */
export const SAMPLE_COUNT = 800;

/** 匀速拖动模式没有时间常数，观察窗固定为 3 s */
export const MODE3_DURATION = 3;

export const INDUCTION_DEFAULT_PARAMS: InductionParams = {
  mode: 'inertia',
  B: 0.5,
  L: 0.5,
  R: 2,
  m: 0.2,
  v0: 2,
  force: 0.1,
  vTarget: 2,
};

export const INDUCTION_PRESETS: InductionPreset[] = [
  {
    id: 'textbook',
    label: '标准参数',
    params: {
      mode: 'inertia',
      B: 0.5,
      L: 0.5,
      R: 2,
      m: 0.2,
      v0: 2,
      force: 0.1,
      vTarget: 2,
    },
  },
  {
    id: 'fast-decay',
    label: '快速衰减（小 τ）',
    params: {
      mode: 'inertia',
      B: 1,
      L: 1,
      R: 0.5,
      m: 0.1,
      v0: 2,
      force: 0.1,
      vTarget: 2,
    },
  },
  {
    id: 'slow-decay',
    label: '慢速衰减（大 τ）',
    params: {
      mode: 'inertia',
      B: 0.4,
      L: 0.4,
      R: 5,
      m: 2,
      v0: 2,
      force: 0.1,
      vTarget: 2,
    },
  },
  {
    id: 'constant-force',
    label: '恒力驱动',
    params: {
      mode: 'constant-force',
      B: 0.8,
      L: 0.8,
      R: 2,
      m: 0.5,
      v0: 2,
      force: 0.2,
      vTarget: 2,
    },
  },
  {
    id: 'drag',
    label: '匀速拖动',
    params: {
      mode: 'constant-velocity',
      B: 0.6,
      L: 0.6,
      R: 1.5,
      m: 0.3,
      v0: 2,
      force: 0.2,
      vTarget: 3,
    },
  },
];

/** 电磁时间常数 τ = mR / (B²L²) */
export function timeConstant(params: InductionParams): number {
  const bl = params.B * params.L;
  return (params.m * params.R) / (bl * bl);
}

/** 恒力驱动模式的收尾速度 v∞ = F·R / (B²L²) */
export function terminalVelocity(params: InductionParams): number {
  const bl = params.B * params.L;
  return (params.force * params.R) / (bl * bl);
}

/** 任一速度下的派生电磁量，三种模式共用 */
export function deriveAt(params: InductionParams, v: number): InductionDerived {
  const emf = params.B * params.L * v;
  const current = emf / params.R;
  const ampForce = params.B * params.L * current;
  const power = current * current * params.R;
  return { emf, current, ampForce, power };
}

/**
 * 自适应时间轴与积分步长。
 * 时间窗口取 5τ（残余速度 < 1%），采样帧数固定 800；
 * 步长取 min(sampleDt/5, τ/20)，保证阻尼系统积分稳定。
 */
export function inductionTiming(params: InductionParams): InductionTiming {
  const tau = timeConstant(params);
  if (params.mode === 'constant-velocity') {
    const duration = MODE3_DURATION;
    const sampleDt = duration / SAMPLE_COUNT;
    return { tau, duration, sampleDt, stepDt: sampleDt / 5 };
  }
  const duration = 5 * tau;
  const sampleDt = duration / SAMPLE_COUNT;
  const stepDt = Math.min(sampleDt / 5, tau / 20);
  return { tau, duration, sampleDt, stepDt };
}

function pushDynamicsFrame(
  frames: InductionFrame[],
  params: InductionParams,
  t: number,
  x: number,
  v: number,
  heat: number,
): void {
  const emf = params.B * params.L * v;
  const current = emf / params.R;
  const ampForce = params.B * params.L * current;
  const power = current * current * params.R;
  frames.push({
    t,
    x,
    v,
    emf,
    current,
    ampForce,
    power,
    heat,
    kinetic: 0.5 * params.m * v * v,
  });
}

/** 惯性滑行（F_ext = 0）与恒力驱动（F_ext = F）的半隐式欧拉积分 */
function integrateDynamics(params: InductionParams, timing: InductionTiming): InductionFrame[] {
  const { B, L, R, m } = params;
  const k = (B * B * L * L) / R;
  const fExt = params.mode === 'constant-force' ? params.force : 0;

  let v = params.mode === 'constant-force' ? 0 : params.v0;
  let x = 0;
  let heat = 0;

  const frames: InductionFrame[] = [];
  const subSteps = Math.max(1, Math.round(timing.sampleDt / timing.stepDt));
  const h = timing.sampleDt / subSteps;

  pushDynamicsFrame(frames, params, 0, x, v, heat);
  for (let i = 1; i <= SAMPLE_COUNT; i += 1) {
    for (let j = 0; j < subSteps; j += 1) {
      const a = (fExt - k * v) / m;
      const vNext = v + a * h;
      x += vNext * h;
      const currentMid = (B * L * (v + vNext)) / (2 * R);
      heat += currentMid * currentMid * R * h;
      v = vNext;
    }
    pushDynamicsFrame(frames, params, i * timing.sampleDt, x, v, heat);
  }
  return frames;
}

/** 匀速拖动：速度恒定，所需外力被反解为与安培力等值反向，Q 线性累积 */
function integrateConstantVelocity(
  params: InductionParams,
  timing: InductionTiming,
): InductionFrame[] {
  const v = params.vTarget;
  const derived = deriveAt(params, v);
  const frames: InductionFrame[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i += 1) {
    const t = i * timing.sampleDt;
    frames.push({
      t,
      x: v * t,
      v,
      emf: derived.emf,
      current: derived.current,
      ampForce: derived.ampForce,
      power: derived.power,
      heat: derived.power * t,
      kinetic: 0.5 * params.m * v * v,
    });
  }
  return frames;
}

/** 统一入口：三种模式共用同一帧结构 */
export function integrateInduction(
  params: InductionParams,
  timing: InductionTiming = inductionTiming(params),
): InductionFrame[] {
  if (params.mode === 'constant-velocity') {
    return integrateConstantVelocity(params, timing);
  }
  return integrateDynamics(params, timing);
}

/** 总行程：取末帧位移，供轨道比例映射使用 */
export function travelDistance(frames: InductionFrame[]): number {
  return frames.length > 0 ? frames[frames.length - 1].x : 0;
}

/** 当前模式的特征速度：惯性 v₀ / 恒力 v∞ / 匀速 v_target */
export function characteristicSpeed(params: InductionParams): number {
  if (params.mode === 'constant-force') {
    return terminalVelocity(params);
  }
  if (params.mode === 'constant-velocity') {
    return params.vTarget;
  }
  return params.v0;
}