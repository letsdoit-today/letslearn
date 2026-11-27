import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Circle, Ellipse, Line, Path, Polygon, Rect, Text } from '@svgdotjs/svg.js';
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
  MAGNET_COIL_DEFAULT_PARAMS,
  MAGNET_COIL_PRESETS,
  fluxAt,
  inductanceOf,
  integrateMagnetCoil,
  magnetCoilTiming,
  oneWayFluxChange,
  peakEmf,
  peakFluxLinkage,
  peakTheta,
  tauL,
  totalCharge,
  totalHeat,
  type MagnetCoilFrame,
  type MagnetCoilParams,
  type MagnetPhase,
} from '@/lib/physics/magnetCoil';

const SLUG = 'magnet-coil-induction';
const demo = getDemoBySlug(SLUG);
const name = demo.name;
const description = demo.description;

const WIDTH = 800;
const HEIGHT = 500;

const AXIS_Y = 112;
const COIL_X = 400;
const TRAVEL_PX = 200;
const MAGNET_HALF = 33;
const MAGNET_HALF_H = 22;

const GALVO_X = 700;
const GALVO_Y = 104;
const GALVO_R = 44;

const ARROW_MAX = 78;
const IX = COIL_X - 46;
const CURVE_STRIDE = 4;

const CHART_A = { left: 84, right: 744, top: 232, bottom: 344 };
const CHART_B = { left: 84, right: 744, top: 360, bottom: 456 };

const A_PLOT = {
  left: CHART_A.left + 34,
  right: CHART_A.right - 14,
  top: CHART_A.top + 24,
  bottom: CHART_A.bottom - 22,
};
const B_PLOT = {
  left: CHART_B.left + 34,
  right: CHART_B.right - 14,
  top: CHART_B.top + 24,
  bottom: CHART_B.bottom - 22,
};

const PHASE_LABEL: Record<MagnetPhase, string> = {
  approach: '插入',
  hold: '停留',
  withdraw: '拔出',
  pass: '穿过',
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function fmt(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs !== 0 && abs < 0.001) return value.toExponential(2);
  if (abs >= 1000) return value.toFixed(0);
  return value.toFixed(digits);
}

function fmtTime(t: number): string {
  if (!Number.isFinite(t)) return '—';
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
  axis: Line;
  coil: Ellipse[];
  magnet: Rect;
  magnetSplit: Line;
  poleS: Text;
  poleN: Text;
  field: Path[];
  vArrow: ArrowEls;
  fArrow: ArrowEls;
  iArrow: ArrowEls;
  dial: Circle;
  dialTicks: Line[];
  needle: Line;
  pivot: Circle;
  dialLabel: Text;
  phaseText: Text;
  chartA: Rect;
  chartB: Rect;
  headA: Text;
  headB: Text;
  valueA: Text;
  valueB: Text;
  tickA: Text[];
  tickB: Text[];
  zeroA: Line;
  zeroB: Line;
  phiArea: Path;
  emfCurve: Path;
  ghostEmf: Path;
  thetaCurve: Path;
  ghostTheta: Path;
  cursorA: Line;
  cursorB: Line;
}

interface GhostSnapshot {
  frames: MagnetCoilFrame[];
  duration: number;
  motionDuration: number;
  v: number;
}

const MagnetCoilInduction: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SnapContext | null>(null);

  const [params, setParams] = useState<MagnetCoilParams>(MAGNET_COIL_DEFAULT_PARAMS);
  const [ghost, setGhost] = useState<GhostSnapshot | null>(null);
  const [showGhost, setShowGhost] = useState(true);

  const timing = useMemo(() => magnetCoilTiming(params), [params]);

  const sim = useSimulation<MagnetCoilFrame>(
    () => integrateMagnetCoil(params),
    [params],
    { dt: timing.sampleDt, loop: false },
  );

  const resetSim = sim.reset;
  const frames = sim.frames;

  const scales = useMemo(() => {
    const phiMax = Math.max(peakFluxLinkage(frames), 1e-12);
    const emfMax = Math.max(peakEmf(frames), ghost ? peakEmf(ghost.frames) : 0, 1e-9);
    const thetaMax = Math.max(peakTheta(frames), ghost ? peakTheta(ghost.frames) : 0, 1e-6);
    const iMax = Math.max(emfMax / params.R, 1e-12);
    const lorentzMax = Math.max(
      frames.reduce((max, f) => Math.max(max, Math.abs(f.lorentz)), 0),
      1e-12,
    );
    return { phiMax, emfMax, thetaMax, iMax, lorentzMax };
  }, [frames, ghost, params.R]);

  const draw = useCallback(
    (frame: MagnetCoilFrame, tNow: number) => {
      const ctx = snapRef.current;
      if (!ctx) return;

      const z0 = Math.max(params.z0, 1e-9);
      const mx = COIL_X + clamp(frame.z / z0, -1, 1) * TRAVEL_PX;

      ctx.magnet.center(mx, AXIS_Y);
      ctx.magnetSplit.plot(mx, AXIS_Y - MAGNET_HALF_H, mx, AXIS_Y + MAGNET_HALF_H);
      ctx.poleS.amove(mx - MAGNET_HALF / 2, AXIS_Y);
      ctx.poleN.amove(mx + MAGNET_HALF / 2, AXIS_Y);

      const fluxRatio = clamp(Math.abs(frame.phi) / Math.max(fluxAt(params, 0), 1e-12), 0, 1);
      const edge = mx < COIL_X ? mx + MAGNET_HALF : mx - MAGNET_HALF;
      const offsets = [-1, -0.55, 0.55, 1];
      ctx.field.forEach((path, k) => {
        const off = offsets[k];
        const y0 = AXIS_Y + off * 22;
        const y1 = AXIS_Y + off * 30;
        const ctrlX = (edge + COIL_X) / 2;
        const ctrlY = AXIS_Y + off * 46;
        path
          .plot(`M${edge.toFixed(2)},${y0.toFixed(2)} Q${ctrlX.toFixed(2)},${ctrlY.toFixed(
            2,
          )} ${COIL_X.toFixed(2)},${y1.toFixed(2)}`)
          .attr({ opacity: 0.12 + 0.5 * fluxRatio });
      });

      const placeH = (
        els: ArrowEls,
        fromX: number,
        y: number,
        dir: number,
        length: number,
        label: string,
      ) => {
        if (length < 6 || dir === 0) {
          els.line.hide();
          els.head.hide();
          els.label.hide();
          return;
        }
        els.line.show();
        els.head.show();
        els.label.show();
        const tip: [number, number] = [fromX + dir * length, y];
        els.line.plot(fromX, y, tip[0], tip[1]);
        els.head.plot(headPoints(tip, [fromX, y]));
        els.label.text(label).amove(clamp(tip[0] + dir * 12, 24, WIDTH - 24), clamp(y - 14, 24, HEIGHT - 24));
      };

      const placeV = (
        els: ArrowEls,
        x: number,
        fromY: number,
        dir: number,
        length: number,
        label: string,
      ) => {
        if (length < 6 || dir === 0) {
          els.line.hide();
          els.head.hide();
          els.label.hide();
          return;
        }
        els.line.show();
        els.head.show();
        els.label.show();
        const tip: [number, number] = [x, fromY - dir * length];
        els.line.plot(x, fromY, tip[0], tip[1]);
        els.head.plot(headPoints(tip, [x, fromY]));
        els.label.text(label).amove(clamp(x + 14, 24, WIDTH - 24), clamp((fromY + tip[1]) / 2, 24, HEIGHT - 24));
      };

      const vDir = frame.v > 1e-9 ? 1 : frame.v < -1e-9 ? -1 : 0;
      const vLen = clamp(Math.abs(frame.v) / Math.max(params.v, 1e-9), 0, 1) * ARROW_MAX;
      placeH(ctx.vArrow, mx, AXIS_Y - 56, vDir, vLen, 'v');

      const fDir = frame.lorentz > 1e-12 ? 1 : frame.lorentz < -1e-12 ? -1 : 0;
      const fLen = clamp(Math.abs(frame.lorentz) / scales.lorentzMax, 0, 1) * ARROW_MAX;
      placeH(ctx.fArrow, mx, AXIS_Y + 70, fDir, fLen, 'F楞次');

      const iDir = frame.current > 1e-12 ? 1 : frame.current < -1e-12 ? -1 : 0;
      const iLen = clamp(Math.abs(frame.current) / scales.iMax, 0, 1) * 62;
      placeV(ctx.iArrow, IX, AXIS_Y + 34, iDir, iLen, 'I');

      const needleAngle = clamp(frame.theta, -1.15, 1.15);
      const tipX = GALVO_X + Math.sin(needleAngle) * (GALVO_R - 10);
      const tipY = GALVO_Y - Math.cos(needleAngle) * (GALVO_R - 10);
      ctx.needle.plot(GALVO_X, GALVO_Y, tipX, tipY);

      ctx.phaseText.text(
        `${PHASE_LABEL[frame.phase]} · z = ${fmt(frame.z * 100, 1)} cm`,
      );

      const spanA = Math.max(timing.motionDuration, ghost?.motionDuration ?? 0, 1e-9);
      const spanB = Math.max(timing.duration, ghost?.duration ?? 0, 1e-9);
      const plotX = (t: number) =>
        A_PLOT.left + (clamp(t, 0, spanA) / spanA) * (A_PLOT.right - A_PLOT.left);
      const plotXB = (t: number) =>
        B_PLOT.left + (clamp(t, 0, spanB) / spanB) * (B_PLOT.right - B_PLOT.left);

      const midA = (A_PLOT.top + A_PLOT.bottom) / 2;
      const midB = (B_PLOT.top + B_PLOT.bottom) / 2;
      const yPhi = (phi: number) =>
        A_PLOT.bottom - clamp(phi / scales.phiMax, 0, 1) * (A_PLOT.bottom - A_PLOT.top);
      const yEmf = (emf: number) =>
        midA - clamp(emf / scales.emfMax, -1, 1) * ((A_PLOT.bottom - A_PLOT.top) / 2);
      const yTheta = (theta: number) =>
        midB - clamp(theta / scales.thetaMax, -1, 1) * ((B_PLOT.bottom - B_PLOT.top) / 2);

      const tNowClamped = clamp(tNow, 0, timing.duration);
      const tNowA = Math.min(tNowClamped, spanA);

      const buildCurrent = (
        ratio: (f: MagnetCoilFrame) => number,
        xOf: (t: number) => number,
        tLimit: number,
      ): [number, number][] => {
        const pts: [number, number][] = [];
        for (let i = 0; i < frames.length; i += CURVE_STRIDE) {
          const f = frames[i];
          if (f.t > tLimit) break;
          pts.push([xOf(f.t), ratio(f)]);
        }
        const lastIdx = clamp(Math.round(tLimit / timing.sampleDt), 0, frames.length - 1);
        const lastFrame = frames[lastIdx];
        if (lastFrame && lastFrame.t <= tLimit + 1e-9) {
          const point: [number, number] = [xOf(lastFrame.t), ratio(lastFrame)];
          const prev = pts[pts.length - 1];
          if (!prev || prev[0] < point[0] - 0.01) pts.push(point);
        }
        return pts;
      };

      const buildGhost = (
        ratio: (f: MagnetCoilFrame) => number,
        xOf: (t: number) => number,
        tLimit: number,
      ): [number, number][] => {
        if (!ghost) return [];
        const pts: [number, number][] = [];
        for (let i = 0; i < ghost.frames.length; i += CURVE_STRIDE) {
          const f = ghost.frames[i];
          if (f.t > tLimit) break;
          pts.push([xOf(f.t), ratio(f)]);
        }
        return pts;
      };

      const phiPts = buildCurrent((f) => yPhi(f.phi), plotX, tNowA);
      const emfPts = buildCurrent((f) => yEmf(f.emf), plotX, tNowA);
      const thetaPts = buildCurrent((f) => yTheta(f.theta), plotXB, tNowClamped);
      const ghostEmfPts = showGhost
        ? buildGhost((f) => yEmf(f.emf), plotX, ghost?.motionDuration ?? 0)
        : [];
      const ghostThetaPts = showGhost
        ? buildGhost((f) => yTheta(f.theta), plotXB, ghost?.duration ?? 0)
        : [];

      if (phiPts.length < 2) {
        ctx.phiArea.hide();
        ctx.emfCurve.hide();
        ctx.thetaCurve.hide();
      } else {
        ctx.phiArea.show().plot(areaPath(phiPts, A_PLOT.bottom));
        ctx.emfCurve.show().plot(polylinePath(emfPts));
        ctx.thetaCurve.show().plot(polylinePath(thetaPts));
      }

      if (ghostEmfPts.length > 1) {
        ctx.ghostEmf.show().plot(polylinePath(ghostEmfPts));
      } else {
        ctx.ghostEmf.hide();
      }
      if (ghostThetaPts.length > 1) {
        ctx.ghostTheta.show().plot(polylinePath(ghostThetaPts));
      } else {
        ctx.ghostTheta.hide();
      }

      const tickXsA = [A_PLOT.left, (A_PLOT.left + A_PLOT.right) / 2, A_PLOT.right];
      const tickYsA = CHART_A.bottom - 8;
      ctx.tickA[0].text('0').amove(tickXsA[0], tickYsA);
      ctx.tickA[1].text(fmtTime(spanA / 2)).amove(tickXsA[1], tickYsA);
      ctx.tickA[2].text(fmtTime(spanA)).amove(tickXsA[2], tickYsA);

      const tickXsB = [B_PLOT.left, (B_PLOT.left + B_PLOT.right) / 2, B_PLOT.right];
      const tickYsB = CHART_B.bottom - 8;
      ctx.tickB[0].text('0').amove(tickXsB[0], tickYsB);
      ctx.tickB[1].text(fmtTime(spanB / 2)).amove(tickXsB[1], tickYsB);
      ctx.tickB[2].text(fmtTime(spanB)).amove(tickXsB[2], tickYsB);

      ctx.valueA.text(
        `Φmax ${fmt(scales.phiMax * 1e3, 2)} mWb · εmax ${fmt(scales.emfMax * 1e3, 1)} mV`,
      );
      ctx.valueB.text(`θmax ${fmt((scales.thetaMax * 180) / Math.PI, 0)}°`);

      const cxA = plotX(tNowA);
      const cxB = plotXB(tNowClamped);
      ctx.cursorA.plot(cxA, A_PLOT.top, cxA, A_PLOT.bottom);
      ctx.cursorB.plot(cxB, B_PLOT.top, cxB, B_PLOT.bottom);
    },
    [params, timing, frames, ghost, showGhost, scales],
  );

  useSVGScene(svgRef, (s) => {
    const axis = s
      .line(150, AXIS_Y, 650, AXIS_Y)
      .stroke({ color: palette.reference, width: 1.2, dasharray: '4 4' });

    const coil: Ellipse[] = [];
    for (let k = -2; k <= 2; k += 1) {
      coil.push(
        s
          .ellipse(20, 88)
          .center(COIL_X + k * 9, AXIS_Y)
          .attr({ fill: 'none', stroke: palette.objectStroke, 'stroke-width': 2.4 }),
      );
    }

    const field: Path[] = [];
    for (let k = 0; k < 4; k += 1) {
      field.push(
        s.path('M0,0').attr({
          fill: 'none',
          stroke: palette.field,
          'stroke-width': 1.6,
          'stroke-dasharray': '5 4',
          opacity: 0.3,
        }),
      );
    }

    const magnet = s
      .rect(MAGNET_HALF * 2, MAGNET_HALF_H * 2)
      .center(COIL_X, AXIS_Y)
      .radius(3)
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 2 });
    const magnetSplit = s
      .line(COIL_X, AXIS_Y - MAGNET_HALF_H, COIL_X, AXIS_Y + MAGNET_HALF_H)
      .stroke({ color: '#ffffff', width: 1.5, opacity: 0.6 });
    const poleAttr = {
      fill: '#ffffff',
      'font-size': '14px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    };
    const poleS = s.text('S').attr(poleAttr).amove(COIL_X - MAGNET_HALF / 2, AXIS_Y);
    const poleN = s.text('N').attr(poleAttr).amove(COIL_X + MAGNET_HALF / 2, AXIS_Y);

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
    const fArrow = createArrow(palette.forceComponent);
    const iArrow = createArrow(palette.current);

    const dial = s
      .circle(GALVO_R * 2)
      .center(GALVO_X, GALVO_Y)
      .attr({ fill: '#ffffff', stroke: palette.objectStroke, 'stroke-width': 3 });
    const dialTicks: Line[] = [];
    for (let k = -3; k <= 3; k += 1) {
      const angle = (k * 20 * Math.PI) / 180;
      const r0 = GALVO_R - 12;
      const r1 = GALVO_R - 4;
      dialTicks.push(
        s
          .line(
            GALVO_X + Math.sin(angle) * r0,
            GALVO_Y - Math.cos(angle) * r0,
            GALVO_X + Math.sin(angle) * r1,
            GALVO_Y - Math.cos(angle) * r1,
          )
          .stroke({ color: palette.reference, width: 1.4 }),
      );
    }
    const needle = s
      .line(GALVO_X, GALVO_Y, GALVO_X, GALVO_Y - (GALVO_R - 10))
      .stroke({ color: palette.current, width: 2.6, linecap: 'round' });
    const pivot = s
      .circle(7)
      .center(GALVO_X, GALVO_Y)
      .attr({ fill: palette.objectStroke });
    const dialLabel = s
      .text('G')
      .attr({
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      })
      .amove(GALVO_X, GALVO_Y + GALVO_R + 14);

    const phaseText = s
      .text('')
      .attr({
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
      })
      .amove(96, 46);

    const chartA = s
      .rect(CHART_A.right - CHART_A.left, CHART_A.bottom - CHART_A.top)
      .move(CHART_A.left, CHART_A.top)
      .radius(6)
      .attr({ fill: '#ffffff', stroke: palette.reference, 'stroke-width': 1 });
    const chartB = s
      .rect(CHART_B.right - CHART_B.left, CHART_B.bottom - CHART_B.top)
      .move(CHART_B.left, CHART_B.top)
      .radius(6)
      .attr({ fill: '#ffffff', stroke: palette.reference, 'stroke-width': 1 });

    const headAttr = {
      fill: palette.canvasText,
      'font-size': '12px',
      'font-weight': 'bold',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
    };
    const valueAttr = {
      fill: palette.reference,
      'font-size': '11px',
      'font-weight': 'bold',
      'text-anchor': 'end',
      'dominant-baseline': 'middle',
    };
    const headA = s.text('磁通量 Φ(t) 与电动势 ε(t)').attr(headAttr).amove(CHART_A.left + 10, CHART_A.top + 12);
    const headB = s.text('冲击电流计指针偏角 θ(t)').attr(headAttr).amove(CHART_B.left + 10, CHART_B.top + 12);
    const valueA = s.text('').attr(valueAttr).amove(CHART_A.right - 10, CHART_A.top + 12);
    const valueB = s.text('').attr(valueAttr).amove(CHART_B.right - 10, CHART_B.top + 12);

    const tickAttr = {
      fill: palette.reference,
      'font-size': '10px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    };
    const tickA = [
      s.text('0').attr(tickAttr).amove(A_PLOT.left, CHART_A.bottom - 8),
      s.text('').attr(tickAttr).amove((A_PLOT.left + A_PLOT.right) / 2, CHART_A.bottom - 8),
      s.text('').attr(tickAttr).amove(A_PLOT.right, CHART_A.bottom - 8),
    ];
    const tickB = [
      s.text('0').attr(tickAttr).amove(B_PLOT.left, CHART_B.bottom - 8),
      s.text('').attr(tickAttr).amove((B_PLOT.left + B_PLOT.right) / 2, CHART_B.bottom - 8),
      s.text('').attr(tickAttr).amove(B_PLOT.right, CHART_B.bottom - 8),
    ];

    const zeroA = s
      .line(A_PLOT.left, (A_PLOT.top + A_PLOT.bottom) / 2, A_PLOT.right, (A_PLOT.top + A_PLOT.bottom) / 2)
      .stroke({ color: palette.reference, width: 1, dasharray: '3 3' });
    const zeroB = s
      .line(B_PLOT.left, (B_PLOT.top + B_PLOT.bottom) / 2, B_PLOT.right, (B_PLOT.top + B_PLOT.bottom) / 2)
      .stroke({ color: palette.reference, width: 1, dasharray: '3 3' });

    const phiArea = s.path('M0,0').attr({
      fill: rgba(palette.field, 0.14),
      stroke: palette.field,
      'stroke-width': 1.6,
    });
    const emfCurve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.emf,
      'stroke-width': 2,
    });
    const ghostEmf = s
      .path('M0,0')
      .attr({
        fill: 'none',
        stroke: palette.emf,
        'stroke-width': 1.4,
        'stroke-dasharray': '5 4',
        opacity: 0.4,
      })
      .hide();
    const thetaCurve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.current,
      'stroke-width': 2,
    });
    const ghostTheta = s
      .path('M0,0')
      .attr({
        fill: 'none',
        stroke: palette.current,
        'stroke-width': 1.4,
        'stroke-dasharray': '5 4',
        opacity: 0.4,
      })
      .hide();

    const cursorA = s
      .line(A_PLOT.left, A_PLOT.top, A_PLOT.left, A_PLOT.bottom)
      .stroke({ color: palette.forceTension, width: 1.2, dasharray: '3 3' });
    const cursorB = s
      .line(B_PLOT.left, B_PLOT.top, B_PLOT.left, B_PLOT.bottom)
      .stroke({ color: palette.forceTension, width: 1.2, dasharray: '3 3' });

    snapRef.current = {
      axis,
      coil,
      magnet,
      magnetSplit,
      poleS,
      poleN,
      field,
      vArrow,
      fArrow,
      iArrow,
      dial,
      dialTicks,
      needle,
      pivot,
      dialLabel,
      phaseText,
      chartA,
      chartB,
      headA,
      headB,
      valueA,
      valueB,
      tickA,
      tickB,
      zeroA,
      zeroB,
      phiArea,
      emfCurve,
      ghostEmf,
      thetaCurve,
      ghostTheta,
      cursorA,
      cursorB,
    };
  });

  useEffect(() => {
    const frame = sim.currentFrame;
    if (!frame) return;
    draw(frame, Math.min(sim.time, sim.maxTime));
  }, [sim.currentFrame, sim.time, sim.maxTime, draw]);

  const frame = sim.currentFrame;

  const captureGhost = () => {
    setGhost({
      frames,
      duration: sim.maxTime,
      motionDuration: timing.motionDuration,
      v: params.v,
    });
  };

  const update = (patch: Partial<MagnetCoilParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const inductance = inductanceOf(params);
  const tau = tauL(params);
  const oneWay = oneWayFluxChange(params);
  const travelTime = timing.travelTime;

  const kpiItems: KpiItem[] = [
    {
      label: '磁通量 Φ',
      value: `${fmt((frame?.phi ?? 0) * 1e3, 3)} mWb`,
      color: palette.field,
    },
    {
      label: '电动势 ε',
      value: `${fmt((frame?.emf ?? 0) * 1e3, 1)} mV`,
      color: palette.emf,
    },
    {
      label: '感应电流 I',
      value: `${fmt((frame?.current ?? 0) * 1e3, 1)} mA`,
      color: palette.current,
    },
    {
      label: '指针偏角 θ',
      value: `${fmt(((frame?.theta ?? 0) * 180) / Math.PI, 1)}°`,
      color: palette.statusActive,
    },
    {
      label: '累计电荷 q',
      value: `${fmt((frame?.charge ?? 0) * 1e3, 3)} mC`,
    },
  ];

  return (
    <DemoPage
      title={name}
      description={description}
      reference={
        <>
          N = {params.N} 匝 · a = {fmt(params.a * 100, 1)} cm · R = {fmt(params.R, 1)} Ω · m ={' '}
          {fmt(params.moment, 2)} A·m² · 单程磁链 NΔΦ = {fmt(params.N * oneWay * 1e3, 2)} mWb · 焦耳热
          Q_total = {fmt(totalHeat(frames) * 1e3, 2)} mJ · L ≈ {fmt(inductance * 1e3, 2)} mH · τ_L = L/R ≈{' '}
          {fmt(tau * 1e3, 2)} ms ≪ 穿越时间 {fmtTime(travelTime)}，故按准静态处理
        </>
      }
      principles={
        <>
          <PrincipleCard title="法拉第定律与楞次定律">
            <span className="block">磁铁在线圈轴线上距中心 z 时，磁通量 Φ = μ0·m·a² / (2·(a²+z²)^(3/2))。</span>
            <span className="block">
              感应电动势由磁通量变化率决定：ε = −N·dΦ/dt，回路电流 I = ε/R。
            </span>
            <span className="block">
              楞次力 F = −(N·dΦ/dz)²·v/R，方向恒与磁铁运动方向相反，外力做功最终转化为焦耳热。
            </span>
          </PrincipleCard>
          <PrincipleCard title="两个反直觉结论" variant="slate">
            <span className="block">
              磁铁静止在线圈中心时磁通量最大，但 dΦ/dt = 0，电动势与电流都为零。
            </span>
            <span className="block">
              |dΦ/dz| 在 z = a/2 处取极大，所以 ε 的峰值出现在磁铁尚未到达中心的位置。
            </span>
            <span className="block">
              同一行程累计电荷 q = N·|ΔΦ|/R 与快慢无关；速度只改变 ε 与 I 的峰值。
            </span>
            <span className="block">
              指针为欠阻尼二阶系统（固有周期 2.5 s、阻尼比 0.1）。单次插入脉冲约 0.5 s，约为周期的五分之一，故峰值偏角近似正比于该段累计电荷；脉冲结束后指针围绕零位回摆，衰减时间约十余秒，演示窗口只截取前段。线圈自感远小于穿越时间，故按准静态处理。
            </span>
          </PrincipleCard>
        </>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
        <CanvasLegend
          items={[
            { label: '磁场线', color: palette.field },
            { label: '感应电流 I', color: palette.current },
            { label: '速度 v', color: palette.statusActive },
            { label: '楞次力 F', color: palette.forceComponent },
            { label: '电动势 ε', color: palette.emf },
          ]}
          note={ghost && showGhost ? `虚线为上一档速度 ${fmt(ghost.v, 2)} m/s` : undefined}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-3">
          <DemoControls
            isPlaying={sim.isRunning}
            onToggle={sim.toggle}
            onReset={sim.reset}
            hoverTip="点击自动演示：磁铁插入 → 停留 → 拔出 → 停留，观察停留阶段电动势归零。"
          />

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

          <ParamSlider
            label="磁铁速度 v"
            value={params.v}
            min={0.2}
            max={0.6}
            step={0.05}
            onValueChange={(value) => {
              captureGhost();
              update({ v: value });
            }}
            formatValue={(value) => `${value.toFixed(2)} m/s`}
            helper={`穿越时间 ${fmtTime(timing.travelTime)}，累计电荷不随速度改变`}
          />

          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <ParamSlider
              label="匝数 N"
              value={params.N}
              min={100}
              max={300}
              step={10}
              onValueChange={(value) => update({ N: value })}
              formatValue={(value) => `${value.toFixed(0)} 匝`}
            />
            <ParamSlider
              label="半径 a"
              value={params.a}
              min={0.01}
              max={0.04}
              step={0.005}
              onValueChange={(value) => update({ a: value })}
              formatValue={(value) => `${(value * 100).toFixed(1)} cm`}
            />
            <ParamSlider
              label="电阻 R"
              value={params.R}
              min={1}
              max={5}
              step={0.5}
              onValueChange={(value) => update({ R: value })}
              formatValue={(value) => `${value.toFixed(1)} Ω`}
            />
            <ParamSlider
              label="停留时长"
              value={params.holdTime}
              min={0.1}
              max={0.8}
              step={0.05}
              onValueChange={(value) => update({ holdTime: value })}
              formatValue={(value) => `${value.toFixed(2)} s`}
              disabled={params.mode === 'pass-through'}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500">预设场景</div>
            <div className="grid grid-cols-2 gap-2">
              {MAGNET_COIL_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    captureGhost();
                    setParams({ ...preset.params });
                    resetSim();
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {ghost ? (
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-500">速度对照</div>
              <Button
                variant={showGhost ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => setShowGhost((prev) => !prev)}
              >
                {showGhost ? '隐藏' : '显示'}上一档曲线（{fmt(ghost.v, 2)} m/s）
              </Button>
            </div>
          ) : null}

          <div className="text-[11px] leading-relaxed text-slate-500">
            峰值电流 {fmt((peakEmf(frames) / params.R) * 1e3, 1)} mA · 累计电荷（插入 + 拔出合计）{' '}
            {fmt(totalCharge(frames) * 1e3, 3)} mC
          </div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default MagnetCoilInduction;