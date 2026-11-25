import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Circle, Line, Path, Polygon, Text } from '@svgdotjs/svg.js';
import { RotateCcw } from 'lucide-react';
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
import Demos, { siteUrl } from '@/lib/Meta';
import { palette } from '@/lib/palette';
import {
  PENDULUM_DEFAULT_PARAMS,
  PENDULUM_DURATION,
  PENDULUM_PRESETS,
  SMALL_THETA0_DEG,
  forces,
  harmonicRatio,
  integrate,
  periodInfo,
  type PendulumFrame,
  type PendulumParams,
} from '@/lib/physics/pendulum';

const name = '单摆/简谐振动实验';

const WIDTH = 800;
const HEIGHT = 500;
const CEIL_Y = 60;
const SMALL_PIVOT_X = 250;
const BIG_PIVOT_X = 550;
const PX_PER_M = 150;
const MG_ARROW_PX = 48;
const SMALL_BALL_R = 9;
const BIG_BALL_R = 11;
const SAMPLE_DT = 0.01;

const CHART = { left: 90, right: 760, top: 280, bottom: 470 };
const CHART_ZERO_Y = 375;
const CHART_HALF_H = 80;
const CURVE_STRIDE = 4;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

interface ArrowEls {
  line: Line;
  head: Polygon;
  label: Text;
}

interface SnapContext {
  smallString: Line;
  smallBall: Circle;
  bigString: Line;
  bigBall: Circle;
  gravity: ArrowEls;
  tension: ArrowEls;
  tangential: ArrowEls;
  smallLabel: Text;
  bigLabel: Text;
  smallCurve: Path;
  bigCurve: Path;
  harmonicCurve: Path;
  cursor: Line;
}

function polylinePath(pts: [number, number][]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(' ');
}

function headPoints(
  tip: [number, number],
  from: [number, number],
  size = 10,
  half = 5,
): string {
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

const PendulumOscillation: React.FC = () => {
  useSEO({
    title: `${name} - 力学物理演示 | Physics Learn`,
    description: Demos.find((demo) => demo.name === name)?.description || '',
    keywords: '单摆,简谐振动,等时性,周期公式,sinθ近似,物理力学',
    canonical: `${siteUrl}${Demos.find((demo) => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-pendulum-oscillation.jpg`,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SnapContext | null>(null);
  const [params, setParams] = useState<PendulumParams>(PENDULUM_DEFAULT_PARAMS);

  const sim = useSimulation<PendulumFrame>(
    () =>
      integrate(params, {
        duration: PENDULUM_DURATION,
        sampleDt: SAMPLE_DT,
        stepDt: 0.005,
      }),
    [params],
    { dt: SAMPLE_DT, loop: true },
  );

  const smallFrames = useMemo(
    () =>
      integrate(
        { length: params.length, mass: params.mass, theta0Deg: SMALL_THETA0_DEG },
        { duration: PENDULUM_DURATION, sampleDt: SAMPLE_DT, stepDt: 0.005 },
      ),
    [params.length, params.mass],
  );

  const draw = useCallback(
    (bigFrame: PendulumFrame, smallFrame: PendulumFrame, tNow: number) => {
      const ctx = snapRef.current;
      if (!ctx) return;

      const p = params;
      const lp = p.length * PX_PER_M;

      const sx = SMALL_PIVOT_X + lp * Math.sin(smallFrame.theta);
      const sy = CEIL_Y + lp * Math.cos(smallFrame.theta);
      ctx.smallString.plot(SMALL_PIVOT_X, CEIL_Y, sx, sy);
      ctx.smallBall.center(sx, sy);

      const bx = BIG_PIVOT_X + lp * Math.sin(bigFrame.theta);
      const by = CEIL_Y + lp * Math.cos(bigFrame.theta);
      ctx.bigString.plot(BIG_PIVOT_X, CEIL_Y, bx, by);
      ctx.bigBall.center(bx, by);

      const sin = Math.sin(bigFrame.theta);
      const cos = Math.cos(bigFrame.theta);
      const f = forces(p, bigFrame.theta, bigFrame.omega);
      const from: [number, number] = [bx, by];
      const pxPerN = MG_ARROW_PX / f.gravity;

      const drawArrow = (
        els: ArrowEls,
        dir: [number, number],
        magnitudePx: number,
        text: string,
        offset: [number, number],
      ) => {
        if (magnitudePx < 6) {
          els.line.hide();
          els.head.hide();
          els.label.hide();
          return;
        }
        els.line.show();
        els.head.show();
        els.label.show();

        const tip: [number, number] = [
          from[0] + dir[0] * magnitudePx,
          from[1] + dir[1] * magnitudePx,
        ];
        els.line.plot(from[0], from[1], tip[0], tip[1]);
        els.head.plot(headPoints(tip, from));
        els.label
          .text(text)
          .amove(
            clamp(tip[0] + offset[0], 26, WIDTH - 26),
            clamp(tip[1] + offset[1], 26, HEIGHT - 26),
          );
      };

      drawArrow(ctx.gravity, [0, 1], f.gravity * pxPerN, 'mg', [16, 4]);
      drawArrow(ctx.tension, [-sin, -cos], Math.max(0, f.tension) * pxPerN, 'T', [14, -10]);

      const sgn = bigFrame.theta > 0 ? 1 : bigFrame.theta < 0 ? -1 : 0;
      drawArrow(
        ctx.tangential,
        [-sgn * cos, sgn * sin],
        Math.abs(f.tangential) * pxPerN,
        'F切',
        [12, 12],
      );

      ctx.smallLabel.text(`小角度 θ₀ = ${SMALL_THETA0_DEG}°`);
      ctx.bigLabel.text(`大角度 θ₀ = ${p.theta0Deg}°`);

      const plotX = (t: number) =>
        CHART.left + 12 + (t / PENDULUM_DURATION) * (CHART.right - CHART.left - 24);
      const plotY = (ratio: number) =>
        CHART_ZERO_Y - clamp(ratio, -1, 1) * CHART_HALF_H;

      const buildCurve = (frames: PendulumFrame[], theta0: number, tMax: number) => {
        const pts: [number, number][] = [];
        for (let i = 0; i < frames.length; i += CURVE_STRIDE) {
          if (frames[i].t > tMax) break;
          pts.push([plotX(frames[i].t), plotY(frames[i].theta / theta0)]);
        }
        const last = frames[Math.min(frames.length - 1, Math.floor(tMax / SAMPLE_DT))];
        if (last && last.t <= tMax) {
          pts.push([plotX(last.t), plotY(last.theta / theta0)]);
        }
        return pts;
      };

      const buildHarmonic = (tMax: number) => {
        const pts: [number, number][] = [];
        for (let t = 0; t <= tMax; t += 0.04) {
          pts.push([plotX(t), plotY(harmonicRatio(p.length, t))]);
        }
        pts.push([plotX(tMax), plotY(harmonicRatio(p.length, tMax))]);
        return pts;
      };

      if (tNow < 0.02) {
        ctx.smallCurve.hide();
        ctx.bigCurve.hide();
        ctx.harmonicCurve.hide();
      } else {
        ctx.smallCurve.show();
        ctx.bigCurve.show();
        ctx.harmonicCurve.show();
        ctx.smallCurve.plot(polylinePath(buildCurve(smallFrames, SMALL_THETA0_DEG * (Math.PI / 180), tNow)));
        ctx.bigCurve.plot(polylinePath(buildCurve(sim.frames, p.theta0Deg * (Math.PI / 180), tNow)));
        ctx.harmonicCurve.plot(polylinePath(buildHarmonic(tNow)));
      }

      const cx = plotX(tNow);
      ctx.cursor.plot(cx, CHART.top, cx, CHART.bottom);
    },
    [params, smallFrames, sim.frames],
  );

  useSVGScene(svgRef, (s) => {
    s.line(140, CEIL_Y, 660, CEIL_Y).stroke({
      color: palette.objectStroke,
      width: 6,
      linecap: 'round',
    });

    s.circle(8)
      .center(SMALL_PIVOT_X, CEIL_Y)
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 1.5 });
    s.circle(8)
      .center(BIG_PIVOT_X, CEIL_Y)
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 1.5 });

    s.rect(CHART.right - CHART.left, CHART.bottom - CHART.top)
      .move(CHART.left, CHART.top)
      .radius(6)
      .attr({ fill: '#ffffff', stroke: palette.reference, 'stroke-width': 1 });

    s.line(CHART.left, CHART_ZERO_Y, CHART.right, CHART_ZERO_Y).stroke({
      color: palette.reference,
      width: 1,
      dasharray: '4 4',
    });

    const axis = (text: string, y: number) => {
      s.text(text)
        .attr({
          fill: palette.reference,
          'font-size': '11px',
          'font-weight': 'bold',
          'text-anchor': 'end',
          'dominant-baseline': 'middle',
        })
        .amove(CHART.left - 12, y);
    };
    axis('+1', CHART_ZERO_Y - CHART_HALF_H);
    axis('0', CHART_ZERO_Y);
    axis('-1', CHART_ZERO_Y + CHART_HALF_H);

    const smallCurve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.canvasText,
      'stroke-width': 2,
    });
    const bigCurve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.statusActive,
      'stroke-width': 2,
    });
    const harmonicCurve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.reference,
      'stroke-width': 1.6,
      'stroke-dasharray': '6 4',
    });

    const smallString = s.line(SMALL_PIVOT_X, CEIL_Y, SMALL_PIVOT_X, CEIL_Y + 100).stroke({
      color: palette.canvasText,
      width: 1.5,
    });
    const bigString = s.line(BIG_PIVOT_X, CEIL_Y, BIG_PIVOT_X, CEIL_Y + 100).stroke({
      color: palette.canvasText,
      width: 1.5,
    });

    const smallBall = s
      .circle(SMALL_BALL_R * 2)
      .center(SMALL_PIVOT_X, CEIL_Y + 100)
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 2 });
    const bigBall = s
      .circle(BIG_BALL_R * 2)
      .center(BIG_PIVOT_X, CEIL_Y + 100)
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 2 });

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

    const gravity = createArrow(palette.forceGravity);
    const tension = createArrow(palette.forceTension);
    const tangential = createArrow(palette.forceComponent);

    const label = (x: number, text: string) =>
      s
        .text(text)
        .attr({
          fill: palette.canvasText,
          'font-size': '12px',
          'font-weight': 'bold',
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
        })
        .amove(x, 40);

    const smallLabel = label(SMALL_PIVOT_X, '');
    const bigLabel = label(BIG_PIVOT_X, '');

    const legend = (x: number, color: string, dashed: boolean, text: string) => {
      const sample = s.line(x, 484, x + 22, 484).stroke({ color, width: 2 });
      if (dashed) sample.attr('stroke-dasharray', '6 4');
      s.text(text)
        .attr({
          fill: color,
          'font-size': '11px',
          'font-weight': 'bold',
          'dominant-baseline': 'middle',
        })
        .amove(x + 28, 484);
    };
    legend(170, palette.canvasText, false, '小摆 θ/θ₀');
    legend(330, palette.statusActive, false, '大摆 θ/θ₀');
    legend(480, palette.reference, true, '简谐近似 cos(ω₀t)');

    const cursor = s.line(CHART.left, CHART.top, CHART.left, CHART.bottom).stroke({
      color: palette.forceTension,
      width: 1.5,
      dasharray: '3 3',
    });

    snapRef.current = {
      smallString,
      smallBall,
      bigString,
      bigBall,
      gravity,
      tension,
      tangential,
      smallLabel,
      bigLabel,
      smallCurve,
      bigCurve,
      harmonicCurve,
      cursor,
    };
  });

  useEffect(() => {
    const bigFrame = sim.currentFrame;
    if (!bigFrame) return;
    const idx = clamp(Math.round(sim.time / SAMPLE_DT), 0, smallFrames.length - 1);
    draw(bigFrame, smallFrames[idx], sim.time);
  }, [sim.currentFrame, sim.time, smallFrames, draw]);

  const period = periodInfo(params.length, params.theta0Deg);
  const bigFrame = sim.currentFrame;

  const ke = bigFrame?.kinetic ?? 0;
  const pe = bigFrame?.potential ?? 0;
  const totalEnergy = bigFrame?.total ?? 0;
  const kePct = totalEnergy > 0 ? (ke / totalEnergy) * 100 : 0;
  const pePct = totalEnergy > 0 ? (pe / totalEnergy) * 100 : 0;

  const update = (patch: Partial<PendulumParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const kpiItems: KpiItem[] = [
    { label: '简谐周期 T₀ = 2π√(L/g)', value: `${period.t0.toFixed(3)} s` },
    {
      label: '精确周期 T（椭圆积分）',
      value: `${period.exact.toFixed(3)} s`,
      color: palette.statusActive,
    },
    {
      label: '相对偏差 (T − T₀)/T₀',
      value: `${period.deviation >= 0 ? '+' : ''}${(period.deviation * 100).toFixed(1)}%`,
    },
    { label: '每周期滞后', value: `${(period.lagPerPeriod * 1000).toFixed(0)} ms` },
  ];

  return (
    <DemoPage
      title={name}
      description={Demos.find((demo) => demo.name === name)?.description || ''}
      principles={
        <>
          <PrincipleCard title="周期公式">
            T = 2π√(L/g)。周期只由摆长 L 和重力加速度 g 决定，
            <strong>与摆球质量无关</strong>，小角度下也近似与振幅无关。
          </PrincipleCard>
          <PrincipleCard title="等时性只在 θ 小时成立">
            简谐近似 sinθ ≈ θ 仅在小角度下成立。θ₀ 越大，精确周期越长：
            60° 时慢 7.3%，每周期滞后约 0.15 s，几个周期后两摆就明显错拍。
          </PrincipleCard>
          <PrincipleCard title="能量守恒">
            摆球只受重力和绳张力，张力始终垂直于速度方向、不做功，因此机械能守恒。
            最低点动能最大、势能为零，最高点动能最小、势能最大。
          </PrincipleCard>
          <PrincipleCard title="张力随位置变化" variant="slate">
            T = mg cosθ + mv²/L。最低点 cosθ = 1 且速度最大，张力达到峰值；越靠近最高点张力越小。
          </PrincipleCard>
        </>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <div className="absolute top-4 left-4 px-3 py-2 rounded bg-slate-100 text-sm font-bold text-slate-700">
            t = {sim.time.toFixed(2)} s
          </div>
        </SimulationCanvas>
        <CanvasLegend
          items={[
            { label: '重力 mg', color: palette.forceGravity },
            { label: '绳张力 T', color: palette.forceTension },
            { label: '切向回复力 −mg sinθ', color: palette.forceComponent },
          ]}
          note="箭头长度以 mg 归一化，仅表示相对大小"
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实验控制</h3>
          <DemoControls
            isPlaying={sim.isRunning}
            onToggle={sim.toggle}
            onReset={sim.reset}
            hoverTip={
              <>
                点击自动演示。两摆同时释放，几秒后开始错拍。
                <p className="font-bold">也可以拖动下方时间轴</p>观察任意时刻。
              </>
            }
          />

          <div className="space-y-3">
            <ParamSlider
              label="摆长 L"
              value={params.length}
              min={0.4}
              max={1.0}
              step={0.05}
              onValueChange={(v) => update({ length: v })}
              formatValue={(v) => `${v.toFixed(2)} m`}
            />
            <ParamSlider
              label="摆球质量 m"
              value={params.mass}
              min={0.1}
              max={2.0}
              step={0.1}
              onValueChange={(v) => update({ mass: v })}
              formatValue={(v) => `${v.toFixed(1)} kg`}
              helper={
                <p className="text-xs text-muted-foreground">
                  质量不进入 T = 2π√(L/g)，拖动它摆的运动完全不变。
                </p>
              }
            />
            <ParamSlider
              label="大摆释放角 θ₀"
              value={params.theta0Deg}
              min={20}
              max={60}
              step={5}
              onValueChange={(v) => update({ theta0Deg: v })}
              formatValue={(v) => `${v}°`}
              helper={
                <p className="text-xs text-muted-foreground">
                  上限 60°：90° 释放瞬间张力为零，绳会松弛，模型失效。
                </p>
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">预设场景</h3>
          <div className="grid grid-cols-2 gap-2">
            {PENDULUM_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => setParams(preset.params)}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="col-span-2"
              onClick={() => setParams(PENDULUM_DEFAULT_PARAMS)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">能量转化</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>动能 KE</span>
              <span className="font-mono">{ke.toFixed(2)} J</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>重力势能 PE</span>
              <span className="font-mono">{pe.toFixed(2)} J</span>
            </div>
            <div className="h-4 w-full rounded bg-slate-100 overflow-hidden flex">
              <div
                className="h-full"
                style={{ width: `${kePct}%`, backgroundColor: palette.statusActive }}
              />
              <div
                className="h-full"
                style={{ width: `${pePct}%`, backgroundColor: palette.forceBuoyancy }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              总机械能 E = {totalEnergy.toFixed(2)} J 恒定，动能与势能只在两者间来回转化。
            </p>
          </div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default PendulumOscillation;