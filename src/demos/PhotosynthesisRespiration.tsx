import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Circle, Line, Polygon, Text } from '@svgdotjs/svg.js';
import { useSEO } from '@/hooks/useSEO';
import { useSimulation } from '@/hooks/useSimulation';
import { useSVGScene } from '@/hooks/useSVGScene';
import { Button } from '@/components/ui/button';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { CanvasLegend } from '@/components/demo/CanvasLegend';
import { DemoMain } from '@/components/demo/DemoMain';
import { DemoControls } from '@/components/demo/DemoControls';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette, rgba } from '@/lib/palette';
import {
  BALANCE_EPS,
  DAY_START,
  FRAME_COUNT,
  FRAME_DT,
  RESPIRATION,
  buildDayCycle,
  formatTime,
  frameIndexAt,
  netDirection,
  photoRate,
  type RateFrame,
} from '@/lib/bio/photosynthesis';

const SLUG = 'photosynthesis-respiration';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const WIDTH = 800;
const HEIGHT = 500;

const CELL = { x: 60, y: 36, w: 680, h: 246 };
const CHLORO = { cx: 250, cy: 160, rx: 88, ry: 56 };
const MITO = { cx: 540, cy: 160, rx: 78, ry: 46 };

const CHART = { left: 110, right: 760, top: 340, bottom: 452 };
const RATE_MAX = 30;

const CO2_X = 220;
const O2_X = 560;
const ARROW_MIN = 8;
const ARROW_EXTRA = 20;
const MAX_NET = photoRate(100) - RESPIRATION;

const PARTICLE_COUNT = 3;

const FLOWS = [
  { y: 138, fromX: 344, toX: 456, color: palette.bioOrganic, label: '有机物', speed: 0.4 },
  { y: 160, fromX: 456, toX: 344, color: palette.bioGasCo2, label: 'CO₂', speed: 0.32 },
  { y: 182, fromX: 456, toX: 344, color: palette.bioGasCo2, label: 'H₂O', speed: 0.28 },
] as const;

const NOON = 12;
const DUSK = 18;

interface SceneEls {
  co2Line: Line;
  co2Head: Polygon;
  o2Line: Line;
  o2Head: Polygon;
  balanceMark: Text;
  particles: Circle[][];
  workDot: Circle;
  workLine: Line;
  workLabel: Text;
}

function plotX(light: number): number {
  return CHART.left + (light / 100) * (CHART.right - CHART.left);
}

function plotY(rate: number): number {
  return CHART.bottom - (rate / RATE_MAX) * (CHART.bottom - CHART.top);
}

function hHead(x: number, y: number, dir: 1 | -1, size = 7): string {
  return `${x},${y} ${x - dir * size},${y - 4} ${x - dir * size},${y + 4}`;
}

function vHead(x: number, y: number, dirDown: 1 | -1, size = 7): string {
  return `${x},${y} ${x - 4},${y - dirDown * size} ${x + 4},${y - dirDown * size}`;
}

function curvePath(fromLight: number, toLight: number, sample: (light: number) => number): string {
  const steps = 50;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const light = fromLight + ((toLight - fromLight) * i) / steps;
    pts.push(`${plotX(light).toFixed(1)},${plotY(sample(light)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

const PhotosynthesisRespiration: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SceneEls | null>(null);

  const cycle = useMemo(() => buildDayCycle(), []);
  const sim = useSimulation<RateFrame>(() => cycle.frames, [cycle], {
    dt: FRAME_DT,
    loop: true,
  });

  const frame = sim.currentFrame ?? cycle.frames[0];

  useEffect(() => {
    sim.setTime(DAY_START);
  }, [sim.setTime]);

  const draw = useCallback((f: RateFrame) => {
    const ctx = snapRef.current;
    if (!ctx) return;

    const direction = netDirection(f.net);
    if (direction === 'balanced') {
      ctx.co2Line.hide();
      ctx.co2Head.hide();
      ctx.o2Line.hide();
      ctx.o2Head.hide();
      ctx.balanceMark.show();
    } else {
      ctx.balanceMark.hide();
      ctx.co2Line.show();
      ctx.co2Head.show();
      ctx.o2Line.show();
      ctx.o2Head.show();

      const len = ARROW_MIN + (Math.min(Math.abs(f.net), MAX_NET) / MAX_NET) * ARROW_EXTRA;
      const top = CELL.y;
      if (direction === 'absorb') {
        ctx.co2Line.plot(CO2_X, top - len, CO2_X, top);
        ctx.co2Head.plot(vHead(CO2_X, top, 1));
        ctx.o2Line.plot(O2_X, top, O2_X, top - len);
        ctx.o2Head.plot(vHead(O2_X, top - len, -1));
      } else {
        ctx.co2Line.plot(CO2_X, top, CO2_X, top - len);
        ctx.co2Head.plot(vHead(CO2_X, top - len, -1));
        ctx.o2Line.plot(O2_X, top - len, O2_X, top);
        ctx.o2Head.plot(vHead(O2_X, top, 1));
      }
    }

    FLOWS.forEach((flow, flowIndex) => {
      ctx.particles[flowIndex].forEach((dot, dotIndex) => {
        const phase = (f.t * flow.speed + dotIndex / PARTICLE_COUNT) % 1;
        dot.center(flow.fromX + (flow.toX - flow.fromX) * phase, flow.y);
      });
    });

    const px = plotX(f.light);
    const py = plotY(f.photo);
    ctx.workDot.center(px, py);
    ctx.workLine.plot(px, py, px, CHART.bottom);
    const labelX = Math.min(Math.max(px, CHART.left + 26), CHART.right - 26);
    const labelY = Math.max(py - 12, CHART.top + 8);
    ctx.workLabel.text(`P ${f.photo.toFixed(2)}`).attr({ x: labelX, y: labelY });
  }, []);

  useSVGScene(svgRef, (s) => {
    s.rect(CELL.w, CELL.h)
      .move(CELL.x, CELL.y)
      .radius(46)
      .attr({
        fill: rgba(palette.bioChloroplast, 0.05),
        stroke: palette.bioGasCo2,
        'stroke-width': 3,
      });

    s.rect(CELL.w - 16, CELL.h - 16)
      .move(CELL.x + 8, CELL.y + 8)
      .radius(38)
      .attr({ fill: 'none', stroke: palette.reference, 'stroke-width': 1.5 });

    s.text('叶肉细胞')
      .attr({
        fill: palette.canvasText,
        'font-size': '11px',
        'font-weight': 'bold',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
        x: CELL.x + 16,
        y: CELL.y + 22,
      });

    s.text('细胞膜')
      .attr({
        fill: palette.canvasText,
        'font-size': '10px',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
        x: CELL.x + 16,
        y: CELL.y + 38,
      });

    s.ellipse(CHLORO.rx * 2, CHLORO.ry * 2)
      .center(CHLORO.cx, CHLORO.cy)
      .attr({
        fill: rgba(palette.bioChloroplast, 0.16),
        stroke: palette.bioChloroplast,
        'stroke-width': 2,
      });

    s.text('叶绿体')
      .attr({
        fill: palette.bioChloroplast,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: CHLORO.cx,
        y: CHLORO.cy - 12,
      });

    s.text('（光合作用）')
      .attr({
        fill: palette.bioChloroplast,
        'font-size': '11px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: CHLORO.cx,
        y: CHLORO.cy + 8,
      });

    s.ellipse(MITO.rx * 2, MITO.ry * 2)
      .center(MITO.cx, MITO.cy)
      .attr({
        fill: rgba(palette.bioMitochondrion, 0.16),
        stroke: palette.bioMitochondrion,
        'stroke-width': 2,
      });

    s.text('线粒体')
      .attr({
        fill: palette.bioMitochondrion,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: MITO.cx,
        y: MITO.cy - 10,
      });

    s.text('（呼吸作用）')
      .attr({
        fill: palette.bioMitochondrion,
        'font-size': '11px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: MITO.cx,
        y: MITO.cy + 10,
      });

    FLOWS.forEach((flow) => {
      const dir: 1 | -1 = flow.toX > flow.fromX ? 1 : -1;
      s.line(flow.fromX, flow.y, flow.toX, flow.y).stroke({
        color: flow.color,
        width: 2,
        linecap: 'round',
      });
      s.polygon(hHead(flow.toX, flow.y, dir)).fill(flow.color);
      s.text(flow.label)
        .attr({
          fill: flow.color,
          'font-size': '10px',
          'font-weight': 'bold',
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          x: (flow.fromX + flow.toX) / 2,
          y: flow.y - 11,
        });
    });

    s.text('CO₂')
      .attr({
        fill: palette.bioGasCo2,
        'font-size': '11px',
        'font-weight': 'bold',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        x: CO2_X - 10,
        y: 18,
      });

    s.text('O₂')
      .attr({
        fill: palette.bioGasO2,
        'font-size': '11px',
        'font-weight': 'bold',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        x: O2_X - 10,
        y: 18,
      });

    const co2Line = s.line(0, 0, 0, 0).stroke({
      color: palette.bioGasCo2,
      width: 2.5,
      linecap: 'round',
    });
    const co2Head = s.polygon('0,0 0,0 0,0').fill(palette.bioGasCo2);
    const o2Line = s.line(0, 0, 0, 0).stroke({
      color: palette.bioGasO2,
      width: 2.5,
      linecap: 'round',
    });
    const o2Head = s.polygon('0,0 0,0 0,0').fill(palette.bioGasO2);

    const balanceMark = s
      .text('收支平衡')
      .attr({
        fill: palette.canvasText,
        'font-size': '12px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: 400,
        y: 18,
      })
      .hide();

    s.line(CHART.left, CHART.bottom, CHART.right, CHART.bottom).stroke({
      color: palette.objectStroke,
      width: 1.5,
    });
    s.line(CHART.left, CHART.bottom, CHART.left, CHART.top).stroke({
      color: palette.objectStroke,
      width: 1.5,
    });

    [0, 10, 20, 30].forEach((rate) => {
      const y = plotY(rate);
      s.line(CHART.left - 4, y, CHART.left, y).stroke({ color: palette.objectStroke, width: 1 });
      s.text(String(rate)).attr({
        fill: palette.canvasText,
        'font-size': '10px',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        x: CHART.left - 8,
        y,
      });
    });

    [0, 20, 40, 60, 80, 100].forEach((light) => {
      const x = plotX(light);
      s.line(x, CHART.bottom, x, CHART.bottom + 4).stroke({
        color: palette.objectStroke,
        width: 1,
      });
      s.text(String(light)).attr({
        fill: palette.canvasText,
        'font-size': '10px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x,
        y: CHART.bottom + 13,
      });
    });

    s.text('速率（相对单位）')
      .attr({
        fill: palette.canvasText,
        'font-size': '10px',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
        x: CHART.left - 14,
        y: CHART.top - 12,
      });

    s.text('光照强度 L（%）')
      .attr({
        fill: palette.canvasText,
        'font-size': '10px',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        x: CHART.right,
        y: CHART.bottom + 30,
      });

    s.line(plotX(0), plotY(RESPIRATION), plotX(100), plotY(RESPIRATION)).stroke({
      color: palette.bioMitochondrion,
      width: 2,
      dasharray: '6 4',
    });

    s.path(curvePath(cycle.compensationLight, 100, (light) => photoRate(light) - RESPIRATION))
      .attr({ fill: 'none', stroke: palette.objectStroke, 'stroke-width': 2 });

    s.path(curvePath(0, 100, (light) => photoRate(light)))
      .attr({ fill: 'none', stroke: palette.bioChloroplast, 'stroke-width': 2.5 });

    const compX = plotX(cycle.compensationLight);
    s.line(compX, CHART.top, compX, CHART.bottom).stroke({
      color: palette.reference,
      width: 1,
      dasharray: '4 4',
    });
    s.polygon(`${compX},${CHART.bottom} ${compX - 4},${CHART.bottom + 6} ${compX + 4},${CHART.bottom + 6}`)
      .fill(palette.reference);

    s.text(
      `光补偿点 L≈${cycle.compensationLight.toFixed(1)}% · ${formatTime(
        cycle.compensationTimes[0],
      )} / ${formatTime(cycle.compensationTimes[1])}`,
    ).attr({
      fill: palette.canvasText,
      'font-size': '10px',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
      x: CHART.left,
      y: CHART.bottom + 30,
    });

    const particles = FLOWS.map((flow) =>
      Array.from({ length: PARTICLE_COUNT }, () =>
        s
          .circle(7)
          .center(flow.fromX, flow.y)
          .attr({ fill: flow.color }),
      ),
    );

    const workLine = s.line(0, 0, 0, 0).stroke({
      color: palette.bioChloroplast,
      width: 1.2,
      dasharray: '3 3',
    });
    const workDot = s.circle(10).center(0, 0).attr({ fill: palette.bioChloroplast });
    const workLabel = s.text('').attr({
      fill: palette.bioChloroplast,
      'font-size': '10px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });

    snapRef.current = {
      co2Line,
      co2Head,
      o2Line,
      o2Head,
      balanceMark,
      particles,
      workDot,
      workLine,
      workLabel,
    };
  });

  useEffect(() => {
    draw(frame);
  }, [frame, draw]);

  const direction = netDirection(frame.net);
  const directionLabel =
    direction === 'absorb' ? '净吸收 CO₂' : direction === 'release' ? '净释放 CO₂' : '收支平衡';
  const directionColor =
    direction === 'absorb'
      ? palette.bioChloroplast
      : direction === 'release'
        ? palette.bioMitochondrion
        : palette.canvasText;

  const netValue = Math.abs(frame.net) < BALANCE_EPS ? 0 : frame.net;

  const kpiItems: KpiItem[] = [
    { label: '时刻', value: formatTime(frame.t) },
    { label: '光照强度', value: `${frame.light.toFixed(1)}%`, color: palette.ray },
    {
      label: '光合速率',
      value: frame.photo.toFixed(2),
      color: palette.bioChloroplast,
    },
    {
      label: '净速率 N = P − R',
      value: `${netValue > 0 ? '+' : ''}${netValue.toFixed(2)}`,
      color: palette.objectStroke,
    },
    { label: '净流向', value: directionLabel, color: directionColor },
  ];

  const frameIndex = frameIndexAt(cycle, sim.time);

  const jumpTo = (t: number) => {
    sim.pause();
    sim.setTime(t);
  };

  const handleReset = () => {
    sim.pause();
    sim.setTime(DAY_START);
  };

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="光合作用：场所与反应式">
            光合作用在<strong>叶绿体</strong>中进行，需要光照：叶绿体利用光能，把二氧化碳和水合成有机物（储存能量），
            同时释放氧气。没有光照，光合作用就无法进行。
          </PrincipleCard>
          <PrincipleCard title="呼吸作用：场所与反应式">
            呼吸作用主要在<strong>线粒体</strong>中进行：有机物在氧气的参与下被分解为二氧化碳和水，同时释放能量。
            它<strong>昼夜不停</strong>，光照强弱不会改变它的速率。
          </PrincipleCard>
          <PrincipleCard title="光补偿点">
            当光合速率恰好等于呼吸速率时，净速率为零，细胞与外界没有净气体交换，此时的光照强度叫<strong>光补偿点</strong>。
            本模型中它约为 9%，对应清晨 06:21 与傍晚 17:39 前后。
          </PrincipleCard>
          <PrincipleCard title="两者的区别与联系" variant="slate">
            两个过程在同一细胞内<strong>同时进行、方向相反</strong>：光合作用合成有机物、吸收二氧化碳、释放氧气，
            呼吸作用分解有机物、释放二氧化碳、消耗氧气。净速率大于零时细胞净吸收二氧化碳，小于零时净释放二氧化碳。
          </PrincipleCard>
        </>
      }
      reference={`光合作用在叶绿体中进行且需要光照；呼吸作用在线粒体中进行且昼夜不停；呼吸速率全程恒为 ${RESPIRATION.toFixed(
        1,
      )}，不随光照强度改变。`}
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
        <CanvasLegend
          items={[
            { label: '叶绿体（光合）', color: palette.bioChloroplast },
            { label: '线粒体（呼吸）', color: palette.bioMitochondrion },
            { label: 'CO₂', color: palette.bioGasCo2 },
            { label: 'O₂', color: palette.bioGasO2 },
            { label: '有机物', color: palette.bioOrganic },
          ]}
          note="深色实线为净速率 N = P − R，虚线水平线为恒定的呼吸速率"
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">昼夜扫描</h3>
          <DemoControls
            isPlaying={sim.isRunning}
            onToggle={sim.toggle}
            onReset={handleReset}
            hoverTip="点击自动演示，昼夜连续循环；也可以拖动下方时间轴定位到任意时刻。"
          />
          <ParamSlider
            label="时刻"
            value={frameIndex}
            min={0}
            max={FRAME_COUNT - 1}
            step={1}
            onValueChange={(value) => {
              sim.pause();
              sim.setTime(cycle.frames[value]?.t ?? 0);
            }}
            formatValue={(value) => formatTime(cycle.frames[value]?.t ?? 0)}
            helper={
              <p className="text-xs text-muted-foreground">
                拖动滑块后画面与读数直接切换到该时刻，不经过中间过程。
              </p>
            }
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-lg">快捷时刻</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => jumpTo(DAY_START)}>
              清晨 06:00
            </Button>
            <Button variant="outline" size="sm" onClick={() => jumpTo(NOON)}>
              正午 12:00
            </Button>
            <Button variant="outline" size="sm" onClick={() => jumpTo(DUSK)}>
              傍晚 18:00
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              恢复默认
            </Button>
          </div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default PhotosynthesisRespiration;