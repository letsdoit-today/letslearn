import { useRef, useState, useCallback, useEffect } from 'react';
import type { Svg, G, Path } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { calculateThinLens, imageTypeText } from '@/lib/physics/lens';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoControls } from '@/components/demo/DemoControls';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { DataPanel, type DataItem } from '@/components/demo/DataPanel';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import Demos, { siteUrl } from '@/lib/Meta';

const name = '凹透镜成像模拟';

const ConcaveLensSim: React.FC = () => {
  useSEO({
    title: `${name} - 光学物理演示 | Physics Learn`,
    description: Demos.find(demo => demo.name === name)?.description || '',
    keywords: '凹透镜成像,光学实验,虚像形成,透镜折射,物理光学',
    canonical: `${siteUrl}${Demos.find(demo => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-concave-lens.jpg`
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // State
  const [u, setU] = useState(300);
  const [animating, setAnimating] = useState(false);
  const [data, setData] = useState({
    v: -75,
    m: 0.25,
    typeText: "正立、缩小、虚像"
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
    rays.virtualFocus.plot(`M${cx},${objTopY} L${imgX},${imgTopY}`);

    // 4. Center Ray
    const slopeCenter = (cy - objTopY) / (cx - objX);
    const yEndCenter = cy + slopeCenter * (xEnd - cx);
    rays.center.plot(`M${objX},${objTopY} L${cx},${cy} L${xEnd},${yEndCenter}`);

    // 5. Virtual Center (Backwards from Center)
    rays.virtualCenter.plot(`M${cx},${cy} L${imgX},${imgTopY}`);

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

  useSVGScene(svgRef, (s) => {
    const cx = CONFIG.centerX;
    const cy = CONFIG.centerY;
    const w = CONFIG.lensWidth;
    const h = CONFIG.lensHeight;

    // Static Elements
    s.line(cx - CONFIG.axisLength / 2, cy, cx + CONFIG.axisLength / 2, cy)
      .stroke({ color: "#7f8c8d", width: 2 });

    s.path(`
        M ${cx - w / 2},${cy - h / 2}
        L ${cx + w / 2},${cy - h / 2}
        Q ${cx + 5},${cy} ${cx + w / 2},${cy + h / 2}
        L ${cx - w / 2},${cy + h / 2}
        Q ${cx - 5},${cy} ${cx - w / 2},${cy - h / 2}
        Z
    `).fill({ color: "#ecf0f1", opacity: 0.5 }).stroke({ color: "#bdc3c7", width: 2 });

    s.line(cx, cy - h / 2, cx, cy + h / 2)
      .stroke({ color: "#3498db", width: 1, dasharray: "2,2", opacity: 0.5 });

    const points = [
      { x: cx - CONFIG.f, label: "F" },
      { x: cx - 2 * CONFIG.f, label: "2F" },
      { x: cx + CONFIG.f, label: "F'" },
      { x: cx + 2 * CONFIG.f, label: "2F'" },
      { x: cx, label: "O", offset: 15 }
    ];

    points.forEach(p => {
      s.circle(8).center(p.x, cy).fill("#2c3e50");
      s.text(p.label).move(p.x - 5, cy + (p.offset || 20)).fill("#2c3e50").font({ size: "12px" });
    });

    s.text("主光轴").move(cx - CONFIG.axisLength / 2, cy).fill("#2c3e50").font({ size: "12px" });

    // Helpers
    const createArrow = (color: string) => {
      const g = s.group();
      g.line(0, 0, 0, -60).stroke({ color: color, width: 4 });
      g.polygon("-5,-60 5,-60 0,-75").fill(color);
      return g;
    };

    const objectArrow = createArrow("#2980b9");
    const imageArrow = createArrow("#e74c3c").opacity(0.7);

    const rayAttr = { color: "#f39c12", width: 2 };
    const dashedRayAttr = { color: "#f39c12", width: 1, dasharray: "4,4" };

    const rays = {
      incidentParallel: s.path("").stroke(rayAttr).fill("none"),
      refractedParallel: s.path("").stroke(rayAttr).fill("none"),
      virtualFocus: s.path("").stroke(dashedRayAttr).fill("none"),
      virtualCenter: s.path("").stroke(dashedRayAttr).fill("none"),
      center: s.path("").stroke(rayAttr).fill("none")
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

  const dataItems: DataItem[] = [
    { label: '物距 u', value: u.toFixed(0) },
    { label: '像距 v', value: Math.round(data.v).toString() },
    { label: '放大率 m', value: data.m.toFixed(2) },
    { label: '成像性质', value: data.typeText, highlight: true },
  ];

  return (
    <DemoPage
      title={name}
      description={Demos.find(demo => demo.name === name)?.description || ''}
    >
      <SimulationCanvas svgRef={svgRef} viewBox="0 0 800 500" />

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实验控制</h3>
          <DemoControls
            isPlaying={animating}
            onToggle={() => (animating ? handlePause() : handlePlay())}
            onReset={handleReset}
            hoverTip={<>点击自动演示，或<p className="font-bold">手动滑动下方的物距</p>以控制物距。</>}
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

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实时数据</h3>
          <DataPanel items={dataItems} />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">原理说明</h3>
          <div className="space-y-3">
            <PrincipleCard title="凹透镜成像规律">
              凹透镜成像遵循薄透镜公式：1/f = 1/u + 1/v，其中f为负值。凹透镜总是形成正立、缩小的虚像，虚像与物体位于透镜同侧。
            </PrincipleCard>
            <PrincipleCard title="光线传播路径">
              平行于主光轴的光线经凹透镜折射后发散，其反向延长线通过虚焦点；通过光心的光线传播方向不变；两条折射光线的反向延长线交点即为虚像位置。
            </PrincipleCard>
            <PrincipleCard title="成像特性">
              凹透镜成像具有发散特性，虚像大小随物距变化而改变。物距越大，虚像越小；物距越小，虚像越大，但始终为缩小虚像。
            </PrincipleCard>
          </div>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default ConcaveLensSim;