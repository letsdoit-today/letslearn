import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SVG, Svg, Path, Text } from '@svgdotjs/svg.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const AirWaterRefraction: React.FC = () => {
  useSEO({
    title: '空气-水折射实验 - 光学物理演示 | Physics Learn',
    description: '交互式空气-水折射物理实验，模拟光线在不同介质中的折射现象，可视化斯涅尔定律和菲涅尔公式。',
    keywords: '空气水折射,光学实验,斯涅尔定律,菲涅尔公式,物理光学',
    canonical: 'https://learn.letsdoit.today/air-water-refraction',
    ogImage: 'https://learn.letsdoit.today/og-air-water-refraction.jpg'
  });

  const svgRef = useRef<SVGSVGElement>(null);
  
  // State
  const [angleDeg, setAngleDeg] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [data, setData] = useState({
    n1: 1.0,
    n2: 1.33,
    thetaI: 45,
    thetaT: 0,
    R: 0,
    T: 0
  });

  // Constants
  const CONFIG = {
    SVG_WIDTH: 800,
    SVG_HEIGHT: 500,
    CENTER_X: 400,
    CENTER_Y: 250,
    AXIS_LENGTH: 700,
    RAY_LENGTH: 500,
    N1: 1.0,
    N2: 1.33
  };

  const stateRef = useRef({
    angleDeg: 45,
    isPlaying: false,
    animationSpeed: 0.25
  });

  const snapRef = useRef<{
    s: Svg;
    rays: { i: Path; r: Path; t: Path };
    arcs: { i: Path; r: Path; t: Path };
    angleTexts: { i: Text; r: Text; t: Text };
  } | null>(null);

  const requestRef = useRef<number>();

  // Helper Functions
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const fresnel = (n1: number, n2: number, thetai: number, thetat: number) => {
    const ci = Math.cos(thetai);
    const ct = Math.cos(thetat);
    const rs = Math.pow((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), 2);
    const rp = Math.pow((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci), 2);
    const R = 0.5 * (rs + rp);
    let T = 1 - R;
    if (!isFinite(T) || T < 0) T = 0;
    return { R, T };
  };

  const arcPath = (r: number, sx: number, sy: number, ex: number, ey: number, sweep: number) => {
    return `M${sx},${sy} A${r},${r} 0 0 ${sweep} ${ex},${ey}`;
  };

  const updateScene = useCallback((angle: number) => {
    if (!snapRef.current) return;
    const { rays, arcs, angleTexts } = snapRef.current;
    
    const n1 = CONFIG.N1;
    const n2 = CONFIG.N2;
    const cx = CONFIG.CENTER_X;
    const cy = CONFIG.CENTER_Y;
    const L = CONFIG.RAY_LENGTH;

    const thetai = toRad(angle);
    const sint = Math.min(1, (n1 / n2) * Math.sin(thetai));
    const thetat = Math.asin(sint);
    
    const fr = fresnel(n1, n2, thetai, thetat);

    setData({
        n1, n2,
        thetaI: angle,
        thetaT: toDeg(thetat),
        R: fr.R,
        T: fr.T
    });

    // Ray Endpoints
    const ix0 = cx - L * Math.sin(thetai);
    const iy0 = cy - L * Math.cos(thetai);
    const irx = cx + L * Math.sin(thetai);
    const iry = cy - L * Math.cos(thetai);
    const tx = cx + L * Math.sin(thetat);
    const ty = cy + L * Math.cos(thetat);

    rays.i.plot(`M${ix0},${iy0} L${cx},${cy}`);
    rays.r.plot(`M${cx},${cy} L${irx},${iry}`);
    rays.t.plot(`M${cx},${cy} L${tx},${ty}`);

    rays.r.attr({ "stroke-width": 2 + 8 * fr.R, "stroke-opacity": 0.6 + 0.4 * fr.R });
    rays.t.attr({ "stroke-width": 2 + 8 * fr.T, "stroke-opacity": 0.6 + 0.4 * fr.T });

    // Arcs
    const r = 60;
    
    const siX = cx, siY = cy - r;
    const eiX = cx - r * Math.sin(thetai), eiY = cy - r * Math.cos(thetai);
    arcs.i.plot(arcPath(r, siX, siY, eiX, eiY, 0));

    const srX = cx, srY = cy - r;
    const erX = cx + r * Math.sin(thetai), erY = cy - r * Math.cos(thetai);
    arcs.r.plot(arcPath(r, srX, srY, erX, erY, 1));

    const stX = cx, stY = cy + r;
    const etX = cx + r * Math.sin(thetat), etY = cy + r * Math.cos(thetat);
    arcs.t.plot(arcPath(r, stX, stY, etX, etY, 1));

    // Text
    const liX = cx - (r + 18) * Math.sin(thetai / 2);
    const liY = cy - (r + 18) * Math.cos(thetai / 2);
    angleTexts.i.text(`θᵢ ${angle.toFixed(1)}°`).attr({ x: liX, y: liY });

    const lrX = cx + (r + 18) * Math.sin(thetai / 2);
    const lrY = cy - (r + 18) * Math.cos(thetai / 2);
    angleTexts.r.text(`θʳ ${angle.toFixed(1)}°`).attr({ x: lrX, y: lrY });

    const ltX = cx + (r + 18) * Math.sin(thetat / 2);
    const ltY = cy + (r + 18) * Math.cos(thetat / 2);
    angleTexts.t.text(`θᵗ ${toDeg(thetat).toFixed(1)}°`).attr({ x: ltX, y: ltY });

  }, []);

  const animate = useCallback(() => {
    if (!stateRef.current.isPlaying) return;

    let nextAngle = stateRef.current.angleDeg - stateRef.current.animationSpeed;
    if (nextAngle <= 0) {
        nextAngle = 0;
        stateRef.current.isPlaying = false;
        setIsPlaying(false);
    }

    stateRef.current.angleDeg = nextAngle;
    setAngleDeg(nextAngle);
    updateScene(nextAngle);
    
    if (stateRef.current.isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
    }
  }, [updateScene]);

  useEffect(() => {
    if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  useEffect(() => {
    if (!svgRef.current) return;
    const s = SVG(svgRef.current);
    s.clear();

    // Static Elements
    s.line(
        CONFIG.CENTER_X - CONFIG.AXIS_LENGTH/2, CONFIG.CENTER_Y,
        CONFIG.CENTER_X + CONFIG.AXIS_LENGTH/2, CONFIG.CENTER_Y
    ).stroke({ color: "#7f8c8d", width: 2 });

    s.line(
        CONFIG.CENTER_X, CONFIG.CENTER_Y - 200,
        CONFIG.CENTER_X, CONFIG.CENTER_Y + 200
    ).stroke({ color: "#95a5a6", width: 1, dasharray: "5,5" });

    s.rect(800, 400).move(0, CONFIG.CENTER_Y).fill("#a3b0eaff").opacity(0.5);
    s.text("空气 n₁").move(CONFIG.CENTER_X - 300, CONFIG.CENTER_Y - 40).fill("#7f8c8d").font({ size: "16px" });
    s.text("水 n₂").move(CONFIG.CENTER_X - 300, CONFIG.CENTER_Y + 20).fill("#3498dbff").font({ size: "16px" });

    // Dynamic Elements
    const rays = {
        i: s.path("").stroke({ color: "#e74c3c", width: 4 }).fill("none"),
        r: s.path("").stroke({ color: "#e74c3c", width: 4 }).fill("none"),
        t: s.path("").stroke({ color: "#e74c3c", width: 4 }).fill("none")
    };

    const arcs = {
        i: s.path("").stroke({ color: "#7f8c8d", width: 1 }).fill("none"),
        r: s.path("").stroke({ color: "#7f8c8d", width: 1 }).fill("none"),
        t: s.path("").stroke({ color: "#7f8c8d", width: 1 }).fill("none")
    };

    const angleTexts = {
        i: s.text("").fill("#7f8c8d").font({ size: "12px", anchor: "middle" }),
        r: s.text("").fill("#7f8c8d").font({ size: "12px", anchor: "middle" }),
        t: s.text("").fill("#7f8c8d").font({ size: "12px", anchor: "middle" })
    };

    snapRef.current = { s, rays, arcs, angleTexts };
    updateScene(45);

  }, []);

  const handlePlay = () => {
    if (stateRef.current.angleDeg <= 0.1) {
        stateRef.current.angleDeg = 60;
        setAngleDeg(60);
    }
    stateRef.current.isPlaying = true;
    setIsPlaying(true);
  };

  const handlePause = () => {
    stateRef.current.isPlaying = false;
    setIsPlaying(false);
  };

  const handleReset = () => {
    stateRef.current.isPlaying = false;
    stateRef.current.angleDeg = 45;
    setIsPlaying(false);
    setAngleDeg(45);
    updateScene(45);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>空气-水折射/反射演示</CardTitle>
          <CardDescription>
            模拟光线从空气射入水中的折射和反射现象，观察菲涅尔效应。
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
                {!isPlaying ? (
                    <Button onClick={handlePlay} className="w-full">
                        <Play className="w-4 h-4 mr-2" /> 播放动画
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
                <Label>入射角: {angleDeg.toFixed(1)}°</Label>
                <Slider 
                  value={[angleDeg]} 
                  min={0} max={89} step={0.1}
                  onValueChange={(vals) => {
                      stateRef.current.isPlaying = false;
                      setIsPlaying(false);
                      stateRef.current.angleDeg = vals[0];
                      setAngleDeg(vals[0]);
                      updateScene(vals[0]);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实时数据</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">空气折射率 n₁</span>
                  <span className="font-mono">{data.n1.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">水折射率 n₂</span>
                  <span className="font-mono">{data.n2.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">入射角 θᵢ</span>
                  <span className="font-mono">{data.thetaI.toFixed(1)}°</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">折射角 θᵗ</span>
                  <span className="font-mono">{data.thetaT.toFixed(1)}°</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">反射比 R</span>
                  <span className="font-mono text-[#e74c3c]">{data.R.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">透射比 T</span>
                  <span className="font-mono text-[#e74c3c]">{data.T.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AirWaterRefraction;