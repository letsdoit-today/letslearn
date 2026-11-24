export const G = 9.8;

const DEG = Math.PI / 180;

export interface PendulumParams {
  length: number;
  mass: number;
  theta0Deg: number;
}

export interface PendulumFrame {
  t: number;
  theta: number;
  omega: number;
  kinetic: number;
  potential: number;
  total: number;
}

export interface PendulumForces {
  gravity: number;
  tension: number;
  tangential: number;
}

export interface PendulumPeriod {
  t0: number;
  exact: number;
  deviation: number;
  lagPerPeriod: number;
}

export interface IntegrateOptions {
  duration: number;
  sampleDt?: number;
  stepDt?: number;
}

export interface PendulumPreset {
  id: string;
  label: string;
  params: PendulumParams;
}

export const PENDULUM_DEFAULT_PARAMS: PendulumParams = {
  length: 1.0,
  mass: 0.5,
  theta0Deg: 60,
};

export const SMALL_THETA0_DEG = 5;

export const PENDULUM_DURATION = 8;

export const PENDULUM_PRESETS: PendulumPreset[] = [
  {
    id: 'race',
    label: '同场竞速',
    params: { length: 1.0, mass: 0.5, theta0Deg: 60 },
  },
  {
    id: 'short',
    label: '短摆快摆',
    params: { length: 0.4, mass: 0.5, theta0Deg: 60 },
  },
  {
    id: 'heavy',
    label: '重球对照',
    params: { length: 1.0, mass: 2.0, theta0Deg: 60 },
  },
  {
    id: 'medium',
    label: '中等角度',
    params: { length: 1.0, mass: 0.5, theta0Deg: 30 },
  },
];

/** 简谐近似周期 T0 = 2π√(L/g) */
export function harmonicPeriod(length: number): number {
  return 2 * Math.PI * Math.sqrt(length / G);
}

/** 算术-几何平均，二次收敛，用于计算第一类完全椭圆积分 */
function agm(a: number, b: number): number {
  let x = a;
  let y = b;
  for (let i = 0; i < 20 && Math.abs(x - y) > 1e-12; i += 1) {
    const nx = (x + y) / 2;
    const ny = Math.sqrt(x * y);
    x = nx;
    y = ny;
  }
  return x;
}

/** 精确周期 T = 4√(L/g)·K(sin(θ0/2)) */
export function exactPeriod(length: number, theta0Deg: number): number {
  const k = Math.sin((theta0Deg * DEG) / 2);
  const complete = Math.PI / (2 * agm(1, Math.sqrt(1 - k * k)));
  return 4 * Math.sqrt(length / G) * complete;
}

export function periodInfo(length: number, theta0Deg: number): PendulumPeriod {
  const t0 = harmonicPeriod(length);
  const exact = exactPeriod(length, theta0Deg);
  return {
    t0,
    exact,
    deviation: (exact - t0) / t0,
    lagPerPeriod: exact - t0,
  };
}

/**
 * velocity Verlet 积分。辛格式，能量有界振荡而不单调漂移，
 * 保证振幅在长时间回放中稳定。
 */
export function integrate(params: PendulumParams, options: IntegrateOptions): PendulumFrame[] {
  const { duration, sampleDt = 0.01, stepDt = 0.005 } = options;
  const { length, mass, theta0Deg } = params;
  const w2 = G / length;

  let theta = theta0Deg * DEG;
  let omega = 0;
  let acc = -w2 * Math.sin(theta);

  const frames: PendulumFrame[] = [];
  const totalSamples = Math.max(1, Math.round(duration / sampleDt));
  const subSteps = Math.max(1, Math.round(sampleDt / stepDt));
  const h = sampleDt / subSteps;

  const push = (t: number) => {
    const kinetic = 0.5 * mass * (length * omega) ** 2;
    const potential = mass * G * length * (1 - Math.cos(theta));
    frames.push({ t, theta, omega, kinetic, potential, total: kinetic + potential });
  };

  push(0);
  for (let i = 1; i <= totalSamples; i += 1) {
    for (let j = 0; j < subSteps; j += 1) {
      const thetaNext = theta + omega * h + 0.5 * acc * h * h;
      const accNext = -w2 * Math.sin(thetaNext);
      omega += 0.5 * (acc + accNext) * h;
      theta = thetaNext;
      acc = accNext;
    }
    push(i * sampleDt);
  }
  return frames;
}

/** 摆球受力：重力、绳张力、切向回复力（均为正值，方向由调用方决定） */
export function forces(params: PendulumParams, theta: number, omega: number): PendulumForces {
  const { length, mass } = params;
  const gravity = mass * G;
  const tension = mass * G * Math.cos(theta) + mass * length * omega * omega;
  const tangential = mass * G * Math.sin(theta);
  return { gravity, tension, tangential };
}

/** 归一化简谐近似 θ/θ₀ = cos(√(g/L)·t)，t=0 时返回 1 */
export function harmonicRatio(length: number, t: number): number {
  return Math.cos(Math.sqrt(G / length) * t);
}