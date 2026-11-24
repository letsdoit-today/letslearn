export interface FallingBallParams {
  density: number;
  radius: number;
  rhoBall: number;
  g?: number;
  Cd?: number;
  pixelsPerMeter?: number;
  height?: number;
  waterLevel?: number;
  dt?: number;
  maxTime?: number;
  initialY?: number;
}

export interface FallingBallState {
  t: number;
  y: number;
  v: number;
  G: number;
  Fb: number;
  Fd: number;
  N: number;
  Fnet: number;
}

/**
 * 球体落入液体的欧拉积分仿真。
 * 输入参数、输出离散时间轴状态数组，不依赖 React / SVG。
 */
export function simulateFallingBall(params: FallingBallParams): FallingBallState[] {
  const {
    density,
    radius,
    rhoBall,
    g = 9.8,
    Cd = 0.47,
    pixelsPerMeter = 200,
    height = 500,
    waterLevel = 200,
    dt = 0.01,
    maxTime = 60,
    initialY = 50,
  } = params;

  const data: FallingBallState[] = [];
  let t = 0;
  let y = initialY;
  let v = 0;

  const mass = rhoBall * (4 / 3) * Math.PI * Math.pow(radius, 3);
  const fullVolume = (4 / 3) * Math.PI * Math.pow(radius, 3);

  while (t <= maxTime) {
    const G = mass * g;

    // 浮力：按浸没体积计算
    let Vsub = 0;
    const distFromSurface = (y - waterLevel) / pixelsPerMeter;

    if (distFromSurface > radius) {
      Vsub = fullVolume;
    } else if (distFromSurface < -radius) {
      Vsub = 0;
    } else {
      const h = radius + distFromSurface;
      Vsub = (Math.PI * Math.pow(h, 2) / 3) * (3 * radius - h);
    }

    const Fb = density * g * Vsub;

    // 阻力
    const immersionRatio = Vsub / fullVolume;
    const area = Math.PI * Math.pow(radius, 2);
    const vDir = v > 0 ? 1 : -1;
    let Fd = 0.5 * Cd * density * area * Math.pow(v, 2) * immersionRatio * vDir;

    // 支持力
    let N = 0;

    // 触底
    if (y + radius * pixelsPerMeter >= height) {
      y = height - radius * pixelsPerMeter;
      v = 0;
      Fd = 0;
      N = G - Fb;
      if (N < 0) N = 0;
    }

    const Fnet = G - Fb - Fd - N;

    data.push({ t, y, v, G, Fb, Fd, N, Fnet });

    const a = Fnet / mass;
    v += a * dt;
    y += v * dt * pixelsPerMeter;

    if (y + radius * pixelsPerMeter > height) {
      y = height - radius * pixelsPerMeter;
      v = 0;
    }

    t += dt;
  }

  return data;
}