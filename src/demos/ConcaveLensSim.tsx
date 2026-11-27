import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Svg, G, Path } from '@svgdotjs/svg.js';
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
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette } from '@/lib/palette';

const SLUG = 'concave-lens';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const EXAM_TIPS = [
  {
    title: '凹透镜对光有发散作用',
    body: '平行光经过凹透镜后向外发散，反向延长线交于虚焦点。凸透镜会聚、凹透镜发散，是判断透镜类型最直接的依据。',
  },
  {
    title: '焦点是虚焦点',
    body: '凹透镜两侧的焦点都由折射光线的反向延长线相交得到，那里并没有真实的光线通过，因此不能像凸透镜那样用太阳光聚焦测焦距。',
  },
  {
    title: '虚像不能用光屏承接',
    body: '凹透镜对任何物距都只成正立、缩小的虚像，虚像与物同侧，只能透过透镜观察，把光屏放在任何位置都接不到像。',
  },
  {
    title: '近视眼镜就是凹透镜',
    body: '近视眼晶状体折光能力过强，像落在视网膜前。凹透镜先把光线发散，使像后移到视网膜上，所以近视镜片是凹透镜、度数为负。',
  },
  {
    title: '判断透镜类型的三种方法',
    body: '看形状（中间薄边缘厚为凹透镜）；看对光的作用（发散为凹透镜）；看成像（只能成缩小虚像为凹透镜）。',
  },
  {
    title: '物近像近像变大',
    body: '凹透镜与凸透镜的变化趋势不同：物体靠近透镜时，虚像也靠近透镜并变大；物体远离时，虚像向虚焦点靠拢并变小。无论哪种情况，虚像始终小于物体。',
  },
];

const ConcaveLensSim: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);

  // State
  const [u, setU] = useState(300);
  const [animating, setAnimating] = useState(false);
  const [data, setData] = useState({
    v: -75,
    m: 0.25,
    typeText: "正立 缩小 虚像"
  });

  // Constants
  const CONFIG = {
    width: 800,
    height: 500,
    centerX: 400,
    centerY: 250,
    f: 100,
    lensHeight: 200,
    lensWidth: 30,
    axisLength: 700
  };

  const stateRef = useRef({
    u: 300,
    animating: false,
    animationSpeed: 0.5
  });

  const requestRef = useRef<number>();

  const snapRef = useRef<{
    s: Svg;
    objectArrow: G;
    imageArrow: G;
    rays: {
      incidentParallel: Path;
      refractedParallel: Path;
      virtualFocus: Path;
      virtualCenter: Path;
      center: Path;
      thirdIncident: Path;
      thirdRefracted: Path;
      thirdVirtual: Path;
    };
  } | null>(null);

  const updateScene = useCallback((u: number) => {
    if (!snapRef.current) return;
    const { objectArrow, imageArrow, rays } = snapRef.current;

    const phys = calculateThinLens(u, -CONFIG.f);
    setData({
      v: phys.v,
      m: phys.m,
      typeText: imageTypeText(phys.typeKey)
    });

    const cx = CONFIG.centerX;
    const cy = CONFIG.centerY;
    const objX = cx - u;
    const objY = cy;
    const objH = 60;
    const imgX = cx + phys.v;

    objectArrow.transform(new Matrix().translate(objX, objY));
    imageArrow.transform(new Matrix().translate(imgX, objY).scale(phys.m, phys.m, imgX, objY));

    const objTopY = objY - objH;

    // 1. Incident Parallel
    rays.incidentParallel.plot(`M${objX},${objTopY} L${cx},${objTopY}`);

    // 2. Refracted Parallel (Diverging from Focus)
    const slope = (objTopY - cy) / CONFIG.f;
    const xEnd = 800;
    const yEnd = cy + slope * (xEnd - (cx - CONFIG.f));
    rays.refractedParallel.plot(`M${cx},${objTopY} L${xEnd},${yEnd}`);

    // 3. Virtual Focus (Backwards to Focus)
    const imgTopY = objY - (objH * phys.m);
    rays.virtualFocus.plot(`M${cx},${objTopY} L${cx - CONFIG.f},${cy}`);

    // 4. Center Ray
    const slopeCenter = (cy - objTopY) / (cx - objX);
    const yEndCenter = cy + slopeCenter * (xEnd - cx);
    rays.center.plot(`M${objX},${objTopY} L${cx},${cy} L${xEnd},${yEndCenter}`);

    // 5. Virtual Center (Backwards from Center)
    rays.virtualCenter.plot(`M${cx},${cy} L${imgX},${imgTopY}`);

    // 6. Third Ray: aiming at F' on the image side, emerges parallel to the axis
    const denom = cx + CONFIG.f - objX;
    const yLens3 = denom > 0 ? objTopY + ((cy - objTopY) / denom) * (cx - objX) : objTopY;
    rays.thirdIncident.plot(`M${objX},${objTopY} L${cx},${yLens3}`);
    rays.thirdRefracted.plot(`M${cx},${yLens3} L${xEnd},${yLens3}`);
    rays.thirdVirtual.plot(`M${cx},${yLens3} L${imgX},${yLens3}`);

  }, []);

  const animate = useCallback(() => {
    if (!stateRef.current.animating) return;

    let nextU = stateRef.current.u - stateRef.current.animationSpeed;
    if (nextU <= 30) {
      stateRef.current.animating = false;
      setAnimating(false);
      return;
    }

    stateRef.current.u = nextU;
    setU(nextU);
    updateScene(nextU);

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

  // 拖拽交互：直接拖动画面中的物体箭头改变物距（pointer 事件 + setPointerCapture）
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
      return Math.abs(pt.x - objX) <= 22
        && pt.y >= CONFIG.centerY - 90
        && pt.y <= CONFIG.centerY + 12;
    };

    const dragging = { current: false };

    const onPointerDown = (e: PointerEvent) => {
      if (!hitObject(toSvgPoint(e.clientX, e.clientY))) return;
      dragging.current = true;
      stateRef.current.animating = false;
      setAnimating(false);
      e.preventDefault();
      svg.style.cursor = 'grabbing';
      svg.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const pt = toSvgPoint(e.clientX, e.clientY);
      if (!dragging.current) {
        svg.style.cursor = hitObject(pt) ? 'grab' : 'default';
        return;
      }
      const nextU = Math.min(350, Math.max(10, CONFIG.centerX - pt.x));
      stateRef.current.u = nextU;
      setU(nextU);
      updateScene(nextU);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
      svg.style.cursor = hitObject(toSvgPoint(e.clientX, e.clientY)) ? 'grab' : 'default';
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
    const cx = CONFIG.centerX;
    const cy = CONFIG.centerY;
    const w = CONFIG.lensWidth;
    const h = CONFIG.lensHeight;

    // Static Elements
    s.line(cx - CONFIG.axisLength / 2, cy, cx + CONFIG.axisLength / 2, cy)
      .stroke({ color: palette.reference, width: 2 });

    s.path(`
        M ${cx - w / 2},${cy - h / 2}
        L ${cx + w / 2},${cy - h / 2}
        Q ${cx + 5},${cy} ${cx + w / 2},${cy + h / 2}
        L ${cx - w / 2},${cy + h / 2}
        Q ${cx - 5},${cy} ${cx - w / 2},${cy - h / 2}
        Z
    `).fill({ color: palette.lensGlass, opacity: 0.5 }).stroke({ color: palette.reference, width: 2 });

    s.line(cx, cy - h / 2, cx, cy + h / 2)
      .stroke({ color: palette.reference, width: 1, dasharray: "2,2", opacity: 0.5 });

    [
      { x: cx - CONFIG.f, label: "虚焦点 F" },
      { x: cx + CONFIG.f, label: "虚焦点 F′" },
    ].forEach(p => {
      s.circle(8)
        .center(p.x, cy)
        .fill("none")
        .stroke({ color: palette.canvasText, width: 1.5, dasharray: "2,2" });
      s.text(p.label)
        .move(p.x - 26, cy + 20)
        .fill(palette.canvasText)
        .font({ size: "12px" });
    });

    s.circle(8).center(cx, cy).fill(palette.canvasText);
    s.text("O").move(cx - 5, cy + 15).fill(palette.canvasText).font({ size: "12px" });

    s.text("主光轴").move(cx - CONFIG.axisLength / 2, cy).fill(palette.canvasText).font({ size: "12px" });

    // Helpers
    const createArrow = (color: string) => {
      const g = s.group();
      g.line(0, 0, 0, -60).stroke({ color: color, width: 4 });
      g.polygon("-5,-60 5,-60 0,-75").fill(color);
      return g;
    };

    const objectArrow = createArrow(palette.object);
    const imageArrow = createArrow(palette.object).opacity(0.7);

    const rayAttr = { color: palette.ray, width: 2 };
    const dashedRayAttr = { color: palette.ray, width: 1, dasharray: "4,4" };

    const rays = {
      incidentParallel: s.path("").stroke(rayAttr).fill("none"),
      refractedParallel: s.path("").stroke(rayAttr).fill("none"),
      virtualFocus: s.path("").stroke(dashedRayAttr).fill("none"),
      virtualCenter: s.path("").stroke(dashedRayAttr).fill("none"),
      center: s.path("").stroke(rayAttr).fill("none"),
      thirdIncident: s.path("").stroke(rayAttr).fill("none"),
      thirdRefracted: s.path("").stroke(rayAttr).fill("none"),
      thirdVirtual: s.path("").stroke(dashedRayAttr).fill("none")
    };

    snapRef.current = { s, objectArrow, imageArrow, rays };
    updateScene(300);
  });

  const handlePlay = () => {
    if (stateRef.current.u <= 35) {
      stateRef.current.u = 350;
      setU(350);
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
    stateRef.current.u = 300;
    setAnimating(false);
    setU(300);
    updateScene(300);
  };

  const imageHeight = Math.abs(data.m) * 60;

  const kpiItems: KpiItem[] = [
    { label: '物距 u', value: u.toFixed(0) },
    { label: '像距 v', value: Math.round(Math.abs(data.v)).toString() },
    {
      label: '放大率 m',
      value: data.m.toFixed(2),
      hint: `像高 h′ ${Math.round(imageHeight).toString()}`,
    },
    { label: '成像性质', value: data.typeText.replace(/\s+/g, '') },
    { label: '像的位置', value: '同侧', hint: '光屏不可承接' },
  ];

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="凹透镜成像规律">
            凹透镜成像遵循薄透镜公式：1/f = 1/u + 1/v，其中 f 取负值。凹透镜总是形成正立、缩小的虚像，且虚像与物体位于透镜同侧。
          </PrincipleCard>
          <PrincipleCard title="三条特殊光线">
            平行于主光轴的光线折射后发散，反向延长线过物侧虚焦点；过光心的光线方向不变；射向像侧虚焦点的光线折射后平行于主光轴。三条光线的反向延长线交于虚像点。
          </PrincipleCard>
          <PrincipleCard title="虚焦点与虚像">
            凹透镜两侧的焦点都是虚焦点，是折射光线反向延长线的交点，并非光线真实会聚之处。虚像由反向延长线相交而成，因此无法用光屏承接，只能通过透镜观察。
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
            <Link className="text-primary underline-offset-4 hover:underline" to="/convex-lens/">
              凸透镜光具座实验（可拖光屏找清晰像）
            </Link>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">凹透镜考点速查</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXAM_TIPS.map((tip) => (
                <article key={tip.title} className="rounded-md border bg-card p-3">
                  <h3 className="font-medium">{tip.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tip.body}</p>
                </article>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              凸透镜五种物距对应的像距与像的性质，见
              <Link className="text-primary underline-offset-4 hover:underline" to="/lens-imaging-rules/">
                成像规律对照表
              </Link>
              ；本页只讲凹透镜的成像与作图。
            </p>
          </div>
        </div>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox="0 0 800 500" />
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实验控制</h3>
          <DemoControls
            isPlaying={animating}
            onToggle={() => (animating ? handlePause() : handlePlay())}
            onReset={handleReset}
            hoverTip={<>点击自动演示，或<p className="font-bold">拖动画面中的物体 / 滑动下方滑块</p>调整物距。</>}
          />

          <ParamSlider
            label="物距 u"
            value={u}
            min={10} max={350} step={1}
            onValueChange={(v) => {
              stateRef.current.animating = false;
              setAnimating(false);
              stateRef.current.u = v;
              setU(v);
              updateScene(v);
            }}
            formatValue={(v) => v.toFixed(0)}
          />
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default ConcaveLensSim;