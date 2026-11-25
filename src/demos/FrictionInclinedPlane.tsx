import { useEffect, useRef, useState, useCallback } from 'react';
import type { G, Path, Text } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { calculateInclinedPlaneForces } from '@/lib/physics/inclinedPlane';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { DataPanel, type DataItem } from '@/components/demo/DataPanel';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import Demos, { siteUrl } from '@/lib/Meta';
import { palette } from '@/lib/palette';

const name = '斜面摩擦实验';

const FrictionInclinedPlane: React.FC = () => {
  useSEO({
    title: `${name} - 力学物理演示 | Physics Learn`,
    description: Demos.find(demo => demo.name === name)?.description || '',
    keywords: '斜面摩擦,力学实验,受力分析,摩擦力,物理力学',
    canonical: `${siteUrl}${Demos.find(demo => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-friction-inclined-plane.jpg`
  });

  const svgRef = useRef<SVGSVGElement>(null);
  
  // Simulation State
  const [mu, setMu] = useState(0.5);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState<string>("静止状态");
  const [angle, setAngle] = useState(0);
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
    blockPos: -245,
    velocity: 0,
    simSpeed: 0.2
  });
  
  // Snap Elements Ref
  const snapRef = useRef<{
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
  const PLANK_LENGTH = 350;
  const BLOCK_SIZE = 42;

  const updatePhysics = useCallback(() => {
    const state = stateRef.current;
    const { mass, g, mu, angleRad, isSliding } = state;

    const forces = calculateInclinedPlaneForces({ mass, g, mu, angleRad, isSliding });

    setPhysicsData({ G: forces.G, N: forces.N, Gx: forces.Gx, f: forces.f, f_max: forces.fMax });
    setAngle(state.angle);
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
    const scale = 1.4;
    const physics = calculateInclinedPlaneForces({
      mass: state.mass,
      g: state.g,
      mu: state.mu,
      angleRad: state.angleRad,
      isSliding: state.isSliding,
    });

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
        const physics = calculateInclinedPlaneForces({
            mass: state.mass,
            g: state.g,
            mu: state.mu,
            angleRad: state.angleRad,
            isSliding: state.isSliding,
        });

        if (!state.isSliding) {
            if (physics.Gx > physics.fMax) {
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

  useSVGScene(svgRef, (s) => {
    // Layers
    const staticLayer = s.group();
    const plankLayer = s.group();
    const blockLayer = s.group();

    // Static Ground
    staticLayer.add(s.line(50, PIVOT_Y, 650, PIVOT_Y).stroke({
        color: palette.objectStroke, width: 4, linecap: "round"
    }));
    staticLayer.add(s.circle(12).center(PIVOT_X, PIVOT_Y).fill(palette.objectStroke));

    // Plank
    const plank = s.rect(PLANK_LENGTH, 14).move(-PLANK_LENGTH, -7).radius(3.5).attr({
        fill: palette.plank, stroke: palette.plankStroke, "stroke-width": 1.4
    });
    plankLayer.add(plank);
    plankLayer.transform({ translate: [PIVOT_X, PIVOT_Y] });

    // Block
    const block = s.rect(BLOCK_SIZE, BLOCK_SIZE).move(-BLOCK_SIZE/2, -BLOCK_SIZE - 7).attr({
        fill: palette.object, stroke: palette.objectStroke, "stroke-width": 1.4
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

    const vecG = createArrow(palette.forceGravity);
    const vecN = createArrow(palette.forceNormal);
    const vecF = createArrow(palette.forceFriction);
    const vecGx = createArrow(palette.forceComponent).opacity(0.5);

    blockLayer.add(vecG).add(vecN).add(vecF).add(vecGx);

    // Labels
    const labelSize = "16px";
    const createLabel = (text: string, color: string) => 
        s.text(text).move(0, 0).attr({ 
            fill: color, "text-anchor": "middle", "dominant-baseline": "middle", 
            "font-size": labelSize, "font-weight": "bold" 
        });

    const labelG = createLabel("G", palette.forceGravity);
    const labelN = createLabel("N", palette.forceNormal);
    const labelF = createLabel("f", palette.forceFriction);
    const labelGx = createLabel("Gx", palette.forceComponent).opacity(0.5);

    blockLayer.add(labelG).add(labelN).add(labelF).add(labelGx);

    snapRef.current = {
        plank: plankLayer, block: blockLayer,
        vecG, vecN, vecF, vecGx,
        labelG, labelN, labelF, labelGx
    };
  });

  useEffect(() => {
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

  const kpiItems: KpiItem[] = [
    { label: '倾角 θ', value: `${angle.toFixed(1)}°` },
    { label: '下滑分力 Gx', value: `${physicsData.Gx.toFixed(1)} N`, color: palette.forceComponent },
    { label: '最大静摩擦 f_max', value: `${physicsData.f_max.toFixed(1)} N` },
    { label: '当前摩擦力 f', value: `${physicsData.f.toFixed(1)} N`, color: palette.forceFriction },
  ];

  const dataItems: DataItem[] = [
    { label: '重力 G', value: `${physicsData.G.toFixed(1)} N`, color: palette.forceGravity },
    { label: '支持力 N', value: `${physicsData.N.toFixed(1)} N`, color: palette.forceNormal },
  ];

  return (
    <DemoPage
      title={name}
      description={Demos.find(demo => demo.name === name)?.description || ''}
      principles={
        <>
          <PrincipleCard title="斜面受力分析">
            物体在斜面上受到重力G、支持力N和摩擦力f的作用。重力可分解为平行于斜面的下滑分力Gx和垂直于斜面的分力Gy。
          </PrincipleCard>
          <PrincipleCard title="摩擦力特性">
            静摩擦力f随倾角增大而增大，最大静摩擦力f_max = μN。当Gx &gt; f_max时，物体开始滑动，摩擦力变为滑动摩擦力f = μN。
          </PrincipleCard>
          <PrincipleCard title="临界条件">
            临界倾角θ_c满足tanθ_c = μ。当θ &lt; θ_c时物体静止，θ &gt; θ_c时物体下滑。摩擦系数μ越大，临界倾角越大。
          </PrincipleCard>
        </>
      }
    >
      <DemoMain>
      <SimulationCanvas svgRef={svgRef} viewBox="0 0 700 500">
        <div className={`absolute top-4 left-4 p-2 rounded text-sm font-bold ${
            status.includes("下滑") ? "bg-red-100 text-red-700" : "bg-white/90 text-slate-700"
        }`}>
            {status}
        </div>
      </SimulationCanvas>
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
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
          
          <ParamSlider
            label="摩擦系数 (μ)"
            value={mu}
            min={0.1} max={1.0} step={0.05}
            onValueChange={handleMuChange}
            disabled={isRunning}
            formatValue={(v) => v.toFixed(2)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">分量明细</h3>
          <DataPanel items={dataItems} />
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default FrictionInclinedPlane;