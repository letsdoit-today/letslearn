import { useCallback, useEffect, useRef, useState } from 'react';
import type { Circle, G, Line, Path, Polygon, Rect, Text } from '@svgdotjs/svg.js';
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
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette, rgba } from '@/lib/palette';
import {
  DEFAULT_INPUT,
  SOLUTE_KINDS,
  SOLUTES,
  axisSpec,
  curvePoints,
  formatSolubility,
  formatTick,
  solveSolubility,
  type SolubilityInput,
  type SoluteKind,
} from '@/lib/chem/solubility';

const SLUG = 'solubility-curve';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const WIDTH = 800;
const HEIGHT = 500;

const PLOT = { left: 84, right: 486, top: 56, bottom: 392 };
const BEAKER = { left: 566, right: 730, top: 150, bottom: 392 };
const INNER = { left: 572, right: 724, bottom: 386 };
const BEAKER_W = INNER.right - INNER.left;

const X_TICKS = [0, 20, 40, 60, 80, 100];

const CRYSTAL_OFFSETS = [
  { fx: 0.08, fy: 0.12 },
  { fx: 0.22, fy: 0.32 },
  { fx: 0.35, fy: 0.14 },
  { fx: 0.48, fy: 0.4 },
  { fx: 0.62, fy: 0.2 },
  { fx: 0.76, fy: 0.34 },
  { fx: 0.9, fy: 0.1 },
  { fx: 0.14, fy: 0.62 },
  { fx: 0.3, fy: 0.74 },
  { fx: 0.44, fy: 0.56 },
  { fx: 0.58, fy: 0.78 },
  { fx: 0.72, fy: 0.6 },
  { fx: 0.86, fy: 0.48 },
  { fx: 0.52, fy: 0.9 },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const STATE_LABELS: Record<string, string> = {
  unsaturated: '不饱和',
  exact: '恰好饱和',
  saturated: '饱和（有固体剩余）',
};

const STATE_COLORS: Record<string, string> = {
  unsaturated: '#475569',
  exact: '#059669',
  saturated: '#c2410c',
};

interface SceneEls {
  yGrid: Line[];
  yTick: Text[];
  xGrid: Line[];
  xTick: Text[];
  curve: Path;
  point: Circle;
  pointLabel: Text;
  liquid: Rect;
  surface: Line;
  crystals: G;
  crystalShapes: Polygon[];
  badgeRect: Rect;
  badgeText: Text;
}

const SolubilityCurve: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SceneEls | null>(null);
  const [input, setInput] = useState<SolubilityInput>(DEFAULT_INPUT);

  const draw = useCallback(() => {
    const ctx = snapRef.current;
    if (!ctx) return;

    const axis = axisSpec(input.kind);
    const state = solveSolubility(input);

    const xOf = (t: number) => PLOT.left + (t / 100) * (PLOT.right - PLOT.left);
    const yOf = (s: number) => PLOT.bottom - (s / axis.max) * (PLOT.bottom - PLOT.top);

    axis.ticks.forEach((v, i) => {
      const y = yOf(v);
      ctx.yGrid[i].plot(PLOT.left, y, PLOT.right, y);
      ctx.yTick[i].text(formatTick(v, axis.decimals)).attr({ x: PLOT.left - 10, y });
    });

    X_TICKS.forEach((t, i) => {
      const x = xOf(t);
      ctx.xGrid[i].plot(x, PLOT.top, x, PLOT.bottom);
      ctx.xTick[i].text(String(t)).attr({ x, y: PLOT.bottom + 18 });
    });

    const curve = curvePoints(input.kind, 1).map(
      (p) => `${xOf(p.t).toFixed(2)},${yOf(p.s).toFixed(2)}`,
    );
    ctx.curve.plot(`M${curve.join(' L')}`);

    const px = xOf(input.temperature);
    const py = yOf(state.solubility);
    ctx.point.center(px, py);
    ctx.pointLabel.attr({
      x: clamp(px + 16, PLOT.left + 34, PLOT.right - 34),
      y: clamp(py - 14, PLOT.top + 16, PLOT.bottom - 16),
    });

    const liquidH = clamp((state.solvent + state.dissolved) * 0.62, 14, 208);
    const liquidTop = INNER.bottom - liquidH;
    ctx.liquid.attr({
      x: INNER.left,
      y: liquidTop,
      width: BEAKER_W,
      height: liquidH,
    });
    ctx.surface.plot(INNER.left, liquidTop, INNER.right, liquidTop);

    const crystalH =
      state.undissolved > 0.05
        ? clamp(state.undissolved * 0.8, 0, Math.min(58, liquidH * 0.7))
        : 0;

    if (crystalH < 4) {
      ctx.crystals.hide();
    } else {
      ctx.crystals.show();
      CRYSTAL_OFFSETS.forEach((offset, i) => {
        const size = 4 + (i % 3);
        const cx = INNER.left + offset.fx * BEAKER_W;
        const cy = INNER.bottom - (0.1 + offset.fy * 0.8) * crystalH;
        ctx.crystalShapes[i].plot(
          `${cx.toFixed(2)},${(cy - size).toFixed(2)} ` +
            `${(cx + size).toFixed(2)},${cy.toFixed(2)} ` +
            `${cx.toFixed(2)},${(cy + size).toFixed(2)} ` +
            `${(cx - size).toFixed(2)},${cy.toFixed(2)}`,
        );
      });
    }

    const badgeLabel = STATE_LABELS[state.state];
    const badgeColor = STATE_COLORS[state.state];
    const badgeWidth = badgeLabel.length * 13 + 26;
    ctx.badgeRect.attr({
      width: badgeWidth,
      fill: rgba(badgeColor, 0.14),
      stroke: badgeColor,
    });
    ctx.badgeText.text(badgeLabel).attr({ x: BEAKER.left + badgeWidth / 2, fill: badgeColor });
  }, [input]);

  useSVGScene(svgRef, (s) => {
    const yGrid = axisSpec(DEFAULT_INPUT.kind).ticks.map(() =>
      s.line(0, 0, 0, 0).stroke({ color: palette.reference, width: 1, opacity: 0.35 }),
    );
    const yTick = axisSpec(DEFAULT_INPUT.kind).ticks.map(() =>
      s.text('0').attr({
        fill: palette.canvasText,
        'font-size': '12px',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
      }),
    );
    const xGrid = X_TICKS.map(() =>
      s.line(0, 0, 0, 0).stroke({ color: palette.reference, width: 1, opacity: 0.35 }),
    );
    const xTick = X_TICKS.map(() =>
      s.text('0').attr({
        fill: palette.canvasText,
        'font-size': '12px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }),
    );

    s.line(PLOT.left, PLOT.bottom, PLOT.right, PLOT.bottom).stroke({
      color: palette.objectStroke,
      width: 2,
      linecap: 'round',
    });
    s.line(PLOT.left, PLOT.top, PLOT.left, PLOT.bottom).stroke({
      color: palette.objectStroke,
      width: 2,
      linecap: 'round',
    });

    s.text('温度 t / ℃')
      .attr({
        fill: palette.canvasText,
        'font-size': '12px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: (PLOT.left + PLOT.right) / 2,
        y: PLOT.bottom + 42,
      });

    s.text('溶解度 S / (g/100g水)')
      .attr({
        fill: palette.canvasText,
        'font-size': '12px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: 26,
        y: (PLOT.top + PLOT.bottom) / 2,
        transform: `rotate(-90 26 ${(PLOT.top + PLOT.bottom) / 2})`,
      });

    const curve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.curve,
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
    });

    const point = s
      .circle(11)
      .attr({ fill: palette.statusActive, stroke: '#ffffff', 'stroke-width': 2 });

    const pointLabel = s.text('状态点').attr({
      fill: palette.statusActive,
      'font-size': '12px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    });

    const liquid = s
      .rect(1, 1)
      .attr({ fill: rgba(palette.solution, 0.55), stroke: 'none' });

    const surface = s.line(0, 0, 0, 0).stroke({
      color: palette.solution,
      width: 2,
      opacity: 0.9,
    });

    const crystals = s.group();
    const crystalShapes = CRYSTAL_OFFSETS.map(() =>
      s.polygon('0,0 0,0 0,0 0,0').attr({ fill: palette.crystal, stroke: '#ffffff', 'stroke-width': 1 }),
    );
    crystalShapes.forEach((shape) => crystals.add(shape));

    s.path(
      `M${BEAKER.left},${BEAKER.top} L${BEAKER.left},${BEAKER.bottom} ` +
        `L${BEAKER.right},${BEAKER.bottom} L${BEAKER.right},${BEAKER.top}`,
    ).attr({ fill: 'none', stroke: palette.objectStroke, 'stroke-width': 2.5 });

    s.text('水 + 溶质')
      .attr({
        fill: palette.canvasText,
        'font-size': '12px',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: (BEAKER.left + BEAKER.right) / 2,
        y: BEAKER.top + 18,
      });

    const badgeRect = s
      .rect(120, 26)
      .radius(6)
      .attr({ x: BEAKER.left, y: 100, 'stroke-width': 1.2 });

    const badgeText = s.text('').attr({
      'font-size': '13px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      y: 113,
    });

    snapRef.current = {
      yGrid,
      yTick,
      xGrid,
      xTick,
      curve,
      point,
      pointLabel,
      liquid,
      surface,
      crystals,
      crystalShapes,
      badgeRect,
      badgeText,
    };
  });

  useEffect(() => {
    draw();
  }, [draw]);

  const state = solveSolubility(input);

  const update = (patch: Partial<SolubilityInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const switchSolute = (kind: SoluteKind) => {
    update({ kind });
  };

  const kpiItems: KpiItem[] = [
    { label: '温度 t', value: `${state.temperature} ℃` },
    {
      label: '溶解度 S',
      value: `${formatSolubility(state.solubility)} g`,
      color: palette.statusActive,
    },
    { label: '溶质质量分数', value: `${state.massFraction.toFixed(1)} %` },
    { label: '已溶解溶质', value: `${state.dissolved.toFixed(1)} g`, color: palette.solution },
    { label: '未溶解溶质', value: `${state.undissolved.toFixed(1)} g`, color: palette.crystal },
    { label: '溶剂质量', value: `${state.solvent} g` },
  ];

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="溶解度是什么">
            在一定温度下，100 g 水中达到<strong>饱和状态</strong>时所溶解的溶质质量，就是该溶质在该温度下的溶解度 S，
            单位是 g/100g 水。它只与溶质、溶剂种类和温度有关，与加入多少溶质无关。
          </PrincipleCard>
          <PrincipleCard title="饱和与不饱和的判定">
            给定温度下最多可溶 m<sub>max</sub> = S · m<sub>水</sub> / 100。
            加入量小于 m<sub>max</sub> 时不饱和，等于 m<sub>max</sub> 时恰好饱和，大于 m<sub>max</sub> 时饱和且底部留有剩余固体。
          </PrincipleCard>
          <PrincipleCard title="降温结晶">
            硝酸钾的溶解度随温度升高而显著增大。把高温下的饱和溶液降温，S 迅速变小，
            多出来的溶质就会以晶体形式析出——这就是降温结晶（冷却热饱和溶液）的原理。
          </PrincipleCard>
          <PrincipleCard title="质量分数怎么算">
            溶质质量分数 = 已溶解的溶质质量 ÷ 溶液质量（溶剂 + 已溶解溶质）。
            未溶解的固体不算溶液的一部分，因此饱和溶液的质量分数由该温度下的 S 决定，与多加的固体无关。
          </PrincipleCard>
          <PrincipleCard title="三种溶质的曲线形态">
            硝酸钾的曲线陡升（0℃ 约 13 g，100℃ 约 246 g），适合降温结晶；氯化钠的曲线几乎水平（35.7→39.8 g），
            降温几乎析不出固体，只能靠蒸发溶剂结晶；氢氧化钙的曲线随温度升高而下降，升温反而会析出固体。
            切换溶质时纵轴量程随之改变，读数要看纵轴刻度而不是曲线的视觉高度。以上数值为教材示意值，用于读图练习。
          </PrincipleCard>
        </>
      }
      reference="溶解度 S 的单位为 g/100g 水；饱和溶液质量分数 = S/(100+S) × 100%；降温结晶适用于溶解度随温度升高明显增大的溶质（如 KNO₃），蒸发结晶适用于溶解度受温度影响很小的溶质（如 NaCl）。"
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
        <CanvasLegend
          items={[
            { label: '溶解度曲线', color: palette.curve },
            { label: '溶液', color: palette.solution },
            { label: '未溶解晶体', color: palette.crystal },
            { label: '当前状态点', color: palette.statusActive },
          ]}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">溶质选择</h3>
          <div className="grid grid-cols-3 gap-2">
            {SOLUTE_KINDS.map((kind) => (
              <Button
                key={kind}
                variant={input.kind === kind ? 'default' : 'outline'}
                size="sm"
                onClick={() => switchSolute(kind)}
              >
                {SOLUTES[kind].formula}
              </Button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {SOLUTES[input.kind].label}：溶解度随温度{input.kind === 'caoh2' ? '升高而减小' : input.kind === 'nacl' ? '变化很小' : '升高而明显增大'}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">参数调节</h3>
          <div className="space-y-3">
            <ParamSlider
              label="温度 t"
              value={input.temperature}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => update({ temperature: v })}
              formatValue={(v) => `${v} ℃`}
            />
            <ParamSlider
              label="溶剂（水）质量"
              value={input.solvent}
              min={50}
              max={200}
              step={10}
              onValueChange={(v) => update({ solvent: v })}
              formatValue={(v) => `${v} g`}
            />
            <ParamSlider
              label="加入溶质质量"
              value={input.added}
              min={0}
              max={300}
              step={1}
              onValueChange={(v) => update({ added: v })}
              formatValue={(v) => `${v} g`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">重置</h3>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setInput(DEFAULT_INPUT)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            恢复默认参数
          </Button>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default SolubilityCurve;