export const DAY_HOURS = 24;
export const DAY_START = 6;
export const DAY_END = 18;
export const P_MAX = 30;
export const K_HALF = 45;
export const RESPIRATION = 5;
export const FRAME_DT = 0.05;
export const FRAME_COUNT = Math.round(DAY_HOURS / FRAME_DT);
export const BALANCE_EPS = 0.05;

export type NetDirection = 'absorb' | 'release' | 'balanced';

export interface RateFrame {
  t: number;
  light: number;
  photo: number;
  respire: number;
  net: number;
}

export interface DayCycle {
  frames: RateFrame[];
  compensationLight: number;
  compensationTimes: [number, number];
}

export function lightAt(t: number): number {
  if (t <= DAY_START || t >= DAY_END) return 0;
  const phase = (Math.PI * (t - DAY_START)) / (DAY_END - DAY_START);
  return 100 * Math.sin(phase);
}

export function photoRate(light: number): number {
  if (light <= 0) return 0;
  return (P_MAX * light) / (light + K_HALF);
}

export function solveAt(t: number): RateFrame {
  const light = lightAt(t);
  const photo = photoRate(light);
  const respire = RESPIRATION;
  return { t, light, photo, respire, net: photo - respire };
}

export function solveCompensationLight(): number {
  if (P_MAX <= RESPIRATION) return 0;
  return (RESPIRATION * K_HALF) / (P_MAX - RESPIRATION);
}

export function solveCompensationTimes(light = solveCompensationLight()): [number, number] {
  const ratio = Math.min(1, Math.max(0, light / 100));
  const offset = (Math.asin(ratio) * (DAY_END - DAY_START)) / Math.PI;
  return [DAY_START + offset, DAY_END - offset];
}

export function buildDayCycle(): DayCycle {
  const frames: RateFrame[] = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    frames.push(solveAt(Number((i * FRAME_DT).toFixed(4))));
  }
  const compensationLight = solveCompensationLight();
  const compensationTimes = solveCompensationTimes(compensationLight);

  compensationTimes.forEach((time) => {
    const index = frameIndexAt({ frames, compensationLight, compensationTimes }, time);
    const snapped = Number(time.toFixed(4));
    const previous = frames[index - 1];
    const next = frames[index + 1];
    if ((previous ? previous.t < snapped : true) && (next ? snapped < next.t : true)) {
      frames[index] = solveAt(snapped);
    }
  });

  return { frames, compensationLight, compensationTimes };
}

export function frameIndexAt(cycle: DayCycle, t: number): number {
  const frames = cycle.frames;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function netDirection(net: number): NetDirection {
  if (Math.abs(net) < BALANCE_EPS) return 'balanced';
  return net < 0 ? 'release' : 'absorb';
}

export function formatTime(t: number): string {
  const norm = ((t % DAY_HOURS) + DAY_HOURS) % DAY_HOURS;
  let hour = Math.floor(norm);
  let minute = Math.round((norm - hour) * 60);
  if (minute === 60) {
    minute = 0;
    hour = (hour + 1) % DAY_HOURS;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}