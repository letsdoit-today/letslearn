import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SVG, Svg, G, Path, Matrix } from '@svgdotjs/svg.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const ConcaveLensSim: React.FC = () => {
  useSEO({
    title: '凹透镜成像模拟 - 光学物理演示 | Physics Learn',
    description: '交互式凹透镜成像物理实验，模拟光线通过凹透镜的折射路径，可视化虚像形成和光学成像原理。',
    keywords: '凹透镜成像,光学实验,虚像形成,透镜折射,物理光学',
    canonical: 'https://learn.letsdoit.today/concave-lens',
    ogImage: 'https://learn.letsdoit.today/og-concave-lens.jpg'
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

  const calculatePhysics = (u: number) => {
    const f = -CONFIG.f;
    const v = (u * f) / (u - f);
    const m = -v / u;
    const typeKey = "image-type-upright-reduced-virtual";
    return { v, m, typeKey };
  };

  const updateScene = useCallback((u: number) => {
    if (!snapRef.current) return;
    const { objectArrow, imageArrow, rays } = snapRef.current;

    const phys = calculatePhysics(u);
    setData({
      v: phys.v,
      m: phys.m,
      typeText: "正立、缩小、虚像"
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
    const imgTopY = objY - (objH * phys.m); // Or calculate from ray intersection
    // Ideally, virtual focus ray goes from Lens(cx, objTopY) to Focus(cx-f, cy)
    // But we only draw the dashed part relevant to the image?
    // Let's match original logic: Lens -> Image
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

  useEffect(() => {
    if (!svgRef.current) return;
    const s = SVG(svgRef.current);
    s.clear();

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

  }, []);

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>凹透镜成像模拟</CardTitle>
          <CardDescription>
            改变物距，观察虚像的位置和大小变化。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative border rounded-lg overflow-hidden bg-slate-50">
            <svg ref={svgRef} viewBox="0 0 800 500" className="w-full h-auto" />
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实验控制</h3>
              <div className="flex gap-2">
                <HoverCard>
                  <HoverCardTrigger className='w-full'>
                    {!animating ? (
                      <Button onClick={handlePlay} className="w-full">
                        <Play className="w-4 h-4 mr-2" /> 自动演示
                      </Button>
                    ) : (
                      <Button onClick={handlePause} variant="secondary" className="w-full">
                        <Pause className="w-4 h-4 mr-2" /> 暂停
                      </Button>
                    )}
                  </HoverCardTrigger>
                  <HoverCardContent>
                    点击自动演示，或<p className="font-bold">手动滑动下方的物距</p>以控制物距。
                  </HoverCardContent>
                </HoverCard>
                <Button onClick={handleReset} variant="outline" size="icon">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <Label>物距 u: {u.toFixed(0)}</Label>
                <Slider
                  value={[u]}
                  min={10} max={350} step={1}
                  onValueChange={(vals) => {
                    stateRef.current.animating = false;
                    setAnimating(false);
                    stateRef.current.u = vals[0];
                    setU(vals[0]);
                    updateScene(vals[0]);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实时数据</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">物距 u</span>
                  <span className="font-mono">{u.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">像距 v</span>
                  <span className="font-mono">{Math.round(data.v)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">放大率 m</span>
                  <span className="font-mono">{data.m.toFixed(2)}</span>
                </div>
                <div className="col-span-2 bg-slate-100 p-2 rounded">
                  <span className="text-muted-foreground block">成像性质</span>
                  <span className="font-bold">{data.typeText}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConcaveLensSim;