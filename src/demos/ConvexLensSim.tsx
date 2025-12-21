import React, { useEffect, useRef, useState, useCallback } from 'react';
//@ts-ignore
import Snap from 'snapsvg-cjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const ConvexLensSim: React.FC = () => {
  useSEO({
    title: '凸透镜成像模拟 - 光学物理演示 | Physics Learn',
    description: '交互式凸透镜成像物理实验，模拟光线通过凸透镜的折射路径，可视化实像形成和光学成像原理。',
    keywords: '凸透镜成像,光学实验,实像形成,透镜折射,物理光学',
    canonical: 'https://learn.letsdoit.today/convex-lens',
    ogImage: 'https://learn.letsdoit.today/og-convex-lens.jpg'
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
    s: Snap.Paper;
    objectArrow: Snap.Element;
    imageArrow: Snap.Element;
    rays: {
        parallel: Snap.Element;
        center: Snap.Element;
        virtualParallel: Snap.Element;
        virtualCenter: Snap.Element;
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
    objectArrow.transform(`t${objX},${objY}`);

    const objTopY = objY - objH;

    // Handle Image & Rays
    if (Math.abs(phys.v) === Infinity || Math.abs(phys.v) > 2000) {
        imageArrow.attr({ opacity: 0 });
        rays.virtualParallel.attr({ path: "" });
        rays.virtualCenter.attr({ path: "" });

        const lensHitY = objTopY;
        rays.parallel.attr({ 
            path: `M${objX},${objTopY} L${CONFIG.centerX},${lensHitY} L${CONFIG.centerX + CONFIG.f},${CONFIG.centerY} l${CONFIG.f},${(CONFIG.centerY - lensHitY)}` 
        });
        rays.center.attr({ 
            path: `M${objX},${objTopY} L${CONFIG.centerX + 500},${CONFIG.centerY + (500 / u) * objH}` 
        });
        return;
    }

    imageArrow.attr({ opacity: 1 });
    imageArrow.transform(`t${imgX},${objY} s${Math.abs(phys.m)},${phys.m},0,0`);

    const imgTopY = objY - (objH * phys.m);

    // Solid Rays
    rays.parallel.attr({
        path: `M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`
    });
    rays.center.attr({
        path: `M${objX},${objTopY} L${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`
    });

    // Virtual Rays
    if (u < CONFIG.f) {
        const xEnd = 800;
        const slope1 = (CONFIG.centerY - objTopY) / CONFIG.f;
        const yEnd1 = objTopY + slope1 * (xEnd - CONFIG.centerX);
        rays.parallel.attr({
            path: `M${objX},${objTopY} L${CONFIG.centerX},${objTopY} L${xEnd},${yEnd1}`
        });

        const slope2 = (CONFIG.centerY - objTopY) / u;
        const yEnd2 = CONFIG.centerY + slope2 * (xEnd - CONFIG.centerX);
        rays.center.attr({
            path: `M${objX},${objTopY} L${xEnd},${yEnd2}`
        });

        rays.virtualParallel.attr({
            path: `M${CONFIG.centerX},${objTopY} L${imgX},${imgTopY}`
        });
        rays.virtualCenter.attr({
            path: `M${CONFIG.centerX},${CONFIG.centerY} L${imgX},${imgTopY}`
        });
    } else {
        rays.virtualParallel.attr({ path: "" });
        rays.virtualCenter.attr({ path: "" });
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
    const s = Snap(svgRef.current);
    s.clear();

    // Static Elements
    s.line(
        CONFIG.centerX - CONFIG.axisLength / 2, CONFIG.centerY,
        CONFIG.centerX + CONFIG.axisLength / 2, CONFIG.centerY
    ).attr({ stroke: "#7f8c8d", strokeWidth: 2 });

    s.ellipse(CONFIG.centerX, CONFIG.centerY, CONFIG.lensWidth / 2, CONFIG.lensHeight / 2)
        .attr({ fill: "#ecf0f1", stroke: "#bdc3c7", strokeWidth: 2, fillOpacity: 0.5 });

    s.line(CONFIG.centerX, CONFIG.centerY - CONFIG.lensHeight / 2, CONFIG.centerX, CONFIG.centerY + CONFIG.lensHeight / 2)
        .attr({ stroke: "#3498db", strokeWidth: 1, strokeDasharray: "2,2", opacity: 0.5 });

    const points = [
        { x: CONFIG.centerX - CONFIG.f, label: "F" },
        { x: CONFIG.centerX - 2 * CONFIG.f, label: "2F" },
        { x: CONFIG.centerX + CONFIG.f, label: "F'" },
        { x: CONFIG.centerX + 2 * CONFIG.f, label: "2F'" },
        { x: CONFIG.centerX, label: "O", offset: 15 }
    ];

    points.forEach(p => {
        s.circle(p.x, CONFIG.centerY, 4).attr({ fill: "#2c3e50" });
        s.text(p.x - 5, CONFIG.centerY + (p.offset || 20), p.label).attr({ fill: "#2c3e50", fontSize: "12px" });
    });

    // Helpers
    const createArrow = (color: string) => {
        const g = s.group();
        g.line(0, 0, 0, -60).attr({ stroke: color, strokeWidth: 4 });
        g.polygon(-5, -60, 5, -60, 0, -75).attr({ fill: color });
        return g;
    };

    const objectArrow = createArrow("#2980b9");
    const imageArrow = createArrow("#e74c3c");

    const rayAttr = { stroke: "#f39c12", strokeWidth: 2, fill: "none" };
    const virtualRayAttr = { stroke: "#f39c12", strokeWidth: 1, strokeDasharray: "4,4", fill: "none" };

    const rays = {
        parallel: s.path("").attr(rayAttr),
        center: s.path("").attr(rayAttr),
        virtualParallel: s.path("").attr(virtualRayAttr),
        virtualCenter: s.path("").attr(virtualRayAttr)
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
          <CardTitle>凸透镜成像模拟</CardTitle>
          <CardDescription>
            改变物距，观察像距、放大率及虚实变化。
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
                {!animating ? (
                    <Button onClick={handlePlay} className="w-full">
                        <Play className="w-4 h-4 mr-2" /> 自动演示
                    </Button>
                ) : (
                    <Button onClick={handlePause} variant="secondary" className="w-full">
                        <Pause className="w-4 h-4 mr-2" /> 暂停
                    </Button>
                )}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConvexLensSim;