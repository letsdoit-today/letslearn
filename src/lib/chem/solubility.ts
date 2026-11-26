export type SoluteKind = 'kno3' | 'nacl' | 'caoh2';

export interface SolutePoint {
  t: number;
  s: number;
}

export interface SoluteDef {
  kind: SoluteKind;
  label: string;
  formula: string;
  trend: string;
  data: SolutePoint[];
}

export interface SolubilityInput {
  kind: SoluteKind;
  temperature: number;
  solvent: number;
  added: number;
}

export type SaturationState = 'unsaturated' | 'exact' | 'saturated';

export interface SolubilityResult {
  kind: SoluteKind;
  temperature: number;
  solvent: number;
  added: number;
  solubility: number;
  maxDissolvable: number;
  dissolved: number;
  undissolved: number;
  solutionMass: number;
  massFraction: number;
  state: SaturationState;
}

export interface AxisSpec {
  max: number;
  ticks: number[];
  decimals: number;
}

export const SOLUTE_KINDS: SoluteKind[] = ['kno3', 'nacl', 'caoh2'];

export const SOLUTES: Record<SoluteKind, SoluteDef> = {
  kno3: {
    kind: 'kno3',
    label: '硝酸钾',
    formula: 'KNO₃',
    trend: '陡升',
    data: [
      { t: 0, s: 13.3 },
      { t: 10, s: 20.9 },
      { t: 20, s: 31.6 },
      { t: 30, s: 45.8 },
      { t: 40, s: 63.9 },
      { t: 50, s: 85.5 },
      { t: 60, s: 110 },
      { t: 70, s: 138 },
      { t: 80, s: 169 },
      { t: 90, s: 202 },
      { t: 100, s: 246 },
    ],
  },
  nacl: {
    kind: 'nacl',
    label: '氯化钠',
    formula: 'NaCl',
    trend: '平缓',
    data: [
      { t: 0, s: 35.7 },
      { t: 10, s: 35.8 },
      { t: 20, s: 36.0 },
      { t: 30, s: 36.3 },
      { t: 40, s: 36.6 },
      { t: 50, s: 37.0 },
      { t: 60, s: 37.3 },
      { t: 70, s: 37.8 },
      { t: 80, s: 38.4 },
      { t: 90, s: 39.0 },
      { t: 100, s: 39.8 },
    ],
  },
  caoh2: {
    kind: 'caoh2',
    label: '氢氧化钙',
    formula: 'Ca(OH)₂',
    trend: '下降',
    data: [
      { t: 0, s: 0.185 },
      { t: 20, s: 0.165 },
      { t: 40, s: 0.141 },
      { t: 60, s: 0.116 },
      { t: 80, s: 0.094 },
      { t: 100, s: 0.077 },
    ],
  },
};

export const DEFAULT_INPUT: SolubilityInput = {
  kind: 'kno3',
  temperature: 60,
  solvent: 100,
  added: 100,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function solubilityAt(kind: SoluteKind, temperature: number): number {
  const points = SOLUTES[kind].data;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const t = clamp(temperature, tMin, tMax);

  if (t <= tMin) return points[0].s;
  if (t >= tMax) return points[points.length - 1].s;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) {
      const ratio = (t - a.t) / (b.t - a.t);
      return a.s + (b.s - a.s) * ratio;
    }
  }
  return points[points.length - 1].s;
}

export function solveSolubility(input: SolubilityInput): SolubilityResult {
  const { kind, temperature, solvent, added } = input;
  const solubility = solubilityAt(kind, temperature);
  const maxDissolvable = (solubility * solvent) / 100;

  const dissolved = Math.min(added, maxDissolvable);
  const undissolved = Math.max(0, added - maxDissolvable);
  const solutionMass = solvent + dissolved;
  const massFraction = solutionMass > 0 ? (dissolved / solutionMass) * 100 : 0;

  const eps = Math.max(1e-9, maxDissolvable * 1e-9);
  let state: SaturationState;
  if (added > maxDissolvable + eps) {
    state = 'saturated';
  } else if (Math.abs(added - maxDissolvable) <= eps) {
    state = 'exact';
  } else {
    state = 'unsaturated';
  }

  return {
    kind,
    temperature,
    solvent,
    added,
    solubility,
    maxDissolvable,
    dissolved,
    undissolved,
    solutionMass,
    massFraction,
    state,
  };
}

export function axisSpec(kind: SoluteKind): AxisSpec {
  const points = SOLUTES[kind].data;
  const peak = Math.max(...points.map((p) => p.s));
  const raw = peak / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const mult = raw / magnitude;
  const niceMult = mult <= 1 ? 1 : mult <= 2 ? 2 : mult <= 5 ? 5 : 10;
  const step = niceMult * magnitude;

  const ticks: number[] = [];
  for (let i = 0; i <= 5; i += 1) ticks.push(step * i);

  const decimals = step < 0.1 ? 3 : step < 1 ? 2 : step < 10 ? 1 : 0;
  return { max: step * 5, ticks, decimals };
}

export function formatSolubility(value: number): string {
  if (value < 0.5) return value.toFixed(3);
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
}

export function formatTick(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function curvePoints(kind: SoluteKind, step = 1): SolutePoint[] {
  const points = SOLUTES[kind].data;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const result: SolutePoint[] = [];
  for (let t = tMin; t <= tMax; t += step) {
    result.push({ t, s: solubilityAt(kind, t) });
  }
  if (result[result.length - 1].t !== tMax) {
    result.push({ t: tMax, s: solubilityAt(kind, tMax) });
  }
  return result;
}