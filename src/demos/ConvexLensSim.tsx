import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SVG, Svg, G, Path, Matrix } from '@svgdotjs/svg.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import Demos, { siteUrl } from '@/lib/Meta';

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

  const getImageTypeText = (typeKey: string) => {
    const types: Record<string, string> = {
      'image-type-inverted-enlarged-real': '倒立 放大 实像',
      'image-type-inverted-reduced-real': '倒立 缩小 实像',
      'image-type-inverted-same-real': '倒立 等大 实像',
      'image-type-upright-enlarged-virtual': '正立 放大 虚像',
      'image-type-parallel': '平行'
    };
    return types[typeKey] || typeKey;
  };

  const calculatePhysics = (u: number) => {
    const f = CONFIG.f;
    if (Math.abs(u - f) < 0.1) {
      return { v: Infinity, m: Infinity, typeKey: "image-type-parallel" };
    }
    const v = (u * f) / (u - f);
    const m = -v / u;

    let typeKey = "";
    if (u > f) {
      if (Math.abs(m) > 1) typeKey = "image-type-inverted-enlarged-real";
      else if (Math.abs(m) < 1) typeKey = "image-type-inverted-reduced-real";
      else typeKey = "image-type-inverted-same-real";
    } else {
      typeKey = "image-type-upright-enlarged-virtual";
    }
    return { v, m, typeKey };
  };

  const updateScene = useCallback((u: number) => {
    if (!snapRef.current) return;
    const { objectArrow, imageArrow, rays } = snapRef.current;

    const phys = calculatePhysics(u);
    setData({
      v: phys.v,
      m: phys.m,
      typeText: getImageTypeText(phys.typeKey)
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

  useEffect(() => {
    if (!svgRef.current) return;
    const s = SVG(svgRef.current);
    s.clear();

    // Static Elements
    s.line(
      CONFIG.centerX - CONFIG.axisLength / 2, CONFIG.centerY,
      CONFIG.centerX + CONFIG.axisLength / 2, CONFIG.centerY
    ).stroke({ color: "#7f8c8d", width: 2 });

    s.ellipse(CONFIG.lensWidth, CONFIG.lensHeight).center(CONFIG.centerX, CONFIG.centerY)
      .fill({ color: "#ecf0f1", opacity: 0.5 }).stroke({ color: "#bdc3c7", width: 2 });

    s.line(CONFIG.centerX, CONFIG.centerY - CONFIG.lensHeight / 2, CONFIG.centerX, CONFIG.centerY + CONFIG.lensHeight / 2)
      .stroke({ color: "#3498db", width: 1, dasharray: "2,2", opacity: 0.5 });

    const points = [
      { x: CONFIG.centerX - CONFIG.f, label: "F" },
      { x: CONFIG.centerX - 2 * CONFIG.f, label: "2F" },
      { x: CONFIG.centerX + CONFIG.f, label: "F'" },
      { x: CONFIG.centerX + 2 * CONFIG.f, label: "2F'" },
      { x: CONFIG.centerX, label: "O", offset: 15 }
    ];

    points.forEach(p => {
      s.circle(8).center(p.x, CONFIG.centerY).fill("#2c3e50");
      s.text(p.label).move(p.x - 5, CONFIG.centerY + (p.offset || 20)).fill("#2c3e50").font({ size: "12px" });
    });

    // Helpers
    const createArrow = (color: string) => {
      const g = s.group();
      g.line(0, 0, 0, -60).stroke({ color: color, width: 4 });
      g.polygon("-5,-60 5,-60 0,-75").fill(color);
      return g;
    };

    const objectArrow = createArrow("#2980b9");
    const imageArrow = createArrow("#e74c3c");

    const rayAttr = { color: "#f39c12", width: 2 };
    const virtualRayAttr = { color: "#f39c12", width: 1, dasharray: "4,4" };

    const rays = {
      parallel: s.path("").stroke(rayAttr).fill("none"),
      center: s.path("").stroke(rayAttr).fill("none"),
      virtualParallel: s.path("").stroke(virtualRayAttr).fill("none"),
      virtualCenter: s.path("").stroke(virtualRayAttr).fill("none")
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
          <CardTitle>{name}</CardTitle>
          <CardDescription>
            {Demos.find(demo => demo.name === name)?.description || ''}
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
                  <span className="font-mono">{Math.abs(data.v) === Infinity ? "∞" : Math.round(data.v)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">放大率 m</span>
                  <span className="font-mono">{Math.abs(data.m) === Infinity ? "∞" : data.m.toFixed(2)}</span>
                </div>
                <div className="col-span-2 bg-slate-100 p-2 rounded">
                  <span className="text-muted-foreground block">成像性质</span>
                  <span className="font-bold">{data.typeText}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">原理说明</h3>
              <div className="space-y-3">
                <div className="bg-slate-100 p-3 rounded">
                  <h4 className="text-blue-600 font-bold mb-1 text-sm">1. 凸透镜成像规律</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    凸透镜成像遵循薄透镜公式：1/f = 1/u + 1/v，其中f为焦距，u为物距，v为像距。
                  </p>
                </div>
                <div className="bg-slate-100 p-3 rounded">
                  <h4 className="text-blue-600 font-bold mb-1 text-sm">2. 光线传播路径</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    平行于主光轴的光线通过凸透镜后汇聚在焦点；通过光心的光线方向不变。
                  </p>
                </div>
                <div className="bg-slate-100 p-3 rounded">
                  <h4 className="text-blue-600 font-bold mb-1 text-sm">3. 成像特性</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    物距大于焦距时形成倒立实像，物距小于焦距时形成正立虚像，物距等于焦距时不成像。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConvexLensSim;