export interface InclinedPlaneForces {
  G: number;
  N: number;
  Gx: number;
  Gy: number;
  f: number;
  fMax: number;
  thetaC: number;
  accel: number;
}

export interface InclinedPlaneParams {
  mass: number;
  g: number;
  mu: number;
  angleRad: number;
  isSliding: boolean;
  isRising?: boolean;
}

/**
 * 斜面受力分析：重力、支持力、下滑分力、垂直分力、最大静摩擦、当前摩擦力、
 * 临界角（tanθc = μ）与沿斜面加速度。
 *
 * 加速度以「沿斜面向下」为正方向：静止时为 0，下滑时为 g(sinθ − μcosθ)，
 * 上滑时为 g(sinθ + μcosθ)（与上滑速度反向，因此表现为减速）。
 */
export function calculateInclinedPlaneForces(params: InclinedPlaneParams): InclinedPlaneForces {
  const { mass, g, mu, angleRad, isSliding, isRising = false } = params;

  const G = mass * g;
  const N = G * Math.cos(angleRad);
  const Gx = G * Math.sin(angleRad);
  const Gy = G * Math.cos(angleRad);
  const fMax = mu * N;

  const kinetic = isSliding || isRising;
  const f = kinetic ? mu * N : Gx;
  const thetaC = Math.atan(mu);

  let accel = 0;
  if (isRising) {
    accel = g * (Math.sin(angleRad) + mu * Math.cos(angleRad));
  } else if (isSliding) {
    accel = g * (Math.sin(angleRad) - mu * Math.cos(angleRad));
  }

  return { G, N, Gx, Gy, f, fMax, thetaC, accel };
}