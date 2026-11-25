import { useCallback, useEffect, useRef, useState } from 'react';
import type { G, Line, Path, Polygon, Text } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { Button } from '@/components/ui/button';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { CanvasLegend } from '@/components/demo/CanvasLegend';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import Demos, { siteUrl } from '@/lib/Meta';
import { palette } from '@/lib/palette';
import {
  LEVER_DEFAULT_PARAMS,
  LEVER_PRESETS,
  computeLever,
  type LeverParams,
} from '@/lib/physics/lever';

const name = '杠杆力矩实验';

const WIDTH = 800;
const HEIGHT = 500;
const PIVOT_X = 400;
const PIVOT_Y = 260;
const BEAM_HALF = 280;
const BEAM_THICK = 12;
const GROUND_Y = 400;
const PX_PER_M = 180;
const ARROW_SCALE = 2.4;

const LABEL_LIMIT_X = 360;
const LABEL_LIMIT_Y = 225;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const DEG = Math.PI / 180;

interface SideEls {
  actionLine: Path;
  armLine: Path;
  armTickA: Path;
  armTickB: Path;
  rightAngle: Path;
  arrowLine: Line;
  arrowHead: Polygon;
  forceLabel: Text;
  armLabel: Text;
}

interface ArcEls {
  arc: Path;
  head: Polygon;
  label: Text;
}

interface SnapContext {
  assembly: G;
  left: SideEls;
  right: SideEls;
  arcLeft: ArcEls;
  arcRight: ArcEls;
}

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  n = 28,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i += 1) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function polylinePath(pts: [number, number][]): string {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(' ');
}

function headPoints(
  tip: [number, number],
  from: [number, number],
  size = 11,
  half = 5.5,
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

const LeverBalance: React.FC = () => {
  useSEO({
    title: `${name} - 力学物理演示 | Physics Learn`,
    description: Demos.find((demo) => demo.name === name)?.description || '',
    keywords: '杠杆力矩,力臂,力矩平衡,杠杆原理,物理力学',
    canonical: `${siteUrl}${Demos.find((demo) => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-lever-balance.jpg`,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SnapContext | null>(null);
  const paramsRef = useRef<LeverParams>(LEVER_DEFAULT_PARAMS);
  const tiltRef = useRef(0);

  const [params, setParams] = useState<LeverParams>(LEVER_DEFAULT_PARAMS);

  const draw = useCallback(() => {
    const ctx = snapRef.current;
    if (!ctx) return;

    const p = paramsRef.current;
    const st = computeLever(p);
    const tilt = tiltRef.current;

    ctx.assembly.transform(new Matrix().rotate(tilt).translate(PIVOT_X, PIVOT_Y));

    const renderSide = (
      els: SideEls,
      sign: number,
      force: number,
      length: number,
      thetaDeg: number,
      forceName: string,
      armValue: number,
    ) => {
      const lp = length * PX_PER_M;
      const th = thetaDeg * DEG;
      const cos = Math.cos(th);
      const sin = Math.sin(th);

      const px = sign * lp;
      const ux = sign * cos;
      const uy = sin;

      const fx = sign * lp * sin * sin;
      const fy = -lp * sin * cos;
      const armLen = lp * sin;
      const arrowLen = force * ARROW_SCALE;

      els.actionLine.plot(
        `M${(px - ux * 60).toFixed(2)},${(-uy * 60).toFixed(2)} ` +
          `L${(px + ux * (arrowLen + 24)).toFixed(2)},${(uy * (arrowLen + 24)).toFixed(2)}`,
      );

      els.armLine.plot(`M0,0 L${fx.toFixed(2)},${fy.toFixed(2)}`);

      const adx = armLen > 1e-6 ? fx / armLen : sign;
      const ady = armLen > 1e-6 ? fy / armLen : 0;
      const tick = 7;
      els.armTickA.plot(
        `M${(-ady * tick).toFixed(2)},${(adx * tick).toFixed(2)} ` +
          `L${(ady * tick).toFixed(2)},${(-adx * tick).toFixed(2)}`,
      );
      els.armTickB.plot(
        `M${(fx - ady * tick).toFixed(2)},${(fy + adx * tick).toFixed(2)} ` +
          `L${(fx + ady * tick).toFixed(2)},${(fy - adx * tick).toFixed(2)}`,
      );

      if (armLen >= 16) {
        const sz = 9;
        const p1x = fx - adx * sz;
        const p1y = fy - ady * sz;
        const p2x = p1x + ux * sz;
        const p2y = p1y + uy * sz;
        const p3x = fx + ux * sz;
        const p3y = fy + uy * sz;
        els.rightAngle.plot(
          `M${p1x.toFixed(2)},${p1y.toFixed(2)} ` +
            `L${p2x.toFixed(2)},${p2y.toFixed(2)} ` +
            `L${p3x.toFixed(2)},${p3y.toFixed(2)}`,
        );
        els.rightAngle.show();
      } else {
        els.rightAngle.hide();
      }

      const tipX = px + ux * arrowLen;
      const tipY = uy * arrowLen;
      els.arrowLine.plot(px, 0, tipX, tipY);
      els.arrowHead.plot(headPoints([tipX, tipY], [px, 0]));

      els.forceLabel
        .text(forceName)
        .move(
          clamp(tipX + ux * 22, -LABEL_LIMIT_X, LABEL_LIMIT_X),
          clamp(tipY + uy * 22, -LABEL_LIMIT_Y, LABEL_LIMIT_Y),
        );
      els.armLabel
        .text(`L′ ${armValue.toFixed(2)} m`)
        .move(fx / 2, fy / 2 - 16);
    };

    renderSide(ctx.left, -1, p.f1, p.l1, p.theta1, 'F1', st.arm1);
    renderSide(ctx.right, 1, p.f2, p.l2, p.theta2, 'F2', st.arm2);

    const renderArc = (els: ArcEls, moment: number, sign: number) => {
      const a0 = sign > 0 ? 345 : 195;
      const a1 = sign > 0 ? 395 : 145;
      const pts = arcPoints(PIVOT_X, PIVOT_Y, 46, a0, a1);
      els.arc.plot(polylinePath(pts));
      els.head.plot(headPoints(pts[pts.length - 1], pts[pts.length - 2], 10, 5.5));
      els.label
        .text(`M${sign > 0 ? '2' : '1'} ${moment.toFixed(1)}`)
        .move(PIVOT_X + (sign > 0 ? 84 : -84), PIVOT_Y + 58);
    };

    renderArc(ctx.arcLeft, st.m1, -1);
    renderArc(ctx.arcRight, st.m2, 1);
  }, []);

  useSVGScene(svgRef, (s) => {
    s.line(90, GROUND_Y, WIDTH - 90, GROUND_Y).stroke({
      color: palette.objectStroke,
      width: 4,
      linecap: 'round',
    });

    s.polygon([
      [PIVOT_X, PIVOT_Y],
      [PIVOT_X - 58, GROUND_Y],
      [PIVOT_X + 58, GROUND_Y],
    ])
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 2 });

    const assembly = s.group();

    const beam = s
      .rect(BEAM_HALF * 2, BEAM_THICK)
      .move(-BEAM_HALF, -BEAM_THICK)
      .radius(BEAM_THICK / 2)
      .attr({ fill: palette.plank, stroke: palette.plankStroke, 'stroke-width': 1.6 });
    assembly.add(beam);

    const createSide = (): SideEls => {
      const actionLine = s.path('M0,0').attr({
        fill: 'none',
        stroke: palette.reference,
        'stroke-width': 1,
        'stroke-dasharray': '4 4',
      });
      const armLine = s.path('M0,0').attr({
        fill: 'none',
        stroke: palette.forceComponent,
        'stroke-width': 2,
        'stroke-dasharray': '7 4',
      });
      const armTickA = s
        .path('M0,0')
        .attr({ fill: 'none', stroke: palette.forceComponent, 'stroke-width': 2 });
      const armTickB = s
        .path('M0,0')
        .attr({ fill: 'none', stroke: palette.forceComponent, 'stroke-width': 2 });
      const rightAngle = s
        .path('M0,0')
        .attr({ fill: 'none', stroke: palette.forceComponent, 'stroke-width': 1.5 });
      const arrowLine = s.line(0, 0, 0, 0);
      const arrowHead = s.polygon('0,0 0,0 0,0');
      const forceLabel = s.text('').attr({
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      const armLabel = s.text('').attr({
        fill: palette.forceComponent,
        'font-size': '12px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      return {
        actionLine,
        armLine,
        armTickA,
        armTickB,
        rightAngle,
        arrowLine,
        arrowHead,
        forceLabel,
        armLabel,
      };
    };

    const left = createSide();
    left.arrowLine.stroke({ color: palette.forceGravity, width: 2.5 });
    left.arrowHead.fill(palette.forceGravity);
    left.forceLabel.fill(palette.forceGravity);
    assembly.add(left.actionLine).add(left.armLine);
    assembly.add(left.armTickA).add(left.armTickB).add(left.rightAngle);
    assembly.add(left.arrowLine).add(left.arrowHead).add(left.forceLabel).add(left.armLabel);

    const right = createSide();
    right.arrowLine.stroke({ color: palette.forceBuoyancy, width: 2.5 });
    right.arrowHead.fill(palette.forceBuoyancy);
    right.forceLabel.fill(palette.forceBuoyancy);
    assembly.add(right.actionLine).add(right.armLine);
    assembly.add(right.armTickA).add(right.armTickB).add(right.rightAngle);
    assembly.add(right.arrowLine).add(right.arrowHead).add(right.forceLabel).add(right.armLabel);

    const createArc = (): ArcEls => {
      const arc = s
        .path('M0,0')
        .attr({ fill: 'none', stroke: palette.statusActive, 'stroke-width': 2 });
      const head = s.polygon('0,0 0,0 0,0').fill(palette.statusActive);
      const label = s.text('').attr({
        fill: palette.statusActive,
        'font-size': '12px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      return { arc, head, label };
    };

    const arcLeft = createArc();
    const arcRight = createArc();

    s.circle(12)
      .center(PIVOT_X, PIVOT_Y)
      .attr({ fill: palette.canvasBg, stroke: palette.objectStroke, 'stroke-width': 2 });

    s.text('O')
      .move(PIVOT_X, PIVOT_Y + 34)
      .attr({
        fill: palette.canvasBg,
        'font-size': '14px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });

    snapRef.current = { assembly, left, right, arcLeft, arcRight };
  });

  useEffect(() => {
    paramsRef.current = params;

    let rafId = 0;
    const step = () => {
      const target = computeLever(paramsRef.current).tiltDeg;
      const cur = tiltRef.current;
      const next = cur + (target - cur) * 0.15;
      const settled = Math.abs(target - next) < 0.05;
      tiltRef.current = settled ? target : next;
      draw();
      if (!settled) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [params, draw]);

  const state = computeLever(params);

  const update = (patch: Partial<LeverParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const statusText = state.balanced
    ? '杠杆平衡'
    : state.net > 0
      ? '右侧下沉'
      : '左侧下沉';

  const kpiItems: KpiItem[] = [
    { label: '有效力臂 L1′', value: `${state.arm1.toFixed(2)} m`, color: palette.forceComponent },
    { label: '有效力臂 L2′', value: `${state.arm2.toFixed(2)} m`, color: palette.forceComponent },
    { label: '左侧力矩 M1', value: `${state.m1.toFixed(1)} N·m`, color: palette.forceGravity },
    { label: '右侧力矩 M2', value: `${state.m2.toFixed(1)} N·m`, color: palette.forceBuoyancy },
    {
      label: '力矩差 ΔM',
      value: `${state.net > 0 ? '+' : ''}${state.net.toFixed(1)} N·m`,
    },
  ];

  return (
    <DemoPage
      title={name}
      description={Demos.find((demo) => demo.name === name)?.description || ''}
      principles={
        <>
          <PrincipleCard title="力矩与力臂">
            力矩 M = F · L′，描述力使杠杆转动的效果。L′ 是支点到
            <strong>力的作用线</strong>的垂直距离（力臂），而不是支点到力作用点的距离。
          </PrincipleCard>
          <PrincipleCard title="斜向施力为何费力">
            当力与横梁夹角为 θ 时，有效力臂收缩为 L′ = L · sinθ。θ 越小力臂越短、力矩越小，
            所以垂直施力（θ = 90°）效率最高。
          </PrincipleCard>
          <PrincipleCard title="杠杆平衡条件">
            F1 · L1′ = F2 · L2′ 时杠杆平衡。力臂大的一侧省力，力臂小的一侧费力，等臂则不省力也不费力。
            图中横梁倾角只是趋势示意，力矩数值才是判据。
          </PrincipleCard>
        </>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <div
            className={`absolute top-4 left-4 px-3 py-2 rounded text-sm font-bold ${
              state.balanced ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}
          >
            {statusText}
          </div>
        </SimulationCanvas>
        <CanvasLegend
          items={[
            { label: '力臂 L′', color: palette.forceComponent },
            { label: '作用力 F1', color: palette.forceGravity },
            { label: '作用力 F2', color: palette.forceBuoyancy },
            { label: '力矩 M', color: palette.statusActive },
          ]}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">参数调节</h3>
          <div className="space-y-3">
            <ParamSlider
              label="左侧作用力 F1"
              value={params.f1}
              min={10}
              max={50}
              step={1}
              onValueChange={(v) => update({ f1: v })}
              formatValue={(v) => `${v} N`}
            />
            <ParamSlider
              label="左侧力臂 L1"
              value={params.l1}
              min={0.1}
              max={1.4}
              step={0.05}
              onValueChange={(v) => update({ l1: v })}
              formatValue={(v) => `${v.toFixed(2)} m`}
            />
            <ParamSlider
              label="左侧施力角 θ1"
              value={params.theta1}
              min={30}
              max={90}
              step={5}
              onValueChange={(v) => update({ theta1: v })}
              formatValue={(v) => `${v}°`}
            />
            <ParamSlider
              label="右侧作用力 F2"
              value={params.f2}
              min={10}
              max={50}
              step={1}
              onValueChange={(v) => update({ f2: v })}
              formatValue={(v) => `${v} N`}
            />
            <ParamSlider
              label="右侧力臂 L2"
              value={params.l2}
              min={0.1}
              max={1.4}
              step={0.05}
              onValueChange={(v) => update({ l2: v })}
              formatValue={(v) => `${v.toFixed(2)} m`}
            />
            <ParamSlider
              label="右侧施力角 θ2"
              value={params.theta2}
              min={30}
              max={90}
              step={5}
              onValueChange={(v) => update({ theta2: v })}
              formatValue={(v) => `${v}°`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">预设场景</h3>
          <div className="grid grid-cols-2 gap-2">
            {LEVER_PRESETS.map((preset) => (
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
              onClick={() => setParams(LEVER_DEFAULT_PARAMS)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg">杠杆类型</h3>
          <div className="text-sm text-muted-foreground">{state.leverType}</div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default LeverBalance;