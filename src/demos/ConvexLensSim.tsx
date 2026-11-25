import { useRef, useState, useCallback, useEffect } from 'react';
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
import Demos, { siteUrl } from '@/lib/Meta';
import { palette } from '@/lib/palette';

const name = '凸透镜成像模拟';

const ConvexLensSim: React.FC = () => {
  useSEO({
    title: `${name} - 光学物理演示 | Physics Learn`,
    description: Demos.find(demo => demo.name === name)?.description || '',
    keywords: '凸透镜成像,光学实验,实像形成,透镜折射,物理光学',
    canonical: `${siteUrl}${Demos.find(demo => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-convex-lens.jpg`
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // State
  const [u, setU] = useState(300);
  const [animating, setAnimating] = useState(false);
  const [data, setData] = useState({
    v: 150,
    m: -0.5,
    typeText: "倒立 缩小 实像"
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
      parallel: Path;
      center: Path;
      virtualParallel: Path;
      virtualCenter: Path;
    };
  } | null>(null);

  const updateScene = useCallback((u: number) => {
    if (!snapRef.current) return;
    const { objectArrow, imageArrow, rays } = snapRef.current;

    const phys = calculateThinLens(u, CONFIG.f);
    setData({
      v: phys.v,
      m: phys.m,
      typeText: imageTypeText(phys.typeKey)
    });

    const objX = CONFIG.centerX - u;
    const objY = CONFIG.centerY;
    const objH = 60;
    const imgX = CONFIG.centerX + phys.v;

    // Draw Object
    objectArrow.transform(new Matrix().translate(objX, objY));

    const objTopY = objY - objH;

    // Handle Image & Rays
    if (Math.abs(phys.v) === Infinity || Math.abs(phys.v) > 2000) {
      imageArrow.opacity(0);
      rays.virtualParallel.plot("");
      rays.virtualCenter.plot("");

      const lensHitY = objTopY;
      rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${lensHitY} L${CONFIG.centerX + CONFIG.f},${CONFIG.centerY} l${CONFIG.f},${(CONFIG.centerY - lensHitY)}`);
      rays.center.plot(`M${objX},${objTopY} L${CONFIG.centerX + 500},${CONFIG.centerY + (500 / u) * objH}`);
      return;
    }

    imageArrow.opacity(1);
    imageArrow.transform(new Matrix().translate(imgX, objY).scale(Math.abs(phys.m), phys.m, imgX, objY));

    const imgTopY = objY - (objH * phys.m);

    // Solid Rays
    rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`);
    rays.center.plot(`M${objX},${objTopY} L${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`);

    // Virtual Rays
    if (u < CONFIG.f) {
      const xEnd = 800;
      const slope1 = (CONFIG.centerY - objTopY) / CONFIG.f;
      const yEnd1 = objTopY + slope1 * (xEnd - CONFIG.centerX);
      rays.parallel.plot(`M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${xEnd},${yEnd1}`);

      const slope2 = (CONFIG.centerY - objTopY) / u;
      const yEnd2 = CONFIG.centerY + slope2 * (xEnd - CONFIG.centerX);
      rays.center.plot(`M${objX},${objTopY} L${xEnd},${yEnd2}`);

      rays.virtualParallel.plot(`M${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`);
      rays.virtualCenter.plot(`M${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`);
    } else {
      rays.virtualParallel.plot("");
      rays.virtualCenter.plot("");
    }
  }, []);

  const animate = useCallback(() => {
    if (!stateRef.current.animating) return;

    let nextU = stateRef.current.u - stateRef.current.animationSpeed;
    if (nextU <= 30) {
      stateRef.current.animating = false;
      setAnimating(false);
      return;
    }

    if (Math.abs(nextU - CONFIG.f) < 1) {
      nextU = CONFIG.f - 1.5;
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
    // Static Elements
    s.line(
      CONFIG.centerX - CONFIG.axisLength / 2, CONFIG.centerY,
      CONFIG.centerX + CONFIG.axisLength / 2, CONFIG.centerY
    ).stroke({ color: palette.reference, width: 2 });

    s.ellipse(CONFIG.lensWidth, CONFIG.lensHeight).center(CONFIG.centerX, CONFIG.centerY)
      .fill({ color: palette.lensGlass, opacity: 0.5 }).stroke({ color: palette.reference, width: 2 });

    s.line(CONFIG.centerX, CONFIG.centerY - CONFIG.lensHeight / 2, CONFIG.centerX, CONFIG.centerY + CONFIG.lensHeight / 2)
      .stroke({ color: palette.reference, width: 1, dasharray: "2,2", opacity: 0.5 });

    const points = [
      { x: CONFIG.centerX - CONFIG.f, label: "F" },
      { x: CONFIG.centerX - 2 * CONFIG.f, label: "2F" },
      { x: CONFIG.centerX + CONFIG.f, label: "F'" },
      { x: CONFIG.centerX + 2 * CONFIG.f, label: "2F'" },
      { x: CONFIG.centerX, label: "O", offset: 15 }
    ];

    points.forEach(p => {
      s.circle(8).center(p.x, CONFIG.centerY).fill(palette.canvasText);
      s.text(p.label).move(p.x - 5, CONFIG.centerY + (p.offset || 20)).fill(palette.canvasText).font({ size: "12px" });
    });

    s.text("主光轴").move(CONFIG.centerX - CONFIG.axisLength / 2, CONFIG.centerY).fill(palette.canvasText).font({ size: "12px" });

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
    const virtualRayAttr = { color: palette.ray, width: 1, dasharray: "4,4" };

    const rays = {
      parallel: s.path("").stroke(rayAttr).fill("none"),
      center: s.path("").stroke(rayAttr).fill("none"),
      virtualParallel: s.path("").stroke(virtualRayAttr).fill("none"),
      virtualCenter: s.path("").stroke(virtualRayAttr).fill("none")
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

  const kpiItems: KpiItem[] = [
    { label: '物距 u', value: u.toFixed(0) },
    { label: '像距 v', value: Math.abs(data.v) === Infinity ? "∞" : Math.round(data.v).toString() },
    { label: '放大率 m', value: Math.abs(data.m) === Infinity ? "∞" : data.m.toFixed(2) },
    { label: '成像性质', value: data.typeText },
  ];

  return (
    <DemoPage
      title={name}
      description={Demos.find(demo => demo.name === name)?.description || ''}
      principles={
        <>
          <PrincipleCard title="光线传播路径" variant="slate">
            平行于主光轴的光线通过凸透镜后汇聚在焦点；通过光心的光线方向不变。
          </PrincipleCard>
          <PrincipleCard title="成像特性" variant="slate">
            物距大于焦距时形成倒立实像，物距小于焦距时形成正立虚像，物距等于焦距时不成像。
          </PrincipleCard>
          <PrincipleCard title="凸透镜成像规律" variant="slate">
            凸透镜成像遵循薄透镜公式：1/f = 1/u + 1/v，其中f为焦距，u为物距，v为像距。
          </PrincipleCard>
        </>
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
      </DemoSidebar>
    </DemoPage>
  );
};

export default ConvexLensSim;