import { useRef, useState, useCallback, useEffect } from 'react';
import type { Svg, Path, Text } from '@svgdotjs/svg.js';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { toRad, toDeg, snellFresnel } from '@/lib/physics/refraction';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { DemoControls } from '@/components/demo/DemoControls';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette, rgba } from '@/lib/palette';

const SLUG = 'air-water-refraction';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const AirWaterRefraction: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);

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

  // State
  const [angleDeg, setAngleDeg] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [n1, setN1] = useState(CONFIG.N1);
  const [n2, setN2] = useState(CONFIG.N2);
  const [data, setData] = useState({
    thetaI: 45,
    thetaT: 0,
    R: 0,
    T: 0
  });

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

  const arcPath = (r: number, sx: number, sy: number, ex: number, ey: number, sweep: number) => {
    return `M${sx},${sy} A${r},${r} 0 0 ${sweep} ${ex},${ey}`;
  };

  const updateScene = useCallback((angle: number) => {
    if (!snapRef.current) return;
    const { rays, arcs, angleTexts } = snapRef.current;

    const cx = CONFIG.CENTER_X;
    const cy = CONFIG.CENTER_Y;
    const L = CONFIG.RAY_LENGTH;

    const thetai = toRad(angle);
    const { thetaT: thetat, R, T } = snellFresnel(n1, n2, thetai);

    setData({
      thetaI: angle,
      thetaT: toDeg(thetat),
      R,
      T
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
    
    rays.i.attr({ "stroke-width": 2 + 8 * (R + T)});
    rays.r.attr({ "stroke-width": 2 + 8 * R, "stroke-opacity": 0.6 + 0.4 * R });
    rays.t.plot(`M${cx},${cy} L${tx},${ty}`);
    if(T > 0.01){
      rays.t.attr({ "stroke-width": 2 + 8 * T, "stroke-opacity": 0.6 + 0.4 * T });
    } else {
      rays.t.attr({ "stroke-width": 0, "stroke-opacity": 0 });
    }

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
    arcs.t.plot(arcPath(r, stX, stY, etX, etY, 0));

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

  }, [n1, n2]);

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

  useSVGScene(svgRef, (s) => {
    // Static Elements
    s.line(
      CONFIG.CENTER_X - CONFIG.AXIS_LENGTH / 2, CONFIG.CENTER_Y,
      CONFIG.CENTER_X + CONFIG.AXIS_LENGTH / 2, CONFIG.CENTER_Y
    ).stroke({ color: palette.reference, width: 2 });

    s.line(
      CONFIG.CENTER_X, CONFIG.CENTER_Y - 200,
      CONFIG.CENTER_X, CONFIG.CENTER_Y + 200
    ).stroke({ color: palette.reference, width: 1, dasharray: "5,5" });

    s.rect(800, 400).move(0, CONFIG.CENTER_Y).fill(rgba(palette.water, 0.5));
    s.text("介质1 n₁").move(CONFIG.CENTER_X - 300, CONFIG.CENTER_Y - 40).fill(palette.canvasText).font({ size: "16px" });
    s.text("介质2 n₂").move(CONFIG.CENTER_X - 300, CONFIG.CENTER_Y + 20).fill(palette.canvasText).font({ size: "16px" });

    // Dynamic Elements
    const rays = {
      i: s.path("").stroke({ color: palette.ray, width: 4 }).fill("none"),
      r: s.path("").stroke({ color: palette.ray, width: 4 }).fill("none"),
      t: s.path("").stroke({ color: palette.ray, width: 4 }).fill("none")
    };

    const arcs = {
      i: s.path("").stroke({ color: palette.reference, width: 1 }).fill("none"),
      r: s.path("").stroke({ color: palette.reference, width: 1 }).fill("none"),
      t: s.path("").stroke({ color: palette.reference, width: 1 }).fill("none")
    };

    const angleTexts = {
      i: s.text("").fill(palette.canvasText).font({ size: "12px", anchor: "middle" }),
      r: s.text("").fill(palette.canvasText).font({ size: "12px", anchor: "middle" }),
      t: s.text("").fill(palette.canvasText).font({ size: "12px", anchor: "middle" })
    };

    snapRef.current = { s, rays, arcs, angleTexts };
    updateScene(45);
  });

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

  const kpiItems: KpiItem[] = [
    { label: '入射角 θᵢ', value: `${data.thetaI.toFixed(1)}°` },
    { label: '折射角 θᵗ', value: `${data.thetaT.toFixed(1)}°` },
    { label: '反射比 R', value: data.R.toFixed(3), color: palette.ray },
    { label: '透射比 T', value: data.T.toFixed(3), color: palette.ray },
  ];

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="折射率特性">
            折射率n表示光在真空中的速度与在介质中速度的比值。
            空气折射率约为1.0，水折射率约为1.33，玻璃折射率约为1.5。
          </PrincipleCard>
          <PrincipleCard title="斯涅尔定律">
            光线在不同介质中传播时，入射角θᵢ和折射角θᵗ满足关系：n₁·sinθᵢ = n₂·sinθᵗ。
            当光从光疏介质进入光密介质时，折射角小於入射角。
          </PrincipleCard>
          <PrincipleCard title="菲涅尔公式">
            描述光在界面上的反射和透射比例，计算反射率R和透射率T。
            当入射角接近90°时，反射率趋近于1，发生全反射现象。
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
            isPlaying={isPlaying}
            onToggle={() => (isPlaying ? handlePause() : handlePlay())}
            onReset={handleReset}
            hoverTip={<>点击自动演示，或<p className="font-bold">手动滑动下方的入射角</p>。</>}
          />

          <ParamSlider
            label="入射角"
            value={angleDeg}
            min={0} max={89} step={0.1}
            onValueChange={(v) => {
              stateRef.current.isPlaying = false;
              setIsPlaying(false);
              stateRef.current.angleDeg = v;
              setAngleDeg(v);
              updateScene(v);
            }}
            formatValue={(v) => `${v.toFixed(1)}°`}
          />
          <ParamSlider
            label="介质1折射率 n₁"
            value={n1}
            min={1} max={2} step={0.1}
            onValueChange={(v) => {
              stateRef.current.isPlaying = false;
              setIsPlaying(false);
              setN1(v);
              updateScene(angleDeg);
            }}
            formatValue={(v) => v.toFixed(2)}
          />
          <ParamSlider
            label="介质2折射率 n₂"
            value={n2}
            min={1} max={2} step={0.1}
            onValueChange={(v) => {
              stateRef.current.isPlaying = false;
              setIsPlaying(false);
              setN2(v);
              updateScene(angleDeg);
            }}
            formatValue={(v) => v.toFixed(2)}
          />
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default AirWaterRefraction;