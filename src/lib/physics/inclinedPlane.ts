export interface InclinedPlaneForces {
  G: number;
  N: number;
  Gx: number;
  f: number;
  fMax: number;
}

export interface InclinedPlaneParams {
  mass: number;
  g: number;
  mu: number;
  angleRad: number;
  isSliding: boolean;
}

/**
 * 斜面受力分析：重力、支持力、下滑分力、最大静摩擦与当前摩擦力。
 */
export function calculateInclinedPlaneForces(params: InclinedPlaneParams): InclinedPlaneForces {
  const { mass, g, mu, angleRad, isSliding } = params;

  const G = mass * g;
  const N = G * Math.cos(angleRad);
  const Gx = G * Math.sin(angleRad);
  const fMax = mu * N;
  const f = isSliding ? mu * N : Gx;

  return { G, N, Gx, f, fMax };
}