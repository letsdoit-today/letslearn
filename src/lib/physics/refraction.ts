export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export interface FresnelResult {
  R: number;
  T: number;
}

/**
 * 菲涅尔公式：计算界面的反射比 R 与透射比 T。
 */
export function fresnel(n1: number, n2: number, thetaI: number, thetaT: number): FresnelResult {
  const ci = Math.cos(thetaI);
  const ct = Math.cos(thetaT);
  const rs = Math.pow((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), 2);
  const rp = Math.pow((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci), 2);
  const R = 0.5 * (rs + rp);
  let T = 1 - R;
  if (!isFinite(T) || T < 0) T = 0;
  return { R, T };
}

export interface SnellResult {
  thetaT: number;
  R: number;
  T: number;
}

/**
 * 斯涅尔定律：n1·sinθi = n2·sinθt，结合菲涅尔公式计算折射角与反射/透射比。
 */
export function snellFresnel(n1: number, n2: number, thetaI: number): SnellResult {
  const sinT = Math.min(1, (n1 / n2) * Math.sin(thetaI));
  const thetaT = Math.asin(sinT);
  const { R, T } = fresnel(n1, n2, thetaI, thetaT);
  return { thetaT, R, T };
}