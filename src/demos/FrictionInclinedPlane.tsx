import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SVG, Svg, G, Path, Text, Matrix } from '@svgdotjs/svg.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

const FrictionInclinedPlane: React.FC = () => {
  useSEO({
    title: '斜面摩擦实验 - 力学物理演示 | Physics Learn',
    description: '交互式斜面摩擦物理实验，模拟物体在斜面上的受力分析，可视化重力、支持力、摩擦力的平衡关系。',
    keywords: '斜面摩擦,力学实验,受力分析,摩擦力,物理力学',
    canonical: 'https://learn.letsdoit.today/friction-inclined-plane',
    ogImage: 'https://learn.letsdoit.today/og-friction-inclined-plane.jpg'
  });

  const svgRef = useRef<SVGSVGElement>(null);
  
  // Simulation State
  const [mu, setMu] = useState(0.5);
  const [angle, setAngle] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<string>("静止状态");
  const [physicsData, setPhysicsData] = useState({
    G: 0,
    N: 0,
    Gx: 0,
    f: 0,
    f_max: 0
  });

  // Animation Refs
  const requestRef = useRef<number>();
  const stateRef = useRef({
    angle: 0,
    angleRad: 0,
    mu: 0.5,
    mass: 10,
    g: 9.8,
    isSimulating: false,
    isPaused: false,
    isSliding: false,
    blockPos: -245, // Scaled from original logic
    velocity: 0,
    simSpeed: 0.2
  });
  
  // Snap Elements Ref
  const snapRef = useRef<{
    s: Svg;
    plank: G;
    block: G;
    vecG: Path;
    vecN: Path;
    vecF: Path;
    vecGx: Path;
    labelG: Text;
    labelN: Text;
    labelF: Text;
    labelGx: Text;
  } | null>(null);

  // Constants
  const PIVOT_X = 600;
  const PIVOT_Y = 350;
  const PLANK_LENGTH = 350; // Scaled
  const BLOCK_SIZE = 42; // Scaled

  const updatePhysics = useCallback(() => {
    const state = stateRef.current;
    const { mass, g, mu, angleRad, isSliding } = state;

    const G = mass * g;
    const N = G * Math.cos(angleRad);
    const Gx = G * Math.sin(angleRad);
    const f_max = mu * N;

    let f = 0;
    if (isSliding) {
      f = mu * N;
    } else {
      f = Gx;
    }

    setPhysicsData({ G, N, Gx, f, f_max });
    setAngle(state.angle);

    return { G, N, Gx, f, f_max };
  }, []);

  const draw = useCallback(() => {
    if (!snapRef.current) return;
    const { plank, block, vecG, vecN, vecF, vecGx, labelG, labelN, labelF, labelGx } = snapRef.current;
    const state = stateRef.current;
    
    // 1. Rotate Plank
    plank.transform(new Matrix().translate(PIVOT_X, PIVOT_Y).rotate(state.angle, PIVOT_X, PIVOT_Y));

    // 2. Position Block
    block.transform({ translateX: state.blockPos, translateY: 0 });

    // 3. Draw Vectors
    const scale = 1.4; // Scaled
    const physics = {
        G: state.mass * state.g,
        N: state.mass * state.g * Math.cos(state.angleRad),
        Gx: state.mass * state.g * Math.sin(state.angleRad),
        f: state.isSliding ? state.mu * state.mass * state.g * Math.cos(state.angleRad) : state.mass * state.g * Math.sin(state.angleRad)
    };

    const cx = 0;
    const cy = -7 - BLOCK_SIZE/2;

    const gLen = physics.G * scale;
    const gx = gLen * Math.sin(state.angleRad);
    const gy = gLen * Math.cos(state.angleRad);

    vecG.plot(`M${cx},${cy} l${gx},${gy}`);

    const nLen = physics.N * scale;
    vecN.plot(`M${cx},${cy} l0,${-nLen}`);

    const fLen = physics.f * scale;
    vecF.plot(`M${cx},${cy + BLOCK_SIZE/2} l${-fLen},0`);

    const gxLen = physics.Gx * scale;
    vecGx.plot(`M${cx},${cy} l${gxLen},0`);

    // Update Labels
    const labelOffset = 14;
    
    labelG.attr({ x: cx + gx, y: cy + gy + labelOffset });
    labelG.transform({ rotate: -state.angle, origin: [cx + gx, cy + gy + labelOffset] });

    labelN.attr({ x: cx, y: cy - nLen - labelOffset });
    labelN.transform({ rotate: -state.angle, origin: [cx, cy - nLen - labelOffset] });

    labelF.attr({ x: cx - fLen - labelOffset, y: cy + BLOCK_SIZE/2 });
    labelF.transform({ rotate: -state.angle, origin: [cx - fLen - labelOffset, cy + BLOCK_SIZE/2] });

    labelGx.attr({ x: cx + gxLen + labelOffset, y: cy });
    labelGx.transform({ rotate: -state.angle, origin: [cx + gxLen + labelOffset, cy] });

  }, []);

  const loop = useCallback(() => {
    const state = stateRef.current;
    
    if (!state.isSimulating) {
        requestRef.current = requestAnimationFrame(loop);
        return;
    }

    if (!state.isPaused) {
        const physics = {
            G: state.mass * state.g,
            N: state.mass * state.g * Math.cos(state.angleRad),
            Gx: state.mass * state.g * Math.sin(state.angleRad),
            f_max: state.mu * state.mass * state.g * Math.cos(state.angleRad)
        };

        if (!state.isSliding) {
            if (physics.Gx > physics.f_max) {
                state.isSliding = true;
                setStatus("物体开始下滑！(Gₓ > f_max)");
            } else {
                if (state.angle < 80) {
                    state.angle += state.simSpeed;
                    state.angleRad = state.angle * Math.PI / 180;
                }
            }
        } else {
            const forceNet = physics.Gx - (state.mu * physics.N);
            const acc = forceNet / state.mass;
            state.velocity += acc * 0.5;
            state.blockPos += state.velocity;

            if (state.blockPos > -BLOCK_SIZE/2) {
                state.isSimulating = false;
                setIsRunning(false);
                setStatus("物体到达底端");
            }
        }
        updatePhysics();
        draw();
    }
    
    requestRef.current = requestAnimationFrame(loop);
  }, [draw, updatePhysics]);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const s = SVG(svgRef.current);
    s.clear();
    
    // Layers
    const staticLayer = s.group();
    const plankLayer = s.group();
    const blockLayer = s.group();

    // Static Ground
    staticLayer.add(s.line(50, PIVOT_Y, 650, PIVOT_Y).stroke({
        color: "#7f8c8d", width: 4, linecap: "round"
    }));
    staticLayer.add(s.circle(12).center(PIVOT_X, PIVOT_Y).fill("#2c3e50"));

    // Plank
    const plank = s.rect(PLANK_LENGTH, 14).move(-PLANK_LENGTH, -7).radius(3.5).attr({
        fill: "#d35400", stroke: "#a04000", "stroke-width": 1.4
    });
    plankLayer.add(plank);
    plankLayer.transform({ translate: [PIVOT_X, PIVOT_Y] });

    // Block
    const block = s.rect(BLOCK_SIZE, BLOCK_SIZE).move(-BLOCK_SIZE/2, -BLOCK_SIZE - 7).attr({
        fill: "#95a5a6", stroke: "#7f8c8d", "stroke-width": 1.4
    });
    blockLayer.add(block);
    plankLayer.add(blockLayer);

    // Arrows
    const createArrow = (color: string) => {
        const marker = s.marker(9, 6, function(add) {
            add.path("M0,0 L0,6 L9,3 z").fill(color);
        }).ref(9, 3);
        
        return s.path("M0,0 L0,0").stroke({
            color: color, width: 2.8
        }).marker('end', marker);
    };

    const vecG = createArrow("#e74c3c");
    const vecN = createArrow("#2ecc71");
    const vecF = createArrow("#3498db");
    const vecGx = createArrow("#9b59b6").opacity(0.5);

    blockLayer.add(vecG).add(vecN).add(vecF).add(vecGx);

    // Labels
    const labelSize = "16px";
    const createLabel = (text: string, color: string) => 
        s.text(text).move(0, 0).attr({ 
            fill: color, "text-anchor": "middle", "dominant-baseline": "middle", 
            "font-size": labelSize, "font-weight": "bold" 
        });

    const labelG = createLabel("G", "#e74c3c");
    const labelN = createLabel("N", "#2ecc71");
    const labelF = createLabel("f", "#3498db");
    const labelGx = createLabel("Gx", "#9b59b6").opacity(0.5);

    blockLayer.add(labelG).add(labelN).add(labelF).add(labelGx);

    snapRef.current = {
        s, plank: plankLayer, block: blockLayer,
        vecG, vecN, vecF, vecGx,
        labelG, labelN, labelF, labelGx
    };

    draw();
    requestRef.current = requestAnimationFrame(loop);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop, draw]);

  // Handle Controls
  const handleStart = () => {
    stateRef.current.isSimulating = true;
    stateRef.current.isPaused = false;
    setIsRunning(true);
    setIsPaused(false);
    setStatus("抬升中...");
  };

  const handlePause = () => {
    stateRef.current.isPaused = !stateRef.current.isPaused;
    setIsPaused(stateRef.current.isPaused);
  };

  const handleReset = () => {
    stateRef.current = {
        ...stateRef.current,
        angle: 0,
        angleRad: 0,
        isSimulating: false,
        isPaused: false,
        isSliding: false,
        blockPos: -245,
        velocity: 0
    };
    setIsRunning(false);
    setIsPaused(false);
    setStatus("静止状态");
    updatePhysics();
    draw();
  };

  const handleMuChange = (val: number) => {
    setMu(val);
    stateRef.current.mu = val;
    if (!stateRef.current.isSimulating) {
        updatePhysics();
        draw();
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>斜面摩擦力分析</CardTitle>
          <CardDescription>
            演示物体在斜面上的受力情况，观察静摩擦力转变为滑动摩擦力的过程。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative border rounded-lg overflow-hidden bg-slate-50">
            <svg ref={svgRef} viewBox="0 0 700 400" className="w-full h-auto" />
            <div className={`absolute top-4 left-4 p-2 rounded text-sm font-bold ${
                status.includes("下滑") ? "bg-red-100 text-red-700" : "bg-white/90 text-slate-700"
            }`}>
                {status}
            </div>
          </div>
          
          <div className="w-full lg:w-80 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实验控制</h3>
              <div className="flex gap-2">
                {!isRunning ? (
                    <Button onClick={handleStart} className="w-full">
                        <Play className="w-4 h-4 mr-2" /> 自动演示
                    </Button>
                ) : (
                    <Button onClick={handlePause} variant="secondary" className="w-full">
                        {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                        {isPaused ? "继续" : "暂停"}
                    </Button>
                )}
                <Button onClick={handleReset} variant="outline" size="icon">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <Label>摩擦系数 (μ): {mu.toFixed(2)}</Label>
                <Slider 
                  value={[mu]} 
                  min={0.1} max={1.0} step={0.05}
                  onValueChange={(vals) => handleMuChange(vals[0])}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实时数据</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">倾角 θ</span>
                  <span className="font-mono text-lg">{angle.toFixed(1)}°</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">重力 G</span>
                  <span className="font-mono text-[#e74c3c]">{physicsData.G.toFixed(1)} N</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">支持力 N</span>
                  <span className="font-mono text-[#2ecc71]">{physicsData.N.toFixed(1)} N</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">下滑分力 Gx</span>
                  <span className="font-mono text-[#9b59b6]">{physicsData.Gx.toFixed(1)} N</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">最大静摩擦 f_max</span>
                  <span className="font-mono">{physicsData.f_max.toFixed(1)} N</span>
                </div>
                <div className="col-span-2 bg-slate-100 p-2 rounded">
                  <span className="text-muted-foreground block">当前摩擦力 f</span>
                  <span className="font-mono text-[#3498db] font-bold">{physicsData.f.toFixed(1)} N</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FrictionInclinedPlane;