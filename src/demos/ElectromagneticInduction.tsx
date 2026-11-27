import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Circle, G, Line, Path, Polygon, Text } from '@svgdotjs/svg.js';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { useSimulation } from '@/hooks/useSimulation';
import { Button } from '@/components/ui/button';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { CanvasLegend } from '@/components/demo/CanvasLegend';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { DemoControls } from '@/components/demo/DemoControls';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette, rgba } from '@/lib/palette';
import {
  INDUCTION_DEFAULT_PARAMS,
  INDUCTION_PRESETS,
  characteristicSpeed,
  inductionTiming,
  integrateInduction,
  timeConstant,
  travelDistance,
  type InductionFrame,
  type InductionMode,
  type InductionParams,
} from '@/lib/physics/induction';

const SLUG = 'electromagnetic-induction';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const WIDTH = 800;
const HEIGHT = 500;

const RAIL_LEFT = 100;
const RAIL_RIGHT = 730;
const RAIL_TOP = 120;
const RAIL_BOTTOM = 300;
const MID_Y = (RAIL_TOP + RAIL_BOTTOM) / 2;

const ROD_START_X = 180;
const ROD_END_X = 715;

const ARROW_MAX = 84;
const FIELD_GAP = 44;
const DOTS = 12;
const CURVE_STRIDE = 4;
const V_MAX = 5;

const CHART = { left: 90, right: 760, top: 330, bottom: 470 };
const CHART_PLOT = {
  left: CHART.left + 56,
  right: CHART.right - 52,
  top: CHART.top + 20,
  bottom: CHART.bottom - 28,
};

const MODES: { id: InductionMode; label: string }[] = [
  { id: 'inertia', label: '惯性滑行' },
  { id: 'constant-force', label: '恒力驱动' },
  { id: 'constant-velocity', label: '匀速拖动' },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function fmt(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs !== 0 && abs < 0.001) return value.toExponential(2);
  if (abs >= 1000) return value.toFixed(0);
  return value.toFixed(digits);
}

function fmtTime(t: number): string {
  if (!Number.isFinite(t)) return '—';
  if (t >= 100) return `${t.toFixed(0)} s`;
  if (t >= 10) return `${t.toFixed(1)} s`;
  return `${t.toFixed(2)} s`;
}

function polylinePath(pts: [number, number][]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(' ');
}

function areaPath(pts: [number, number][], baseY: number): string {
  if (pts.length === 0) return 'M0,0';
  const body = pts.map((p) => `L${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  return `M${pts[0][0].toFixed(2)},${baseY.toFixed(2)} ${body} L${pts[pts.length - 1][0].toFixed(
    2,
  )},${baseY.toFixed(2)} Z`;
}

function headPoints(tip: [number, number], from: [number, number], size = 10, half = 5): string {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const a = `${(bx - uy * half).toFixed(2)},${(by + ux * half).toFixed(2)}`;
  const b = `${(bx + uy * half).toFixed(2)},${(by - ux * half).toFixed(2)}`;
  return `${tip[0].toFixed(2)},${tip[1].toFixed(2)} ${a} ${b}`;
}

interface ArrowEls {
  line: Line;
  head: Polygon;
  label: Text;
}

interface SnapContext {
  rod: Line;
  rodTop: Circle;
  rodBottom: Circle;
  dots: Circle[];
  vArrow: ArrowEls;
  ampArrow: ArrowEls;
  extArrow: ArrowEls;
  timeGroup: G;
  lineGroup: G;
  timeTicks: Text[];
  vAxisTexts: Text[];
  iAxisTexts: Text[];
  vCurve: Path;
  iCurve: Path;
  theoryCurve: Path;
  cursor: Line;
  workPoint: Circle;
  lineXTicks: Text[];
  lineYTicks: Text[];
}

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
  start: number;
}

function locate(segments: Segment[], s: number): [number, number] {
  for (const seg of segments) {
    if (s <= seg.start + seg.len) {
      const r = seg.len > 0 ? (s - seg.start) / seg.len : 0;
      return [seg.x0 + (seg.x1 - seg.x0) * r, seg.y0 + (seg.y1 - seg.y0) * r];
    }
  }
  const last = segments[segments.length - 1];
  return last ? [last.x1, last.y1] : [RAIL_LEFT, RAIL_TOP];
}

const ElectromagneticInduction: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SnapContext | null>(null);
  const flowPhaseRef = useRef(0);
  const lastClockRef = useRef<number | null>(null);
  const prevModeRef = useRef<InductionMode>(INDUCTION_DEFAULT_PARAMS.mode);

  const [params, setParams] = useState<InductionParams>(INDUCTION_DEFAULT_PARAMS);

  const timing = useMemo(() => inductionTiming(params), [params]);

  const sim = useSimulation<InductionFrame>(
    () => integrateInduction(params, timing),
    [params, timing],
    { dt: timing.sampleDt, loop: false },
  );

  const resetSim = sim.reset;

  useEffect(() => {
    if (prevModeRef.current !== params.mode) {
      prevModeRef.current = params.mode;
      resetSim();
    }
  }, [params.mode, resetSim]);

  const charSpeed = characteristicSpeed(params);
  const tau = timeConstant(params);

  const draw = useCallback(
    (frame: InductionFrame, tNow: number) => {
      const ctx = snapRef.current;
      if (!ctx) return;

      const total = Math.max(travelDistance(sim.frames), 1e-9);
      const rodX = ROD_START_X + clamp(frame.x / total, 0, 1) * (ROD_END_X - ROD_START_X);
      ctx.rod.plot(rodX, RAIL_TOP, rodX, RAIL_BOTTOM);
      ctx.rodTop.center(rodX, RAIL_TOP);
      ctx.rodBottom.center(rodX, RAIL_BOTTOM);

      const vRef = Math.max(Math.abs(charSpeed), 1e-9);
      const iRef = (params.B * params.L * vRef) / params.R;
      const dir = frame.v >= 0 ? 1 : -1;

      const placeArrow = (
        els: ArrowEls,
        fromX: number,
        y: number,
        arrowDir: number,
        length: number,
        text: string,
      ) => {
        if (length < 6 || arrowDir === 0) {
          els.line.hide();
          els.head.hide();
          els.label.hide();
          return;
        }
        els.line.show();
        els.head.show();
        els.label.show();
        const tip: [number, number] = [fromX + arrowDir * length, y];
        els.line.plot(fromX, y, tip[0], tip[1]);
        els.head.plot(headPoints(tip, [fromX, y]));
        els.label
          .text(text)
          .amove(clamp(tip[0] + arrowDir * 14, 24, WIDTH - 24), clamp(y - 15, 24, HEIGHT - 24));
      };

      const vLen = clamp(Math.abs(frame.v) / vRef, 0, 1) * ARROW_MAX;
      const faRef = Math.max((params.B * params.L * iRef), 1e-9);
      const faLen = clamp(Math.abs(frame.ampForce) / faRef, 0, 1) * ARROW_MAX;

      placeArrow(ctx.vArrow, rodX, MID_Y - 40, dir, vLen, 'v');
      placeArrow(ctx.ampArrow, rodX, MID_Y, -dir, faLen, 'F_A');
      if (params.mode === 'constant-velocity') {
        placeArrow(ctx.extArrow, rodX, MID_Y, dir, faLen, 'F_外');
      } else if (params.mode === 'constant-force') {
        placeArrow(ctx.extArrow, rodX, MID_Y, dir, ARROW_MAX, 'F_外');
      } else {
        ctx.extArrow.line.hide();
        ctx.extArrow.head.hide();
        ctx.extArrow.label.hide();
      }

      const loop: [number, number][] = [
        [RAIL_LEFT, RAIL_TOP],
        [rodX, RAIL_TOP],
        [rodX, RAIL_BOTTOM],
        [RAIL_LEFT, RAIL_BOTTOM],
        [RAIL_LEFT, RAIL_TOP],
      ];
      const segments: Segment[] = [];
      let perimeter = 0;
      for (let i = 0; i < loop.length - 1; i += 1) {
        const [x0, y0] = loop[i];
        const [x1, y1] = loop[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        segments.push({ x0, y0, x1, y1, len, start: perimeter });
        perimeter += len;
      }

      const now = performance.now();
      const last = lastClockRef.current ?? now;
      lastClockRef.current = now;
      const wallDt = clamp((now - last) / 1000, 0, 0.05);

      if (perimeter > 0 && Math.abs(frame.current) > 1e-9) {
        const speed = 40 + 160 * clamp(Math.abs(frame.current) / Math.max(iRef, 1e-9), 0, 1.5);
        flowPhaseRef.current -= dir * wallDt * speed;
        let phase = flowPhaseRef.current % perimeter;
        if (phase < 0) phase += perimeter;
        ctx.dots.forEach((dot, k) => {
          const s = (phase + (k * perimeter) / DOTS) % perimeter;
          const [px, py] = locate(segments, s);
          dot.center(px, py).show();
        });
      } else {
        ctx.dots.forEach((dot) => dot.hide());
      }

      const tNowClamped = clamp(tNow, 0, timing.duration);
      const plotX = (t: number) =>
        CHART_PLOT.left + (t / timing.duration) * (CHART_PLOT.right - CHART_PLOT.left);
      const plotY = (ratio: number) =>
        CHART_PLOT.bottom - clamp(ratio, 0, 1) * (CHART_PLOT.bottom - CHART_PLOT.top);

      if (params.mode === 'constant-velocity') {
        ctx.timeGroup.hide();
        ctx.lineGroup.show();

        const epsMax = Math.max(params.B * params.L * V_MAX, 1e-9);
        ctx.lineYTicks[0].text(`${fmt(epsMax, 2)} V`);
        ctx.lineYTicks[1].text('0');
        ctx.lineXTicks[0].text('0');
        ctx.lineXTicks[1].text(`${V_MAX} m/s`);

        const px =
          CHART_PLOT.left + (params.vTarget / V_MAX) * (CHART_PLOT.right - CHART_PLOT.left);
        const py =
          CHART_PLOT.bottom -
          ((params.B * params.L * params.vTarget) / epsMax) *
            (CHART_PLOT.bottom - CHART_PLOT.top);
        ctx.workPoint.center(px, py).show();
      } else {
        ctx.lineGroup.hide();
        ctx.timeGroup.show();

        const iPeak = Math.max((params.B * params.L * vRef) / params.R, 1e-9);
        const tickXs = [
          CHART_PLOT.left,
          (CHART_PLOT.left + CHART_PLOT.right) / 2,
          CHART_PLOT.right,
        ];
        ctx.timeTicks[0].text('0 s');
        ctx.timeTicks[1].text(fmtTime(timing.duration / 2));
        ctx.timeTicks[2].text(fmtTime(timing.duration));
        ctx.timeTicks.forEach((tick, i) => tick.amove(tickXs[i], CHART.bottom - 10));
        ctx.vAxisTexts[0].text(`${fmt(vRef, 2)} m/s`);
        ctx.vAxisTexts[1].text('0');
        ctx.iAxisTexts[0].text(`${fmt(iPeak, 3)} A`);
        ctx.iAxisTexts[1].text('0');

        const buildCurve = (ratio: (f: InductionFrame) => number): [number, number][] => {
          const pts: [number, number][] = [];
          for (let i = 0; i < sim.frames.length; i += CURVE_STRIDE) {
            const f = sim.frames[i];
            if (f.t > tNowClamped) break;
            pts.push([plotX(f.t), plotY(ratio(f))]);
          }
          const lastIdx = clamp(
            Math.round(tNowClamped / timing.sampleDt),
            0,
            sim.frames.length - 1,
          );
          const lastFrame = sim.frames[lastIdx];
          if (lastFrame && lastFrame.t <= tNowClamped + 1e-9) {
            const point: [number, number] = [plotX(lastFrame.t), plotY(ratio(lastFrame))];
            const prev = pts[pts.length - 1];
            if (!prev || prev[0] < point[0] - 0.01) pts.push(point);
          }
          return pts;
        };

        const vPts = buildCurve((f) => Math.abs(f.v) / vRef);
        const iPts = buildCurve((f) => Math.abs(f.current) / iPeak);

        const theoryPts: [number, number][] = [];
        const steps = 40;
        for (let k = 0; k <= steps; k += 1) {
          const t = (k / steps) * tNowClamped;
          const ratio =
            params.mode === 'inertia' ? Math.exp(-t / tau) : 1 - Math.exp(-t / tau);
          theoryPts.push([plotX(t), plotY(ratio)]);
        }

        if (tNowClamped <= 1e-9) {
          ctx.vCurve.hide();
          ctx.iCurve.hide();
          ctx.theoryCurve.hide();
        } else {
          ctx.vCurve.show();
          ctx.iCurve.show();
          ctx.theoryCurve.show();
          ctx.vCurve.plot(areaPath(vPts, CHART_PLOT.bottom));
          ctx.iCurve.plot(polylinePath(iPts));
          ctx.theoryCurve.plot(polylinePath(theoryPts));
        }

        const cx = plotX(tNowClamped);
        ctx.cursor.plot(cx, CHART_PLOT.top, cx, CHART_PLOT.bottom);
      }
    },
    [params, timing, sim.frames, charSpeed, tau],
  );

  useSVGScene(svgRef, (s) => {
    for (let x = RAIL_LEFT + 24; x <= RAIL_RIGHT - 24; x += FIELD_GAP) {
      for (let y = RAIL_TOP + 22; y <= RAIL_BOTTOM - 22; y += FIELD_GAP) {
        s
          .text('×')
          .attr({
            fill: palette.field,
            'font-size': '15px',
            'font-weight': 'bold',
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            opacity: 0.55,
          })
          .amove(x, y);
      }
    }

    s
      .line(RAIL_LEFT, RAIL_TOP, RAIL_RIGHT, RAIL_TOP)
      .stroke({ color: palette.objectStroke, width: 3, linecap: 'round' });
    s
      .line(RAIL_LEFT, RAIL_BOTTOM, RAIL_RIGHT, RAIL_BOTTOM)
      .stroke({ color: palette.objectStroke, width: 3, linecap: 'round' });

    const resW = 24;
    const resH = 64;
    s
      .line(RAIL_LEFT, RAIL_TOP, RAIL_LEFT, MID_Y - resH / 2)
      .stroke({ color: palette.objectStroke, width: 3 });
    s
      .line(RAIL_LEFT, MID_Y + resH / 2, RAIL_LEFT, RAIL_BOTTOM)
      .stroke({ color: palette.objectStroke, width: 3 });
    s
      .rect(resW, resH)
      .center(RAIL_LEFT, MID_Y)
      .radius(4)
      .attr({ fill: '#ffffff', stroke: palette.objectStroke, 'stroke-width': 2 });
    s
      .text('R')
      .attr({
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      })
      .amove(RAIL_LEFT, MID_Y);

    const rod = s
      .line(ROD_START_X, RAIL_TOP, ROD_START_X, RAIL_BOTTOM)
      .stroke({ color: palette.objectStroke, width: 6, linecap: 'round' });
    const rodTop = s
      .circle(10)
      .center(ROD_START_X, RAIL_TOP)
      .attr({ fill: palette.objectStroke });
    const rodBottom = s
      .circle(10)
      .center(ROD_START_X, RAIL_BOTTOM)
      .attr({ fill: palette.objectStroke });

    const dots: Circle[] = [];
    for (let i = 0; i < DOTS; i += 1) {
      dots.push(
        s
          .circle(6)
          .center(RAIL_LEFT, RAIL_TOP)
          .attr({ fill: palette.current })
          .hide(),
      );
    }

    const createArrow = (color: string): ArrowEls => {
      const line = s.line(0, 0, 0, 0).stroke({ color, width: 2.5, linecap: 'round' });
      const head = s.polygon('0,0 0,0 0,0').fill(color);
      const label = s.text('').attr({
        fill: color,
        'font-size': '12px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      return { line, head, label };
    };

    const vArrow = createArrow(palette.statusActive);
    const ampArrow = createArrow(palette.forceComponent);
    const extArrow = createArrow(palette.emf);

    s
      .rect(CHART.right - CHART.left, CHART.bottom - CHART.top)
      .move(CHART.left, CHART.top)
      .radius(6)
      .attr({ fill: '#ffffff', stroke: palette.reference, 'stroke-width': 1 });

    const timeGroup = s.group();
    const tickY = CHART.bottom - 10;
    const tickAttr = {
      fill: palette.reference,
      'font-size': '10px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    };
    const timeTicks = [
      timeGroup.text('').attr(tickAttr).amove(CHART_PLOT.left, tickY),
      timeGroup
        .text('')
        .attr(tickAttr)
        .amove((CHART_PLOT.left + CHART_PLOT.right) / 2, tickY),
      timeGroup.text('').attr(tickAttr).amove(CHART_PLOT.right, tickY),
    ];

    const axisAttr = (color: string, anchor: string) => ({
      fill: color,
      'font-size': '10px',
      'font-weight': 'bold',
      'text-anchor': anchor,
      'dominant-baseline': 'middle',
    });
    const vAxisTexts = [
      timeGroup
        .text('')
        .attr(axisAttr(palette.statusActive, 'end'))
        .amove(CHART_PLOT.left - 6, CHART_PLOT.top),
      timeGroup
        .text('0')
        .attr(axisAttr(palette.statusActive, 'end'))
        .amove(CHART_PLOT.left - 6, CHART_PLOT.bottom),
    ];
    const iAxisTexts = [
      timeGroup
        .text('')
        .attr(axisAttr(palette.current, 'start'))
        .amove(CHART_PLOT.right + 6, CHART_PLOT.top),
      timeGroup
        .text('0')
        .attr(axisAttr(palette.current, 'start'))
        .amove(CHART_PLOT.right + 6, CHART_PLOT.bottom),
    ];

    const vCurve = timeGroup.path('M0,0').attr({
      fill: rgba(palette.statusActive, 0.16),
      stroke: palette.statusActive,
      'stroke-width': 2,
    });
    const iCurve = timeGroup.path('M0,0').attr({
      fill: 'none',
      stroke: palette.current,
      'stroke-width': 1.6,
      'stroke-dasharray': '5 4',
    });
    const theoryCurve = timeGroup.path('M0,0').attr({
      fill: 'none',
      stroke: palette.reference,
      'stroke-width': 1.4,
      'stroke-dasharray': '6 4',
    });
    const cursor = timeGroup
      .line(CHART_PLOT.left, CHART_PLOT.top, CHART_PLOT.left, CHART_PLOT.bottom)
      .stroke({ color: palette.forceTension, width: 1.2, dasharray: '3 3' });

    const lineGroup = s.group().hide();
    lineGroup
      .line(CHART_PLOT.left, CHART_PLOT.bottom, CHART_PLOT.right, CHART_PLOT.top)
      .stroke({ color: palette.emf, width: 2 });
    const workPoint = lineGroup
      .circle(12)
      .center(CHART_PLOT.left, CHART_PLOT.bottom)
      .attr({ fill: palette.emf, stroke: '#ffffff', 'stroke-width': 2 });
    const lineXTicks = [
      lineGroup.text('').attr(tickAttr).amove(CHART_PLOT.left, tickY),
      lineGroup.text('').attr(tickAttr).amove(CHART_PLOT.right, tickY),
    ];
    const lineYTicks = [
      lineGroup
        .text('')
        .attr(axisAttr(palette.emf, 'end'))
        .amove(CHART_PLOT.left - 6, CHART_PLOT.top),
      lineGroup
        .text('0')
        .attr(axisAttr(palette.emf, 'end'))
        .amove(CHART_PLOT.left - 6, CHART_PLOT.bottom),
    ];

    s
      .text('轨道按总行程缩放，数值以数据面板为准')
      .attr({
        fill: palette.reference,
        'font-size': '11px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      })
      .amove(WIDTH / 2, RAIL_BOTTOM + 22);

    snapRef.current = {
      rod,
      rodTop,
      rodBottom,
      dots,
      vArrow,
      ampArrow,
      extArrow,
      timeGroup,
      lineGroup,
      timeTicks,
      vAxisTexts,
      iAxisTexts,
      vCurve,
      iCurve,
      theoryCurve,
      cursor,
      workPoint,
      lineXTicks,
      lineYTicks,
    };
  });

  useEffect(() => {
    const frame = sim.currentFrame;
    if (!frame) return;
    draw(frame, Math.min(sim.time, sim.maxTime));
  }, [sim.currentFrame, sim.time, sim.maxTime, draw]);

  const frame = sim.currentFrame;
  const lastFrame = sim.frames[sim.frames.length - 1];
  const ke = frame?.kinetic ?? 0;
  const heat = frame?.heat ?? 0;
  const xTotal = lastFrame?.x ?? 0;

  let energyScale = 0;
  let energyNote = '';
  if (params.mode === 'inertia') {
    energyScale = 0.5 * params.m * params.v0 * params.v0;
    energyNote = 'KE + Q = KE₀：机械能全部转化为焦耳热';
  } else if (params.mode === 'constant-force') {
    energyScale = (lastFrame?.kinetic ?? 0) + (lastFrame?.heat ?? 0);
    energyNote = 'KE + Q = W_外：外力做功转化为动能与焦耳热';
  } else {
    energyScale = (lastFrame?.kinetic ?? 0) + (lastFrame?.heat ?? 0);
    energyNote = '动能恒定，外力做功全部转化为焦耳热';
  }
  const kePct = energyScale > 0 ? clamp((ke / energyScale) * 100, 0, 100) : 0;
  const qPct = energyScale > 0 ? clamp((heat / energyScale) * 100, 0, 100) : 0;

  const speedLabel =
    params.mode === 'inertia'
      ? '初速度 v₀'
      : params.mode === 'constant-force'
        ? '收尾速度 v∞'
        : '拖动速度 v_target';

  const kpiItems: KpiItem[] = [
    { label: '电动势 ε = BLv', value: `${fmt(frame?.emf ?? 0)} V`, color: palette.emf },
    { label: '感应电流 I = ε/R', value: `${fmt(frame?.current ?? 0)} A`, color: palette.current },
    { label: '安培力 F_A = B²L²v/R', value: `${fmt(frame?.ampForce ?? 0)} N` },
    { label: '电功率 P = I²R', value: `${fmt(frame?.power ?? 0)} W` },
    { label: '累积焦耳热 Q', value: `${fmt(heat)} J` },
    { label: '速度 v', value: `${fmt(frame?.v ?? 0)} m/s` },
    { label: '位移 x', value: `${fmt(frame?.x ?? 0)} m` },
  ];

  const update = (patch: Partial<InductionParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  return (
    <DemoPage
      title={name}
      description={demo.description}
      reference={
        <>
          总行程 x_total = {fmt(xTotal)} m · 时间常数 τ = {fmtTime(tau)} · {speedLabel} ={' '}
          {fmt(charSpeed)} m/s
        </>
      }
      principles={
        <>
          <PrincipleCard title="核心原理">
            <span className="block">导体棒切割磁感线产生动生电动势 ε = BLv，回路电流 I = ε/R。</span>
            <span className="block">
              电流在磁场中受安培力 F_A = BIL = B²L²v/R，方向由楞次定律决定，总是阻碍相对运动。
            </span>
            <span className="block">
              能量关系 P_机 = P_电 = I²R，机械能（或外力做功）最终转化为焦耳热。
            </span>
          </PrincipleCard>
          <PrincipleCard title="三种驱动模式" variant="slate">
            <span className="block">惯性滑行：F_ext = 0，速度按 v = v₀e^(−t/τ) 指数衰减，τ = mR/(B²L²)。</span>
            <span className="block">恒力驱动：F_ext = F，速度趋近收尾速度 v∞ = FR/(B²L²)。</span>
            <span className="block">匀速拖动：外力与安培力等值反向，ε 与 v 成正比，图像为过原点直线。</span>
          </PrincipleCard>
        </>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <div className="absolute top-4 left-4 px-3 py-2 rounded bg-slate-100 text-sm font-bold text-slate-700">
            <span>t = {fmtTime(Math.min(sim.time, sim.maxTime))}</span>
            <span className="ml-3 text-xs font-medium text-slate-500">
              {MODES.find((m) => m.id === params.mode)?.label}
            </span>
          </div>
        </SimulationCanvas>
        <CanvasLegend
          items={[
            { label: '磁场 B（× 垂直纸面向里）', color: palette.field },
            { label: '感应电流 I', color: palette.current },
            { label: '速度 v', color: palette.statusActive },
            { label: '安培力 F_A', color: palette.forceComponent },
            { label: '电动势 ε / 外力 F_外', color: palette.emf },
          ]}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-3">
          <DemoControls
            isPlaying={sim.isRunning}
            onToggle={sim.toggle}
            onReset={sim.reset}
            hoverTip="点击自动演示，或用下方时间滑块逐帧观察电流方向与安培力的变化。"
          />

          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500">驱动模式</div>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant={params.mode === mode.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ mode: mode.id })}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          <ParamSlider
            label="时间 t"
            value={Math.min(sim.time, sim.maxTime)}
            min={0}
            max={Math.max(sim.maxTime, 1e-6)}
            step={timing.sampleDt}
            onValueChange={(value) => {
              sim.pause();
              sim.setTime(value);
            }}
            formatValue={fmtTime}
          />

          {params.mode === 'inertia' && (
            <ParamSlider
              label="初速度 v₀"
              value={params.v0}
              min={0.5}
              max={5}
              step={0.1}
              onValueChange={(value) => update({ v0: value })}
              formatValue={(value) => `${value.toFixed(1)} m/s`}
              helper="无外力，仅靠惯性滑行，安培力持续减速。"
            />
          )}
          {params.mode === 'constant-force' && (
            <ParamSlider
              label="恒定外力 F"
              value={params.force}
              min={0.05}
              max={1}
              step={0.05}
              onValueChange={(value) => update({ force: value })}
              formatValue={(value) => `${value.toFixed(2)} N`}
              helper={`收尾速度 v∞ = ${fmt(charSpeed)} m/s`}
            />
          )}
          {params.mode === 'constant-velocity' && (
            <ParamSlider
              label="拖动速度 v_target"
              value={params.vTarget}
              min={0.5}
              max={5}
              step={0.1}
              onValueChange={(value) => update({ vTarget: value })}
              formatValue={(value) => `${value.toFixed(1)} m/s`}
              helper={`所需外力 F_外 = ${fmt(
                (params.B * params.B * params.L * params.L * params.vTarget) / params.R,
              )} N`}
            />
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <ParamSlider
              label="磁场 B"
              value={params.B}
              min={0.4}
              max={1}
              step={0.05}
              onValueChange={(value) => update({ B: value })}
              formatValue={(value) => `${value.toFixed(2)} T`}
            />
            <ParamSlider
              label="间距 L"
              value={params.L}
              min={0.4}
              max={1}
              step={0.05}
              onValueChange={(value) => update({ L: value })}
              formatValue={(value) => `${value.toFixed(2)} m`}
            />
            <ParamSlider
              label="电阻 R"
              value={params.R}
              min={0.5}
              max={5}
              step={0.1}
              onValueChange={(value) => update({ R: value })}
              formatValue={(value) => `${value.toFixed(1)} Ω`}
            />
            <ParamSlider
              label="质量 m"
              value={params.m}
              min={0.1}
              max={2}
              step={0.1}
              onValueChange={(value) => update({ m: value })}
              formatValue={(value) => `${value.toFixed(1)} kg`}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500">预设场景</div>
            <div className="grid grid-cols-2 gap-2">
              {INDUCTION_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParams({ ...preset.params });
                    resetSim();
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500">能量分配</div>
            <div className="text-[11px] text-slate-500">{energyNote}</div>
            <div className="flex justify-between text-xs">
              <span>动能 KE</span>
              <span className="font-mono">{fmt(ke)} J</span>
            </div>
            <div className="h-2 bg-slate-200 rounded">
              <div
                className="h-2 rounded"
                style={{ width: `${kePct}%`, backgroundColor: palette.statusActive }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span>焦耳热 Q</span>
              <span className="font-mono">{fmt(heat)} J</span>
            </div>
            <div className="h-2 bg-slate-200 rounded">
              <div
                className="h-2 rounded"
                style={{ width: `${qPct}%`, backgroundColor: palette.current }}
              />
            </div>
          </div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default ElectromagneticInduction;