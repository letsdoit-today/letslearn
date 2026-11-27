import { useCallback, useEffect, useRef, useState } from 'react';
import type { Circle, Line, Path, Text } from '@svgdotjs/svg.js';
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
import { palette } from '@/lib/palette';
import {
  A_MAX,
  A_MIN,
  A_STEP,
  B_MAX,
  B_MIN,
  C_MAX,
  C_MIN,
  DEFAULT_INPUT,
  PLOT,
  PRESETS,
  X_TICKS,
  Y_TICKS,
  curvePath,
  formatCoordinate,
  formatNum,
  rootHint,
  snapA,
  solveQuadratic,
  toScreen,
  type QuadraticInput,
} from '@/lib/math/quadratic';

const SLUG = 'quadratic-function-graph';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const WIDTH = 800;
const HEIGHT = 500;

const ORIGIN_X = toScreen(0, 0).x;
const ORIGIN_Y = toScreen(0, 0).y;

const AXIS_BAND_TOP = ORIGIN_Y + 2;
const AXIS_BAND_BOTTOM = ORIGIN_Y + 34;

const textWidth = (text: string, size = 11) => text.length * size * 0.6 + 4;

interface SceneEls {
  refCurve: Path;
  curve: Path;
  axisLine: Line;
  vertexDot: Circle;
  vertexLabel: Text;
  rootDots: Circle[];
  rootRing: Circle;
  yDot: Circle;
  yLabel: Text;
}

const QuadraticFunctionGraph: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SceneEls | null>(null);
  const [input, setInput] = useState<QuadraticInput>(DEFAULT_INPUT);

  const draw = useCallback(() => {
    const ctx = snapRef.current;
    if (!ctx) return;

    const sol = solveQuadratic(input);

    ctx.curve.plot(curvePath(input));
    ctx.refCurve.plot(curvePath({ a: input.a, b: 0, c: 0 }));

    const axisPx = toScreen(sol.axisX, 0).x;
    ctx.axisLine.plot(axisPx, PLOT.top, axisPx, PLOT.bottom);

    const vertex = toScreen(sol.vertex.h, sol.vertex.k);
    ctx.vertexDot.center(vertex.x, vertex.y);

    const vertexText = formatCoordinate({ x: sol.vertex.h, y: sol.vertex.k });
    const vertexWidth = textWidth(vertexText, 12);
    let anchor: 'start' | 'end' = vertex.x < ORIGIN_X ? 'end' : 'start';
    let labelX = anchor === 'end' ? vertex.x - 12 : vertex.x + 12;
    let labelY = vertex.y - 16;
    if (labelY < PLOT.top + 16) {
      labelY = vertex.y + 34;
    } else if (labelY > AXIS_BAND_TOP && labelY < AXIS_BAND_BOTTOM) {
      labelY = vertex.y + 34;
    }
    if (anchor === 'start' && labelX + vertexWidth > PLOT.right - 4) {
      anchor = 'end';
      labelX = vertex.x - 12;
    } else if (anchor === 'end' && labelX - vertexWidth < PLOT.left + 4) {
      anchor = 'start';
      labelX = vertex.x + 12;
    }
    ctx.vertexLabel.text(vertexText).attr({ x: labelX, y: labelY, 'text-anchor': anchor });

    if (sol.discriminant > 0) {
      ctx.rootRing.hide();
      sol.roots.slice(0, 2).forEach((root, i) => {
        const point = toScreen(root, 0);
        ctx.rootDots[i].center(point.x, point.y).show();
      });
    } else if (sol.discriminant === 0) {
      ctx.rootDots.forEach((dot) => dot.hide());
      const point = toScreen(sol.roots[0], 0);
      ctx.rootRing.center(point.x, point.y).show();
    } else {
      ctx.rootDots.forEach((dot) => dot.hide());
      ctx.rootRing.hide();
    }

    const intercept = toScreen(0, sol.yIntercept);
    ctx.yDot.center(intercept.x, intercept.y);
    ctx.yLabel
      .text(`(0, ${formatNum(sol.yIntercept)})`)
      .attr({ x: intercept.x + 14, y: intercept.y + 18 });
  }, [input]);

  useSVGScene(svgRef, (s) => {
    const clip = s.clip().id('quadratic-plot-clip');
    clip.rect(PLOT.right - PLOT.left, PLOT.bottom - PLOT.top).move(PLOT.left, PLOT.top);

    s.line(PLOT.left, ORIGIN_Y, PLOT.right, ORIGIN_Y).stroke({
      color: palette.objectStroke,
      width: 1.6,
      linecap: 'round',
    });
    s.line(ORIGIN_X, PLOT.top, ORIGIN_X, PLOT.bottom).stroke({
      color: palette.objectStroke,
      width: 1.6,
      linecap: 'round',
    });
    s.polygon(
      `${PLOT.right},${ORIGIN_Y} ${PLOT.right - 11},${ORIGIN_Y - 5} ${PLOT.right - 11},${ORIGIN_Y + 5}`,
    ).attr({ fill: palette.objectStroke });
    s.polygon(
      `${ORIGIN_X},${PLOT.top} ${ORIGIN_X - 5},${PLOT.top + 11} ${ORIGIN_X + 5},${PLOT.top + 11}`,
    ).attr({ fill: palette.objectStroke });

    s.text('x')
      .attr({
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        x: PLOT.right - 4,
        y: ORIGIN_Y - 14,
      });
    s.text('y')
      .attr({
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
        x: ORIGIN_X + 8,
        y: PLOT.top + 4,
      });

    X_TICKS.filter((tick) => tick !== 0).forEach((tick) => {
      const x = toScreen(tick, 0).x;
      s.line(x, ORIGIN_Y - 4, x, ORIGIN_Y + 4).stroke({
        color: palette.objectStroke,
        width: 1.4,
      });
      s.text(String(tick))
        .attr({
          fill: palette.canvasText,
          'font-size': '11px',
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'paint-order': 'stroke',
          stroke: palette.canvasBg,
          'stroke-width': '3px',
          x,
          y: ORIGIN_Y + 18,
        });
    });

    Y_TICKS.filter((tick) => tick !== 0).forEach((tick) => {
      const y = toScreen(0, tick).y;
      s.line(ORIGIN_X - 4, y, ORIGIN_X + 4, y).stroke({
        color: palette.objectStroke,
        width: 1.4,
      });
      s.text(String(tick))
        .attr({
          fill: palette.canvasText,
          'font-size': '11px',
          'text-anchor': 'end',
          'dominant-baseline': 'middle',
          'paint-order': 'stroke',
          stroke: palette.canvasBg,
          'stroke-width': '3px',
          x: ORIGIN_X - 10,
          y,
        });
    });

    s.text('0')
      .attr({
        fill: palette.canvasText,
        'font-size': '11px',
        'text-anchor': 'end',
        'dominant-baseline': 'middle',
        'paint-order': 'stroke',
        stroke: palette.canvasBg,
        'stroke-width': '3px',
        x: ORIGIN_X - 10,
        y: ORIGIN_Y + 18,
      });

    s.text('横轴 64 px / 单位，纵轴 20 px / 单位：两轴比例不同，曲线只用于同框形状比对')
      .attr({
        fill: palette.canvasText,
        'font-size': '11px',
        'text-anchor': 'start',
        'dominant-baseline': 'middle',
        x: PLOT.left,
        y: HEIGHT - 22,
      });

    const refCurve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.mathReference,
      'stroke-width': 2,
      'stroke-dasharray': '7 5',
      'stroke-linecap': 'round',
      'clip-path': 'url(#quadratic-plot-clip)',
    });

    const curve = s.path('M0,0').attr({
      fill: 'none',
      stroke: palette.mathCurve,
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'clip-path': 'url(#quadratic-plot-clip)',
    });

    const axisLine = s.line(0, 0, 0, 0).stroke({
      color: palette.mathAxis,
      width: 1.6,
      dasharray: '6 6',
    });

    const vertexDot = s
      .circle(10)
      .attr({ fill: palette.mathVertex, stroke: '#ffffff', 'stroke-width': 1.5 });

    const vertexLabel = s.text('').attr({
      fill: palette.mathVertex,
      'font-size': '12px',
      'font-weight': 'bold',
      'dominant-baseline': 'middle',
      'paint-order': 'stroke',
      stroke: palette.canvasBg,
      'stroke-width': '3px',
    });

    const rootDots = [0, 1].map(() =>
      s.circle(8).attr({ fill: palette.mathRoot, stroke: '#ffffff', 'stroke-width': 1.5 }),
    );

    const rootRing = s
      .circle(18)
      .attr({ fill: 'none', stroke: palette.mathRoot, 'stroke-width': 2 });

    const yDot = s
      .circle(8)
      .attr({ fill: palette.mathRoot, stroke: '#ffffff', 'stroke-width': 1.5 });

    const yLabel = s.text('').attr({
      fill: palette.mathRoot,
      'font-size': '11px',
      'font-weight': 'bold',
      'text-anchor': 'start',
      'dominant-baseline': 'middle',
      'paint-order': 'stroke',
      stroke: palette.canvasBg,
      'stroke-width': '3px',
    });

    snapRef.current = {
      refCurve,
      curve,
      axisLine,
      vertexDot,
      vertexLabel,
      rootDots,
      rootRing,
      yDot,
      yLabel,
    };
  });

  useEffect(() => {
    draw();
  }, [draw]);

  const sol = solveQuadratic(input);

  const update = (patch: Partial<QuadraticInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const kpiItems: KpiItem[] = [
    {
      label: '二次项系数 a',
      value: `${formatNum(input.a, 1)} ${sol.opensUp ? '向上' : '向下'}`,
      color: palette.mathCurve,
    },
    { label: '一次项系数 b', value: formatNum(input.b, 1) },
    { label: '常数项 c', value: formatNum(input.c, 1) },
    {
      label: '对称轴 x',
      value: formatNum(sol.axisX),
      color: palette.mathAxis,
    },
    {
      label: '顶点 (h, k)',
      value: `${formatNum(sol.vertex.h)}, ${formatNum(sol.vertex.k)}`,
      color: palette.mathVertex,
    },
    {
      label: '判别式 Δ',
      value: `${formatNum(sol.discriminant, 0)} ${rootHint(sol.discriminant)}`,
      color: palette.mathRoot,
    },
  ];

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="a 决定开口方向与形状">
            <strong>a</strong> 的符号决定开口方向：<em>a &gt; 0</em> 开口向上，<em>a &lt; 0</em> 开口向下；
            |a| 越大开口越窄。图中浅色虚线是同一 a 下的参考曲线 y = a x²，它与当前曲线
            <strong>形状完全相同</strong>，只被 b、c 整体挪了位置。
          </PrincipleCard>
          <PrincipleCard title="b 只改变对称轴的位置">
            对称轴是 x = -b / (2a)。b 变化时对称轴左右平移，但抛物线的开口大小与方向不变——
            这也是参考曲线与当前曲线始终全等的原因。b = 0 时对称轴就是 y 轴，顶点落在 y 轴上。
          </PrincipleCard>
          <PrincipleCard title="c 是与 y 轴的交点">
            令 x = 0，得 y = c，所以抛物线一定经过 (0, c)。c 变化时曲线上下平移，
            形状与开口方向仍然不变。注意 (0, c) 只是与 y 轴的交点，不一定是最低点或最高点。
          </PrincipleCard>
          <PrincipleCard title="Δ 决定与 x 轴交点的个数">
            令 y = 0 得 a x² + b x + c = 0，判别式 Δ = b² - 4ac。
            Δ &gt; 0 有两个交点（两实根），Δ = 0 只有一个交点且它就是顶点（重根），
            Δ &lt; 0 与 x 轴没有交点。画布上的空心环表示「交点与顶点重合」。
          </PrincipleCard>
        </>
      }
      reference="a 决定开口方向与宽窄，b 与 c 只改变位置、不改变形状；对称轴 x = -b/(2a)，与 y 轴交点 (0, c)，与 x 轴交点个数由 Δ = b² - 4ac 的符号决定。"
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
        <CanvasLegend
          items={[
            { label: '当前曲线 y = ax² + bx + c', color: palette.mathCurve },
            { label: '参考曲线 y = ax²', color: palette.mathReference },
            { label: '对称轴', color: palette.mathAxis },
            { label: '顶点', color: palette.mathVertex },
            { label: '与 x 轴交点（有实根时）', color: palette.mathRoot },
          ]}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">预设图像</h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant={
                  input.a === preset.input.a &&
                  input.b === preset.input.b &&
                  input.c === preset.input.c
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setInput(preset.input)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">参数调节</h3>
          <div className="space-y-3">
            <ParamSlider
              label="二次项系数 a"
              value={input.a}
              min={A_MIN}
              max={A_MAX}
              step={A_STEP}
              onValueChange={(v) => update({ a: snapA(v, input.a) })}
              formatValue={(v) => formatNum(v, 1)}
            />
            <ParamSlider
              label="一次项系数 b"
              value={input.b}
              min={B_MIN}
              max={B_MAX}
              step={1}
              onValueChange={(v) => update({ b: v })}
              formatValue={(v) => formatNum(v, 1)}
            />
            <ParamSlider
              label="常数项 c"
              value={input.c}
              min={C_MIN}
              max={C_MAX}
              step={1}
              onValueChange={(v) => update({ c: v })}
              formatValue={(v) => formatNum(v, 1)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            二次函数要求 a ≠ 0：a = 0 时图像退化为一次函数的直线，顶点与对称轴都不存在，
            因此滑块经过 0 时会自动吸附到 ±0.5。
          </div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default QuadraticFunctionGraph;