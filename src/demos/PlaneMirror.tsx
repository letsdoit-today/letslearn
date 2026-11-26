import { useCallback, useEffect, useRef, useState } from 'react';
import type { Circle, G, Line, Path, Polygon, Rect, Text } from '@svgdotjs/svg.js';
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
import { palette, rgba } from '@/lib/palette';
import {
  computePlaneMirror,
  mirrorBasis,
  MIRROR_CENTER,
  MIRROR_HALF,
  PLANE_MIRROR_DEFAULT_INPUT,
  type PlaneMirrorInput,
  type Point,
} from '@/lib/physics/planeMirror';

const name = '平面镜成像实验';

const WIDTH = 800;
const HEIGHT = 500;

/** 拖拽手柄命中半径（px） */
const HANDLE_RADIUS = 18;
/** 拖拽手柄视觉半径（px），仅在指针靠近时显示 */
const HANDLE_VISUAL_RADIUS = 8;
/** 物体底部到镜面的最小距离（px） */
const MIN_DIST_TO_MIRROR = 24;
const MIN_H = 40;
const MAX_H = 220;
const MARGIN = 40;
/** 镜面倾角范围（度） */
const ANGLE_MIN = -45;
const ANGLE_MAX = 45;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, s: number): Point => ({ x: a.x * s, y: a.y * s });
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

const linePath = (a: Point, b: Point) =>
  `M${a.x.toFixed(2)},${a.y.toFixed(2)} L${b.x.toFixed(2)},${b.y.toFixed(2)}`;

/** 箭头头部三角形（tip 为尖端，dir 为单位方向，len 为头长，half 为半宽） */
function arrowHead(tip: Point, dir: Point, len: number, half: number): string {
  const bx = tip.x - dir.x * len;
  const by = tip.y - dir.y * len;
  const a = `${(bx - dir.y * half).toFixed(2)},${(by + dir.x * half).toFixed(2)}`;
  const b = `${(bx + dir.y * half).toFixed(2)},${(by - dir.x * half).toFixed(2)}`;
  return `${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${a} ${b}`;
}

interface SceneEls {
  mirrorGroup: G;
  raysGroup: G;
  auxGroup: G;
  mirrorShaft: Line;
  mirrorHatch: Line[];
  normalBottom: Line;
  normalTop: Line;
  baffle: Rect;
  objectShaft: Line;
  objectHead: Polygon;
  objectHandle: Circle;
  topHandle: Circle;
  imageShaft: Line;
  imageHead: Polygon;
  virtualLabel: Text;
  bottomIn: Path;
  bottomReflect: Path;
  bottomVirtual: Path;
  topIn: Path;
  topReflect: Path;
  topVirtual: Path;
  auxConnect: Line;
  auxRightAngle: Path;
  distU: Text;
  distV: Text;
}

const PlaneMirror: React.FC = () => {
  useSEO({
    title: `${name} - 光学物理演示 | Physics Learn`,
    description: Demos.find((demo) => demo.name === name)?.description || '',
    keywords: '平面镜成像,光的反射,虚像,反射定律,镜面对称,物理光学',
    canonical: `${siteUrl}${Demos.find((demo) => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-plane-mirror-imaging.jpg`,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const snapRef = useRef<SceneEls | null>(null);
  const inputRef = useRef<PlaneMirrorInput>(PLANE_MIRROR_DEFAULT_INPUT);
  const dragRef = useRef<'move' | 'height' | null>(null);
  const hoverRef = useRef<'move' | 'height' | null>(null);

  const [input, setInput] = useState<PlaneMirrorInput>(PLANE_MIRROR_DEFAULT_INPUT);
  const [showRays, setShowRays] = useState(true);
  const [showAuxLines, setShowAuxLines] = useState(false);
  const [showBaffle, setShowBaffle] = useState(false);

  const draw = useCallback(() => {
    const ctx = snapRef.current;
    if (!ctx) return;

    const res = computePlaneMirror(input);

    // 镜面组局部坐标：+x 指向镜后（-normal），+y 沿镜面方向。
    // 直接用内核基向量构造矩阵，避免与 SVG 顺时针旋转约定产生符号漂移。
    ctx.mirrorGroup.transform(
      new Matrix(
        -res.normal.x,
        -res.normal.y,
        res.mirrorDir.x,
        res.mirrorDir.y,
        MIRROR_CENTER.x,
        MIRROR_CENTER.y,
      ),
    );

    // 物体（实线）
    const objDir = { x: 0, y: -1 };
    ctx.objectShaft.plot(
      res.objectBottom.x,
      res.objectBottom.y,
      res.objectTop.x,
      res.objectTop.y,
    );
    ctx.objectHead.plot(arrowHead(res.objectTop, objDir, 16, 8));
    ctx.objectHandle.center(res.objectBottom.x, res.objectBottom.y);
    ctx.topHandle.center(res.objectTop.x, res.objectTop.y);

    // 像（虚线）
    const imgVec = sub(res.imageTop, res.imageBottom);
    const imgLen = Math.hypot(imgVec.x, imgVec.y) || 1;
    const imgDir = { x: imgVec.x / imgLen, y: imgVec.y / imgLen };
    ctx.imageShaft.plot(
      res.imageBottom.x,
      res.imageBottom.y,
      res.imageTop.x,
      res.imageTop.y,
    );
    ctx.imageHead.plot(arrowHead(res.imageTop, imgDir, 16, 8));
    ctx.virtualLabel
      .text('虚像')
      .move(res.imageTop.x - 14, res.imageTop.y - 28);

    // 法线：过每条光线的入射点、垂直于镜面，用于呈现入射角与反射角
    const drawNormal = (line: Line, incident: Point) => {
      const front = 54;
      const back = 16;
      line.plot(
        incident.x - res.normal.x * back,
        incident.y - res.normal.y * back,
        incident.x + res.normal.x * front,
        incident.y + res.normal.y * front,
      );
    };
    drawNormal(ctx.normalBottom, res.bottomRay.incident);
    drawNormal(ctx.normalTop, res.topRay.incident);

    // 光线（实线 + 反向延长虚线）
    ctx.bottomIn.plot(linePath(res.bottomRay.source, res.bottomRay.incident));
    ctx.bottomReflect.plot(linePath(res.bottomRay.incident, res.bottomRay.reflectedEnd));
    ctx.bottomVirtual.plot(linePath(res.bottomRay.incident, res.bottomRay.virtualEnd));
    ctx.topIn.plot(linePath(res.topRay.source, res.topRay.incident));
    ctx.topReflect.plot(linePath(res.topRay.incident, res.topRay.reflectedEnd));
    ctx.topVirtual.plot(linePath(res.topRay.incident, res.topRay.virtualEnd));

    // 对称辅助线：物像连线（穿过镜面）、交点处直角符号、u/v 分段标注。
    // Line.plot 只接受 4 个数值参数，传入路径字符串会被解析成 NaN 导致不可见。
    ctx.auxConnect.plot(
      res.objectBottom.x,
      res.objectBottom.y,
      res.imageBottom.x,
      res.imageBottom.y,
    );

    const foot = {
      x: (res.objectBottom.x + res.imageBottom.x) / 2,
      y: (res.objectBottom.y + res.imageBottom.y) / 2,
    };
    const s = 14;
    const armMirror = add(foot, mul(res.mirrorDir, s));
    const armObject = add(foot, mul(res.normal, s));
    const corner = {
      x: armMirror.x + armObject.x - foot.x,
      y: armMirror.y + armObject.y - foot.y,
    };
    ctx.auxRightAngle.plot(
      `M${armMirror.x.toFixed(2)},${armMirror.y.toFixed(2)} L${corner.x.toFixed(2)},${corner.y.toFixed(
        2,
      )} L${armObject.x.toFixed(2)},${armObject.y.toFixed(2)}`,
    );

    // u 与 v 分别落在镜面两侧的线段中点，沿镜面方向错开避免压线；
    // 文字保持水平，镜面越倾斜，水平文字框在法线方向的投影越宽，偏移量随之加大
    const midU = {
      x: (res.objectBottom.x + foot.x) / 2,
      y: (res.objectBottom.y + foot.y) / 2,
    };
    const midV = {
      x: (res.imageBottom.x + foot.x) / 2,
      y: (res.imageBottom.y + foot.y) / 2,
    };
    const labelOffset = 20 + 14 * Math.abs(Math.sin((input.angleDeg * Math.PI) / 180));
    ctx.distU
      .text(`u = ${res.objectDistanceCm.toFixed(1)} cm`)
      .center(midU.x + res.mirrorDir.x * labelOffset, midU.y + res.mirrorDir.y * labelOffset);
    ctx.distV
      .text(`v = ${res.imageDistanceCm.toFixed(1)} cm`)
      .center(midV.x - res.mirrorDir.x * labelOffset, midV.y - res.mirrorDir.y * labelOffset);

    // 开关控制可见性
    ctx.raysGroup.opacity(showRays ? 1 : 0);
    ctx.auxGroup.opacity(showAuxLines ? 1 : 0);
    ctx.baffle.opacity(showBaffle ? 1 : 0);
  }, [input, showRays, showAuxLines, showBaffle]);

  useSVGScene(svgRef, (s) => {
    const mirrorGroup = s.group();

    const mirrorShaft = mirrorGroup
      .line(0, -MIRROR_HALF, 0, MIRROR_HALF)
      .stroke({ color: palette.objectStroke, width: 4, linecap: 'round' });

    // 背面斜线纹理（镜后 +x 侧）
    const mirrorHatch: Line[] = [];
    for (let i = 0; i < 8; i += 1) {
      const y = -190 + i * 54;
      mirrorHatch.push(
        mirrorGroup
          .line(10, y, 24, y + 12)
          .stroke({ color: palette.reference, width: 1.5 }),
      );
    }

    const baffle = mirrorGroup
      .rect(38, 300)
      .move(26, -150)
      .radius(4)
      .attr({ fill: rgba(palette.object, 0.16), stroke: rgba(palette.object, 0.55), 'stroke-width': 1.5 })
      .opacity(0);

    // 物体（实线箭头）
    const objectShaft = s
      .line(0, 0, 0, 0)
      .stroke({ color: palette.object, width: 4, linecap: 'round' });
    const objectHead = s.polygon('0,0 0,0 0,0').fill(palette.object);
    const objectHandle = s
      .circle(HANDLE_VISUAL_RADIUS * 2)
      .attr({ fill: rgba(palette.object, 0.1), stroke: palette.object, 'stroke-width': 1.5 })
      .opacity(0);
    const topHandle = s
      .circle(HANDLE_VISUAL_RADIUS * 2)
      .attr({ fill: rgba(palette.object, 0.1), stroke: palette.object, 'stroke-width': 1.5 })
      .opacity(0);

    // 像（虚线箭头）
    const imageShaft = s
      .line(0, 0, 0, 0)
      .stroke({ color: palette.reference, width: 4, linecap: 'round', dasharray: '7,5' });
    const imageHead = s
      .polygon('0,0 0,0 0,0')
      .fill('none')
      .stroke({ color: palette.reference, width: 2, dasharray: '4,3' });
    const virtualLabel = s
      .text('虚像')
      .attr({
        fill: palette.canvasText,
        'font-size': '13px',
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });

    // 光线
    const raysGroup = s.group();
    const solidAttr = { color: palette.ray, width: 2 };
    const virtualAttr = { color: palette.reference, width: 1.5, dasharray: '5,5' };
    // 法线过入射点，随光线一同显隐
    const normalAttr = { color: palette.reference, width: 1.5, dasharray: '5,5' };
    const normalBottom = raysGroup.line(0, 0, 0, 0).stroke(normalAttr);
    const normalTop = raysGroup.line(0, 0, 0, 0).stroke(normalAttr);
    const bottomIn = raysGroup.path('M0,0').stroke(solidAttr).fill('none');
    const bottomReflect = raysGroup.path('M0,0').stroke(solidAttr).fill('none');
    const bottomVirtual = raysGroup.path('M0,0').stroke(virtualAttr).fill('none');
    const topIn = raysGroup.path('M0,0').stroke(solidAttr).fill('none');
    const topReflect = raysGroup.path('M0,0').stroke(solidAttr).fill('none');
    const topVirtual = raysGroup.path('M0,0').stroke(virtualAttr).fill('none');

    // 对称辅助线
    const auxGroup = s.group();
    const auxConnect = auxGroup
      .line(0, 0, 0, 0)
      .stroke({ color: palette.reference, width: 1.5, dasharray: '5,5' });
    const auxRightAngle = auxGroup
      .path('M0,0')
      .attr({ fill: 'none', stroke: palette.reference, 'stroke-width': 1.5 });
    const textAttr = {
      fill: palette.canvasText,
      'font-size': '12px',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    };
    const distU = auxGroup.text('').attr(textAttr);
    const distV = auxGroup.text('').attr(textAttr);

    snapRef.current = {
      mirrorGroup,
      raysGroup,
      auxGroup,
      mirrorShaft,
      mirrorHatch,
      normalBottom,
      normalTop,
      baffle,
      objectShaft,
      objectHead,
      objectHandle,
      topHandle,
      imageShaft,
      imageHead,
      virtualLabel,
      bottomIn,
      bottomReflect,
      bottomVirtual,
      topIn,
      topReflect,
      topVirtual,
      auxConnect,
      auxRightAngle,
      distU,
      distV,
    };
  });

  useEffect(() => {
    draw();
  }, [draw]);

  // 拖拽交互：pointer 事件 + setPointerCapture
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.style.touchAction = 'none';

    const toSvgPoint = (clientX: number, clientY: number): Point => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: clientX, y: clientY };
      const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: pt.x, y: pt.y };
    };

    // 手柄仅在指针靠近对应端点时淡入，避免常驻圆圈干扰画面
    const setHover = (target: 'move' | 'height' | null) => {
      if (hoverRef.current === target) return;
      hoverRef.current = target;
      const ctx = snapRef.current;
      if (!ctx) return;
      ctx.objectHandle.opacity(target === 'move' ? 1 : 0);
      ctx.topHandle.opacity(target === 'height' ? 1 : 0);
      svg.style.cursor = target ? 'grab' : 'default';
    };

    const hitHandle = (pt: Point): 'move' | 'height' | null => {
      const inp = inputRef.current;
      const bottom = inp.objectBottom;
      const top = { x: bottom.x, y: bottom.y - inp.objectHeightPx };
      if (Math.hypot(pt.x - bottom.x, pt.y - bottom.y) <= HANDLE_RADIUS) return 'move';
      if (Math.hypot(pt.x - top.x, pt.y - top.y) <= HANDLE_RADIUS) return 'height';
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const hit = hitHandle(toSvgPoint(e.clientX, e.clientY));
      if (!hit) return;
      dragRef.current = hit;
      e.preventDefault();
      setHover(hit);
      svg.style.cursor = 'grabbing';
      svg.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) {
        setHover(hitHandle(toSvgPoint(e.clientX, e.clientY)));
        return;
      }
      const pt = toSvgPoint(e.clientX, e.clientY);

      setInput((prev) => {
        let next: PlaneMirrorInput = prev;
        if (dragRef.current === 'move') {
          const x = clamp(pt.x, MARGIN, WIDTH - MARGIN);
          const y = clamp(pt.y, MARGIN + prev.objectHeightPx, HEIGHT - MARGIN);
          let bottom: Point = { x, y };
          const n = mirrorBasis(prev.angleDeg).normal;
          const signed = dot(sub(bottom, MIRROR_CENTER), n);
          if (signed < MIN_DIST_TO_MIRROR) {
            bottom = add(bottom, mul(n, MIN_DIST_TO_MIRROR - signed));
          }
          next = { ...prev, objectBottom: bottom };
        } else {
          const h = clamp(
            prev.objectBottom.y - pt.y,
            MIN_H,
            Math.min(MAX_H, prev.objectBottom.y - MARGIN),
          );
          next = { ...prev, objectHeightPx: h };
        }
        inputRef.current = next;
        return next;
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      dragRef.current = null;
      if (svg.hasPointerCapture(e.pointerId)) {
        svg.releasePointerCapture(e.pointerId);
      }
      setHover(hitHandle(toSvgPoint(e.clientX, e.clientY)));
      if (hoverRef.current) svg.style.cursor = 'grab';
    };

    const onPointerLeave = () => {
      if (!dragRef.current) setHover(null);
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('pointerleave', onPointerLeave);

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.removeEventListener('pointerleave', onPointerLeave);
      svg.style.touchAction = '';
    };
  }, []);

  const res = computePlaneMirror(input);

  const updateInput = (patch: Partial<PlaneMirrorInput>) => {
    setInput((prev) => {
      const next = { ...prev, ...patch };
      inputRef.current = next;
      return next;
    });
  };

  const handleReset = () => {
    inputRef.current = PLANE_MIRROR_DEFAULT_INPUT;
    setInput(PLANE_MIRROR_DEFAULT_INPUT);
    setShowRays(true);
    setShowAuxLines(false);
    setShowBaffle(false);
  };

  const kpiItems: KpiItem[] = [
    { label: '物距 u', value: `${res.objectDistanceCm.toFixed(1)} cm` },
    { label: '像距 v', value: `${res.imageDistanceCm.toFixed(1)} cm` },
    { label: '物高 h', value: `${res.objectHeightCm.toFixed(1)} cm`, color: palette.object },
    { label: '像高 h′', value: `${res.imageHeightCm.toFixed(1)} cm`, color: palette.reference },
    { label: '入射角 θᵢ', value: `${res.bottomRay.incidentAngleDeg.toFixed(1)}°`, color: palette.ray },
    { label: '反射角 θᵣ', value: `${res.bottomRay.reflectedAngleDeg.toFixed(1)}°`, color: palette.ray },
  ];

  return (
    <DemoPage
      title={name}
      description={Demos.find((demo) => demo.name === name)?.description || ''}
      principles={
        <>
          <PrincipleCard title="光的反射定律">
            反射光线、入射光线与法线在同一平面内；反射光线与入射光线分居法线两侧；
            反射角等于入射角。
          </PrincipleCard>
          <PrincipleCard title="平面镜成像的对称性">
            平面镜所成的像与物体关于镜面对称：像与物大小相等、正立，物距等于像距，
            物像连线垂直于镜面。
          </PrincipleCard>
          <PrincipleCard title="虚像与反向延长线">
            虚像不是实际光线会聚而成，而是反射光线反向延长线的交点，不能用光屏承接，
            只能透过镜面看到。
          </PrincipleCard>
          <PrincipleCard title="镜后挡板实验">
            在镜后放置挡板，像仍然可见且位置、大小不变，说明镜后并没有实际光线，
            印证平面镜所成的是虚像。
          </PrincipleCard>
        </>
      }
      reference="恒定结论：放大率恒为 1；像距恒等于物距；物像连线垂直于镜面；像为虚像。"
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} />
        <CanvasLegend
          items={[
            { label: '物体', color: palette.object },
            { label: '像（虚像·虚线）', color: palette.reference },
            { label: '入射光线', color: palette.ray },
            { label: '反射光线', color: palette.ray },
            { label: '反向延长线', color: palette.reference },
            { label: '法线', color: palette.reference },
          ]}
        />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实验控制</h3>
          <ParamSlider
            label="镜面倾角"
            value={input.angleDeg}
            min={ANGLE_MIN}
            max={ANGLE_MAX}
            step={1}
            onValueChange={(v) => updateInput({ angleDeg: v })}
            formatValue={(v) => `${v}°`}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={showRays ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowRays((v) => !v)}
            >
              {showRays ? '隐藏光线' : '显示光线'}
            </Button>
            <Button
              variant={showAuxLines ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAuxLines((v) => !v)}
            >
              {showAuxLines ? '隐藏辅助线' : '对称辅助线'}
            </Button>
            <Button
              variant={showBaffle ? 'default' : 'outline'}
              size="sm"
              className="col-span-2"
              onClick={() => setShowBaffle((v) => !v)}
            >
              {showBaffle ? '移除镜后挡板' : '放置镜后挡板'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg">操作提示</h3>
          <p className="text-sm text-muted-foreground">
            拖动箭头的下端移动物体、上端改变高度；转动倾角滑块可旋转镜面。
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg">重置</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            恢复默认
          </Button>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default PlaneMirror;