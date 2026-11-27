import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Svg, G, Path, Rect, Circle, Text } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { calculateThinLens, imageTypeText } from '@/lib/physics/lens';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { DemoControls } from '@/components/demo/DemoControls';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import { Button } from '@/components/ui/button';
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette } from '@/lib/palette';

const SLUG = 'convex-lens';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const CONFIG = {
  width: 800,
  height: 500,
  centerX: 400,
  centerY: 250,
  lensHeight: 200,
  lensWidth: 30,
  axisLength: 700,
  objHeight: 60,
  screenWidth: 6,
  screenHeight: 200,
  screenMinX: 424,
  screenMaxX: 784,
  clarityTolerance: 6,
  fDefault: 100,
  fMin: 60,
  fMax: 140,
  fStep: 5,
  uMin: 10,
  uDefault: 300,
  screenDefaultX: 550,
};

const uMaxFor = (f: number) => Math.min(3 * f, CONFIG.centerX - 20);

type ZoneId = 'u-gt-2f' | 'f-to-2f' | 'u-lt-f';

const ZONES: { id: ZoneId; text: string }[] = [
  { id: 'u-gt-2f', text: 'u>2f 倒立缩小实像' },
  { id: 'f-to-2f', text: 'f<u<2f 倒立放大实像' },
  { id: 'u-lt-f', text: 'u<f 正立放大虚像' },
];

const EXAM_TIPS = [
  {
    title: '三心共轴',
    body: '烛焰中心、凸透镜光心、光屏中心要调到同一高度。三者不共轴时像会偏到光屏外，实验中最常见的“找不到像”就是它。',
  },
  {
    title: '找不到像的三种原因',
    body: '物距小于焦距（成虚像，光屏接不到）；三心不共轴（像落在光屏外）；物距略大于焦距（像距过大，超出光具座长度）。',
  },
  {
    title: '两种测焦距的方法',
    body: '平行光聚焦法：太阳光平行主光轴入射，最小最亮光斑到透镜的距离即焦距。等大成像法：调出与物等大的像，此时 u = v = 2f，故 f = u/2。',
  },
  {
    title: '物近像远像变大',
    body: '物体从远处向焦点靠近（仍在焦点外）时，像距变大、像变大，光屏必须向右远离透镜才能重新接到清晰的像。',
  },
  {
    title: '蜡烛变短，像会向上移',
    body: '烛焰随蜡烛燃烧而下移，像相对主光轴反向移动（向上），需要把光屏上移、或把透镜下调，才能重新接住像。',
  },
  {
    title: '遮住透镜一半',
    body: '像依然完整，只是变暗。物体上每一点发出的光仍有一部分能通过透镜的另一半到达像点，所以像不会被“切掉”。',
  },
];

const ConvexLensSim: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);

  const [u, setU] = useState(CONFIG.uDefault);
  const [f, setF] = useState(CONFIG.fDefault);
  const [animating, setAnimating] = useState(false);
  const [occluded, setOccluded] = useState(false);
  const [data, setData] = useState({
    v: 150,
    m: -0.5,
    typeText: '倒立缩小实像',
    screenText: '像清晰',
    screenTone: 'clear' as 'clear' | 'blur' | 'none',
  });

  const stateRef = useRef({
    u: CONFIG.uDefault,
    f: CONFIG.fDefault,
    screenX: CONFIG.screenDefaultX,
    animating: false,
    animationSpeed: 0.5,
    occluded: false,
  });

  const requestRef = useRef<number>();

  const snapRef = useRef<{
    s: Svg;
    objectArrow: G;
    imageArrow: G;
    screenGroup: G;
    marks: { dot: Circle; label: Text; kind: 'F' | '2F' | "F'" | "2F'" | 'O' }[];
    zones: { id: ZoneId; rect: Rect; label: Text }[];
    rays: {
      parallel: Path;
      center: Path;
      third: Path;
      virtualParallel: Path;
      virtualCenter: Path;
      virtualThird: Path;
    };
  } | null>(null);

  // 焦点 / 倍焦点标记与三段区段背景随焦距、物距重绘
  const redrawStatic = useCallback((nextF: number, nextU: number) => {
    if (!snapRef.current) return;
    const { marks, zones } = snapRef.current;

    marks.forEach((mark) => {
      let x = CONFIG.centerX;
      let y = CONFIG.centerY + 20;
      if (mark.kind === 'F') x = CONFIG.centerX - nextF;
      else if (mark.kind === '2F') x = CONFIG.centerX - 2 * nextF;
      else if (mark.kind === "F'") x = CONFIG.centerX + nextF;
      else if (mark.kind === "2F'") x = CONFIG.centerX + 2 * nextF;
      else y = CONFIG.centerY + 15;
      mark.dot.center(x, CONFIG.centerY);
      mark.label.attr({ x, y });
    });

    const left = CONFIG.centerX - CONFIG.axisLength / 2;
    const b1 = CONFIG.centerX - 2 * nextF;
    const b2 = CONFIG.centerX - nextF;
    const geom: Record<ZoneId, { x: number; w: number }> = {
      'u-gt-2f': { x: left, w: Math.max(0, b1 - left) },
      'f-to-2f': { x: b1, w: nextF },
      'u-lt-f': { x: b2, w: nextF },
    };
    const activeId: ZoneId = nextU > 2 * nextF ? 'u-gt-2f' : nextU >= nextF ? 'f-to-2f' : 'u-lt-f';

    zones.forEach((zone) => {
      const { x, w } = geom[zone.id];
      const active = zone.id === activeId;
      zone.rect.attr({ x, width: w }).fill({ color: palette.reference, opacity: active ? 0.08 : 0.03 });
      zone.label.attr({ x: x + w / 2 }).fill(active ? palette.object : palette.reference);
    });
  }, []);

  const updateScene = useCallback(
    (nextU: number, nextF: number) => {
      if (!snapRef.current) return;
      const { objectArrow, imageArrow, screenGroup, rays } = snapRef.current;

      const phys = calculateThinLens(nextU, nextF);
      const isParallel = !Number.isFinite(phys.v);
      const objX = CONFIG.centerX - nextU;
      const objY = CONFIG.centerY;
      const objH = CONFIG.objHeight;
      const objTopY = objY - objH;
      const imgX = CONFIG.centerX + phys.v;

      // 光屏判定：与像位置的距离落在阈值内即判清晰
      const screenX = stateRef.current.screenX;
      let screenText: string;
      let screenTone: 'clear' | 'blur' | 'none';
      if (isParallel) {
        screenText = '出射光平行，接不到像';
        screenTone = 'none';
      } else if (phys.v <= 0) {
        screenText = '虚像不能用光屏承接';
        screenTone = 'none';
      } else if (imgX > CONFIG.screenMaxX) {
        screenText = '像距过大，光屏接不到';
        screenTone = 'blur';
      } else {
        const diff = screenX - imgX;
        if (Math.abs(diff) <= CONFIG.clarityTolerance) {
          screenText = '像清晰';
          screenTone = 'clear';
        } else {
          screenText = `像模糊，光屏应向${diff > 0 ? '左' : '右'}移动`;
          screenTone = 'blur';
        }
      }

      setData({
        v: phys.v,
        m: phys.m,
        typeText: isParallel ? '不成像（出射光平行）' : imageTypeText(phys.typeKey),
        screenText,
        screenTone,
      });

      objectArrow.transform(new Matrix().translate(objX, objY));
      screenGroup.transform(new Matrix().translate(screenX, 0));

      const toRight = CONFIG.width - CONFIG.centerX;
      rays.virtualParallel.plot('');
      rays.virtualCenter.plot('');
      rays.virtualThird.plot('');

      if (isParallel) {
        // u = f：像在无穷远，两条出射光线平行
        imageArrow.opacity(0);
        const slopeParallel = (CONFIG.centerY - objTopY) / nextF;
        rays.parallel.plot(
          `M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${CONFIG.width},${
            objTopY + slopeParallel * toRight
          }`,
        );
        const slopeCenter = (CONFIG.centerY - objTopY) / nextU;
        rays.center.plot(
          `M${objX},${objTopY} L${CONFIG.width},${CONFIG.centerY + slopeCenter * toRight}`,
        );
        rays.third.plot('');
        redrawStatic(nextF, nextU);
        return;
      }

      const imgTopY = objY - objH * phys.m;
      imageArrow.opacity(stateRef.current.occluded ? 0.35 : 0.7);
      imageArrow.transform(
        new Matrix().translate(imgX, objY).scale(Math.abs(phys.m), phys.m, imgX, objY),
      );

      if (phys.v > 0) {
        rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`);
        rays.center.plot(
          `M${objX},${objTopY} L${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`,
        );
      } else {
        const slopeParallel = (CONFIG.centerY - objTopY) / nextF;
        rays.parallel.plot(
          `M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${CONFIG.width},${
            objTopY + slopeParallel * toRight
          }`,
        );
        const slopeCenter = (CONFIG.centerY - objTopY) / nextU;
        rays.center.plot(
          `M${objX},${objTopY} L${CONFIG.width},${CONFIG.centerY + slopeCenter * toRight}`,
        );
        rays.virtualParallel.plot(`M${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`);
        rays.virtualCenter.plot(`M${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`);
      }

      // 第三条特殊光线：入射光线延长线过焦点，出射光线平行主光轴
      const focalX = CONFIG.centerX - nextF;
      const denom = objX - focalX;
      if (Math.abs(denom) > 1e-6) {
        const yLens = CONFIG.centerY + ((objTopY - CONFIG.centerY) * nextF) / denom;
        if (Math.abs(yLens) < 4000) {
          rays.third.plot(`M${objX},${objTopY} L${CONFIG.centerX},${yLens} L${CONFIG.width},${yLens}`);
          if (phys.v < 0) rays.virtualThird.plot(`M${CONFIG.centerX},${yLens} L${imgX},${imgTopY}`);
        } else {
          rays.third.plot('');
        }
      } else {
        rays.third.plot('');
      }

      redrawStatic(nextF, nextU);
    },
    [redrawStatic],
  );

  const animate = useCallback(() => {
    if (!stateRef.current.animating) return;

    const nextU = stateRef.current.u - stateRef.current.animationSpeed;
    if (nextU <= 30) {
      stateRef.current.animating = false;
      setAnimating(false);
      return;
    }

    stateRef.current.u = nextU;
    setU(nextU);
    updateScene(nextU, stateRef.current.f);

    requestRef.current = requestAnimationFrame(animate);
  }, [updateScene]);

  useEffect(() => {
    if (animating) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animating, animate]);

  // 拖拽交互：物体箭头改变物距，光屏改变承接位置（pointer 事件 + setPointerCapture）
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.style.touchAction = 'none';

    const toSvgPoint = (clientX: number, clientY: number) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: clientX, y: clientY };
      const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: pt.x, y: pt.y };
    };

    const hitObject = (pt: { x: number; y: number }) => {
      const objX = CONFIG.centerX - stateRef.current.u;
      return Math.abs(pt.x - objX) <= 22 && pt.y >= CONFIG.centerY - 90 && pt.y <= CONFIG.centerY + 12;
    };

    const hitScreen = (pt: { x: number; y: number }) =>
      Math.abs(pt.x - stateRef.current.screenX) <= 12 &&
      pt.y >= CONFIG.centerY - CONFIG.screenHeight / 2 - 10 &&
      pt.y <= CONFIG.centerY + CONFIG.screenHeight / 2 + 10;

    const dragMode = { current: 'none' as 'none' | 'object' | 'screen' };

    const onPointerDown = (e: PointerEvent) => {
      const pt = toSvgPoint(e.clientX, e.clientY);
      if (hitObject(pt)) dragMode.current = 'object';
      else if (hitScreen(pt)) dragMode.current = 'screen';
      else return;

      stateRef.current.animating = false;
      setAnimating(false);
      e.preventDefault();
      svg.style.cursor = 'grabbing';
      svg.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = toSvgPoint(e.clientX, e.clientY);
      if (dragMode.current === 'none') {
        svg.style.cursor = hitObject(pt) || hitScreen(pt) ? 'grab' : 'default';
        return;
      }

      if (dragMode.current === 'object') {
        const uMax = uMaxFor(stateRef.current.f);
        const nextU = Math.min(uMax, Math.max(CONFIG.uMin, CONFIG.centerX - pt.x));
        stateRef.current.u = nextU;
        setU(nextU);
        updateScene(nextU, stateRef.current.f);
      } else {
        const nextX = Math.min(CONFIG.screenMaxX, Math.max(CONFIG.screenMinX, pt.x));
        stateRef.current.screenX = nextX;
        updateScene(stateRef.current.u, stateRef.current.f);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragMode.current === 'none') return;
      dragMode.current = 'none';
      if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
      const pt = toSvgPoint(e.clientX, e.clientY);
      svg.style.cursor = hitObject(pt) || hitScreen(pt) ? 'grab' : 'default';
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.style.touchAction = '';
      svg.style.cursor = '';
    };
  }, [updateScene]);

  useSVGScene(svgRef, (s) => {
    // 三段区段背景（画在最底层）
    const zoneBandTop = CONFIG.centerY - 110;
    const zoneBandHeight = 220;
    const zones = ZONES.map((zone) => {
      const rect = s
        .rect(0, zoneBandHeight)
        .move(0, zoneBandTop)
        .fill({ color: palette.reference, opacity: 0.03 });
      const label = s
        .text(zone.text)
        .attr({ x: 0, y: zoneBandTop - 8, 'text-anchor': 'middle' })
        .fill(palette.reference)
        .font({ size: '10px' });
      return { id: zone.id, rect, label };
    });

    // 主光轴
    s.line(
      CONFIG.centerX - CONFIG.axisLength / 2,
      CONFIG.centerY,
      CONFIG.centerX + CONFIG.axisLength / 2,
      CONFIG.centerY,
    ).stroke({ color: palette.reference, width: 2 });

    // 凸透镜
    s.ellipse(CONFIG.lensWidth, CONFIG.lensHeight)
      .center(CONFIG.centerX, CONFIG.centerY)
      .fill({ color: palette.lensGlass, opacity: 0.5 })
      .stroke({ color: palette.reference, width: 2 });

    s.line(
      CONFIG.centerX,
      CONFIG.centerY - CONFIG.lensHeight / 2,
      CONFIG.centerX,
      CONFIG.centerY + CONFIG.lensHeight / 2,
    ).stroke({ color: palette.reference, width: 1, dasharray: '2,2', opacity: 0.5 });

    // 焦点 / 倍焦点 / 光心标记（位置随焦距重绘）
    const marks = (['F', '2F', "F'", "2F'", 'O'] as const).map((kind) => {
      const dot = s.circle(8).center(CONFIG.centerX, CONFIG.centerY).fill(palette.canvasText);
      const label = s
        .text(kind)
        .attr({ x: CONFIG.centerX, y: CONFIG.centerY + 20, 'text-anchor': 'middle' })
        .fill(palette.canvasText)
        .font({ size: '12px' });
      return { dot, label, kind };
    });

    s.text('主光轴')
      .move(CONFIG.centerX - CONFIG.axisLength / 2, CONFIG.centerY)
      .fill(palette.canvasText)
      .font({ size: '12px' });

    // 光屏（绘制在像箭头之下，避免遮住像）
    const screenGroup = s.group();
    screenGroup
      .rect(CONFIG.screenWidth, CONFIG.screenHeight)
      .center(0, CONFIG.centerY)
      .fill({ color: palette.canvasBg, opacity: 0.9 })
      .stroke({ color: palette.objectStroke, width: 2 });
    screenGroup.add(
      s
        .text('光屏')
        .attr({ x: 0, y: CONFIG.centerY + CONFIG.screenHeight / 2 + 16, 'text-anchor': 'middle' })
        .fill(palette.canvasText)
        .font({ size: '12px' }),
    );

    // Helpers
    const createArrow = (color: string) => {
      const g = s.group();
      g.line(0, 0, 0, -60).stroke({ color, width: 4 });
      g.polygon('-5,-60 5,-60 0,-75').fill(color);
      return g;
    };

    const objectArrow = createArrow(palette.object);
    const imageArrow = createArrow(palette.object).opacity(0.7);

    const rayAttr = { color: palette.ray, width: 2 };
    const virtualRayAttr = { color: palette.ray, width: 1, dasharray: '4,4' };

    const rays = {
      parallel: s.path('').stroke(rayAttr).fill('none'),
      center: s.path('').stroke(rayAttr).fill('none'),
      third: s.path('').stroke(rayAttr).fill('none'),
      virtualParallel: s.path('').stroke(virtualRayAttr).fill('none'),
      virtualCenter: s.path('').stroke(virtualRayAttr).fill('none'),
      virtualThird: s.path('').stroke(virtualRayAttr).fill('none'),
    };

    snapRef.current = { s, objectArrow, imageArrow, screenGroup, marks, zones, rays };
    updateScene(stateRef.current.u, stateRef.current.f);
  });

  const handlePlay = () => {
    const uMax = uMaxFor(stateRef.current.f);
    if (stateRef.current.u <= 35) {
      stateRef.current.u = uMax;
      setU(uMax);
    }
    stateRef.current.animating = true;
    setAnimating(true);
  };

  const handlePause = () => {
    stateRef.current.animating = false;
    setAnimating(false);
  };

  const handleReset = () => {
    stateRef.current.animating = false;
    stateRef.current.f = CONFIG.fDefault;
    stateRef.current.u = CONFIG.uDefault;
    stateRef.current.screenX = CONFIG.screenDefaultX;
    stateRef.current.occluded = false;
    setAnimating(false);
    setF(CONFIG.fDefault);
    setU(CONFIG.uDefault);
    setOccluded(false);
    updateScene(CONFIG.uDefault, CONFIG.fDefault);
  };

  const handleFChange = (nextF: number) => {
    const nextU = Math.min(stateRef.current.u, uMaxFor(nextF));
    stateRef.current.animating = false;
    stateRef.current.f = nextF;
    stateRef.current.u = nextU;
    setAnimating(false);
    setF(nextF);
    setU(nextU);
    updateScene(nextU, nextF);
  };

  const handleUChange = (nextU: number) => {
    stateRef.current.animating = false;
    stateRef.current.u = nextU;
    setAnimating(false);
    setU(nextU);
    updateScene(nextU, stateRef.current.f);
  };

  const handleToggleOcclusion = () => {
    const next = !stateRef.current.occluded;
    stateRef.current.occluded = next;
    setOccluded(next);
    updateScene(stateRef.current.u, stateRef.current.f);
  };

  const isFiniteV = Number.isFinite(data.v);
  const imageHeight = isFiniteV ? Math.abs(data.m) * CONFIG.objHeight : Infinity;
  const imageSide = !isFiniteV ? '不成像' : data.v > 0 ? '异侧' : '同侧';
  const catchText = !isFiniteV ? '不能承接' : data.v > 0 ? '可承接' : '不可承接';

  const kpiItems: KpiItem[] = [
    { label: '物距 u', value: u.toFixed(0) },
    { label: '像距 v', value: isFiniteV ? Math.round(data.v).toString() : '∞' },
    {
      label: '放大率 m',
      value: isFiniteV ? data.m.toFixed(2) : '∞',
      hint: `像高 h′ ${isFiniteV ? Math.round(imageHeight).toString() : '∞'}`,
    },
    { label: '成像性质', value: data.typeText.replace(/\s+/g, '') },
    { label: '像的位置', value: imageSide, hint: `光屏${catchText}` },
  ];

  const screenToneClass =
    data.screenTone === 'clear'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : data.screenTone === 'blur'
        ? 'border-amber-300 bg-amber-50 text-amber-700'
        : 'border-slate-300 bg-slate-50 text-slate-600';

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="光线传播路径" variant="slate">
            平行于主光轴的光线经凸透镜后过焦点；过光心的光线方向不变；过焦点的光线出射后平行主光轴。
          </PrincipleCard>
          <PrincipleCard title="成像特性" variant="slate">
            物距大于焦距时形成倒立实像，可用光屏承接；物距小于焦距时形成正立虚像，光屏接不到；物距等于焦距时出射光平行，不成像。
          </PrincipleCard>
          <PrincipleCard title="凸透镜成像规律" variant="slate">
            凸透镜成像遵循薄透镜公式：1/f = 1/u + 1/v，其中 f 为焦距，u 为物距，v 为像距。
          </PrincipleCard>
        </>
      }
      extra={
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-muted-foreground">相关演示：</span>
            <Link className="text-primary underline-offset-4 hover:underline" to="/lens-imaging-rules/">
              凸透镜成像规律对照表（五种物距一次看完）
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" to="/concave-lens/">
              凹透镜成像规律动画演示（可拖动）
            </Link>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">实验考点速查</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXAM_TIPS.map((tip) => (
                <article key={tip.title} className="rounded-md border bg-card p-3">
                  <h3 className="font-medium">{tip.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tip.body}</p>
                </article>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              五种物距对应的像距与像的性质，见
              <Link className="text-primary underline-offset-4 hover:underline" to="/lens-imaging-rules/">
                成像规律对照表
              </Link>
              ；本页只演示光具座操作与光屏承接。
            </p>
          </div>
        </div>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox="0 0 800 500">
          <div
            data-screen-hint
            className={`absolute right-2 top-2 rounded-md border px-2 py-1 text-xs font-medium shadow-sm ${screenToneClass}`}
          >
            光屏：{data.screenText}
          </div>
        </SimulationCanvas>
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实验控制</h3>
          <DemoControls
            isPlaying={animating}
            onToggle={() => (animating ? handlePause() : handlePlay())}
            onReset={handleReset}
            hoverTip={
              <>
                点击自动演示，或
                <p className="font-bold">拖动画面中的物体箭头 / 光屏，滑动下方滑块</p>
                调整物距与光屏位置。
              </>
            }
          />

          <ParamSlider
            label="物距 u"
            value={u}
            min={CONFIG.uMin}
            max={uMaxFor(f)}
            step={1}
            onValueChange={handleUChange}
            formatValue={(v) => v.toFixed(0)}
          />

          <ParamSlider
            label="焦距 f"
            value={f}
            min={CONFIG.fMin}
            max={CONFIG.fMax}
            step={CONFIG.fStep}
            onValueChange={handleFChange}
            formatValue={(v) => v.toFixed(0)}
          />

          <Button
            type="button"
            variant={occluded ? 'secondary' : 'outline'}
            size="sm"
            className="w-full"
            onClick={handleToggleOcclusion}
          >
            {occluded ? '已遮住透镜上半部分' : '遮住透镜上半部分'}
          </Button>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default ConvexLensSim;