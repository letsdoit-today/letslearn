export interface QuadraticInput {
  a: number;
  b: number;
  c: number;
}

export interface Vertex {
  h: number;
  k: number;
}

export interface QuadraticSolution {
  input: QuadraticInput;
  vertex: Vertex;
  axisX: number;
  discriminant: number;
  roots: number[];
  yIntercept: number;
  opensUp: boolean;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Preset {
  id: string;
  label: string;
  input: QuadraticInput;
}

export const X_MIN = -5;
export const X_MAX = 5;
export const Y_MIN = -10;
export const Y_MAX = 10;

export const A_MIN = -2;
export const A_MAX = 2;
export const A_STEP = 0.5;
export const B_MIN = -3;
export const B_MAX = 3;
export const C_MIN = -5;
export const C_MAX = 5;

export const X_TICKS = [-4, -2, 0, 2, 4];
export const Y_TICKS = [-10, -5, 0, 5, 10];

export const SAMPLES = 161;

export const PLOT = { left: 80, right: 720, top: 44, bottom: 444 };

export const DEFAULT_INPUT: QuadraticInput = { a: 1, b: 0, c: 0 };

export const PRESETS: Preset[] = [
  { id: 'standard', label: '标准型 y = x²', input: { a: 1, b: 0, c: 0 } },
  { id: 'downward', label: '开口向下', input: { a: -1, b: 0, c: 0 } },
  { id: 'two-roots', label: '两个实根', input: { a: 1, b: 0, c: -4 } },
  { id: 'tangent', label: '顶点在 x 轴上', input: { a: 1, b: -2, c: 1 } },
  { id: 'no-roots', label: '无实根', input: { a: 1, b: 0, c: 3 } },
];

export function evaluate(input: QuadraticInput, x: number): number {
  const { a, b, c } = input;
  return a * x * x + b * x + c;
}

export function rootsOf(input: QuadraticInput): number[] {
  const { a, b, c } = input;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  if (discriminant === 0) return [-b / (2 * a)];
  const sqrt = Math.sqrt(discriminant);
  const r1 = (-b - sqrt) / (2 * a);
  const r2 = (-b + sqrt) / (2 * a);
  return r1 <= r2 ? [r1, r2] : [r2, r1];
}

export function solveQuadratic(input: QuadraticInput): QuadraticSolution {
  const { a, b, c } = input;
  const h = -b / (2 * a);
  const k = c - (b * b) / (4 * a);
  return {
    input,
    vertex: { h, k },
    axisX: h,
    discriminant: b * b - 4 * a * c,
    roots: rootsOf(input),
    yIntercept: c,
    opensUp: a > 0,
  };
}

export function snapA(raw: number, prev: number): number {
  if (raw !== 0) return raw;
  return raw < prev ? -A_STEP : A_STEP;
}

export function curvePoints(input: QuadraticInput, samples: number = SAMPLES): CurvePoint[] {
  const points: CurvePoint[] = [];
  const step = (X_MAX - X_MIN) / (samples - 1);
  for (let i = 0; i < samples; i += 1) {
    const x = X_MIN + step * i;
    points.push({ x, y: evaluate(input, x) });
  }
  return points;
}

export function toScreen(x: number, y: number): ScreenPoint {
  return {
    x: PLOT.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT.right - PLOT.left),
    y: PLOT.bottom - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top),
  };
}

export function curvePath(input: QuadraticInput, samples: number = SAMPLES): string {
  return curvePoints(input, samples)
    .map((point) => {
      const screen = toScreen(point.x, point.y);
      return `${screen.x.toFixed(2)},${screen.y.toFixed(2)}`;
    })
    .join(' L')
    .replace(/^/, 'M');
}

export function formatNum(value: number, digits = 2): string {
  const fixed = value.toFixed(digits);
  return fixed === `-${(0).toFixed(digits)}` ? (0).toFixed(digits) : fixed;
}

export function formatCoordinate(point: { x: number; y: number }, digits = 2): string {
  return `(${formatNum(point.x, digits)}, ${formatNum(point.y, digits)})`;
}

export function rootHint(discriminant: number): string {
  if (discriminant > 0) return '两实根';
  if (discriminant === 0) return '重根';
  return '无实根';
}