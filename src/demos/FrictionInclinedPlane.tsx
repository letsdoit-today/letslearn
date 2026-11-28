import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { G, Path, Text } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { ArrowUp } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { useSVGScene } from '@/hooks/useSVGScene';
import { calculateInclinedPlaneForces, type InclinedPlaneForces } from '@/lib/physics/inclinedPlane';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoMain } from '@/components/demo/DemoMain';
import { KpiBar, type KpiItem } from '@/components/demo/KpiBar';
import { DemoControls } from '@/components/demo/DemoControls';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import { buildDemoSEO, getDemoBySlug } from '@/lib/Meta';
import { palette } from '@/lib/palette';

const SLUG = 'friction-inclined-plane';
const demo = getDemoBySlug(SLUG);
const name = demo.name;

const CONFIG = {
  pivotX: 600,
  pivotY: 350,
  plankLength: 350,
  blockSize: 42,
  maxAngle: 80,
  angleRate: 12,
  pixelsPerMeter: 40,
  vectorScale: 1.4,
  topPos: -245,
  bottomPos: -21,
  risingSpeed: 6,
  criticalTolerance: 1,
  g: 9.8,
  massDefault: 10,
  massMin: 1,
  massMax: 20,
  muDefault: 0.5,
  muMin: 0,
  muMax: 1,
};

type Phase = 'static' | 'critical' | 'sliding' | 'rising';

interface SimState {
  theta: number;
  thetaRad: number;
  mass: number;
  mu: number;
  phase: Phase;
  blockPos: number;
  velocity: number;
  playing: boolean;
  paused: boolean;
  reachedBottom: boolean;
  lastTs: number | null;
}

const PHASE_TEXT: Record<Phase, string> = {
  static: '静止',
  critical: '临界',
  sliding: '下滑',
  rising: '上滑',
};

const EXAM_TIPS = [
  {
    title: '临界角 tanθc = μ',
    body: '临界角是物体「恰好开始下滑」的倾角。μ = 0.5 时 θc ≈ 26.6°，倾角一旦超过它，重力沿斜面的分力就大于最大静摩擦力，物体开始下滑。',
  },
  {
    title: '临界角与质量无关',
    body: '质量加倍时，下滑分力 Gx = mg sinθ 与最大静摩擦 μN = μmg cosθ 同比例加倍，两者之比仍是 tanθ 与 μ 的比较，所以 θc 不变。把质量滑块来回拖动，临界斜面纹丝不动。',
  },
  {
    title: '静止时 f = Gx，不是 μN',
    body: '静摩擦力是「按需供给」的：物体不动时 f 恰好等于下滑分力 Gx，只有即将滑动时才达到最大值 μN。把「当前摩擦力」与「最大静摩擦」两个读数对照看，静止时前者总是更小。',
  },
  {
    title: '摩擦力方向看相对运动趋势',
    body: '物体下滑时摩擦力沿斜面向上；用「初速度上滑」让物体冲上斜面，摩擦力立刻反向、沿斜面向下。方向永远与相对运动（或趋势）相反，与物体是否在动无关。',
  },
  {
    title: '斜面越陡越容易下滑',
    body: '倾角增大时 Gx = mg sinθ 增大、N = mg cosθ 减小，于是「拉你下滑的力」变大而「能提供的最大摩擦」变小，两头同时发力。这就是陡坡更难站稳的定量解释。',
  },
];

const MU_TABLE = [
  { mu: 0.1, thetaC: 5.7 },
  { mu: 0.2, thetaC: 11.3 },
  { mu: 0.3, thetaC: 16.7 },
  { mu: 0.5, thetaC: 26.6 },
  { mu: 0.8, thetaC: 38.7 },
  { mu: 1.0, thetaC: 45.0 },
];

const FrictionInclinedPlane: React.FC = () => {
  useSEO(buildDemoSEO(SLUG));

  const svgRef = useRef<SVGSVGElement>(null);
  const requestRef = useRef<number | null>(null);

  const [theta, setTheta] = useState(0);
  const [mass, setMass] = useState(CONFIG.massDefault);
  const [mu, setMu] = useState(CONFIG.muDefault);
  const [phase, setPhase] = useState<Phase>('static');
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [forces, setForces] = useState<InclinedPlaneForces>(() =>
    calculateInclinedPlaneForces({
      mass: CONFIG.massDefault,
      g: CONFIG.g,
      mu: CONFIG.muDefault,
      angleRad: 0,
      isSliding: false,
    }),
  );

  const stateRef = useRef<SimState>({
    theta: 0,
    thetaRad: 0,
    mass: CONFIG.massDefault,
    mu: CONFIG.muDefault,
    phase: 'static',
    blockPos: CONFIG.topPos,
    velocity: 0,
    playing: false,
    paused: false,
    reachedBottom: false,
    lastTs: null,
  });

  const snapRef = useRef<{
    plank: G;
    ghost: G;
    ghostLabel: Text;
    block: G;
    vecG: Path;
    vecN: Path;
    vecF: Path;
    vecGx: Path;
    vecGy: Path;
    labelG: Text;
    labelN: Text;
    labelF: Text;
    labelGx: Text;
    labelGy: Text;
  } | null>(null);

  const computeForces = useCallback((state: SimState, kinetic: boolean): InclinedPlaneForces => {
    const rising = state.phase === 'rising';
    return calculateInclinedPlaneForces({
      mass: state.mass,
      g: CONFIG.g,
      mu: state.mu,
      angleRad: state.thetaRad,
      isSliding: kinetic && !rising,
      isRising: rising,
    });
  }, []);

  const draw = useCallback(() => {
    if (!snapRef.current) return;
    const { plank, ghost, ghostLabel, block, vecG, vecN, vecF, vecGx, vecGy, labelG, labelN, labelF, labelGx, labelGy } =
      snapRef.current;
    const state = stateRef.current;
    const physics = computeForces(state, state.phase === 'sliding' || state.phase === 'rising');
    const thetaCDeg = (physics.thetaC * 180) / Math.PI;

    plank.transform(new Matrix().translate(CONFIG.pivotX, CONFIG.pivotY).rotate(state.theta, CONFIG.pivotX, CONFIG.pivotY));
    ghost.transform(new Matrix().translate(CONFIG.pivotX, CONFIG.pivotY).rotate(thetaCDeg, CONFIG.pivotX, CONFIG.pivotY));

    const ghostEndX = CONFIG.pivotX - CONFIG.plankLength * Math.cos(physics.thetaC);
    const ghostEndY = CONFIG.pivotY - CONFIG.plankLength * Math.sin(physics.thetaC);
    ghostLabel.attr({ x: ghostEndX, y: ghostEndY - 12 });

    block.transform({ translateX: state.blockPos, translateY: 0 });

    const scale = CONFIG.vectorScale;
    const cx = 0;
    const cy = -7 - CONFIG.blockSize / 2;

    const gx = physics.Gx * scale;
    const gy = physics.Gy * scale;
    const nLen = physics.N * scale;
    const fLen = physics.f * scale;
    const frictionSign = state.phase === 'rising' ? 1 : -1;

    vecG.plot(`M${cx},${cy} l${gx},${gy}`);
    vecGx.plot(`M${cx},${cy} l${gx},0`);
    vecGy.plot(`M${cx},${cy} l0,${gy}`);
    vecN.plot(`M${cx},${cy} l0,${-nLen}`);
    vecF.plot(`M${cx},${cy + CONFIG.blockSize / 2} l${frictionSign * fLen},0`);

    const offset = 14;
    const place = (label: Text, x: number, y: number) => {
      label.attr({ x, y });
      label.transform({ rotate: -state.theta, origin: [x, y] });
    };

    place(labelG, cx + gx, cy + gy + offset);
    place(labelGx, cx + gx + offset, cy);
    place(labelGy, cx - offset, cy + gy / 2);
    place(labelN, cx, cy - nLen - offset);
    place(labelF, cx + frictionSign * (fLen + offset), cy + CONFIG.blockSize / 2);
  }, [computeForces]);

  const sync = useCallback(() => {
    const state = stateRef.current;
    const kinetic = state.phase === 'sliding' || state.phase === 'rising';
    setForces(computeForces(state, kinetic));
    setTheta(state.theta);
    setMass(state.mass);
    setMu(state.mu);
    setPhase(state.phase);
    setPlaying(state.playing && !state.paused);
    setPaused(state.paused);
    setReachedBottom(state.reachedBottom);
  }, [computeForces]);

  const tick = useCallback(
    (ts: number) => {
      const state = stateRef.current;
      if (state.lastTs === null) state.lastTs = ts;
      const dt = Math.min((ts - state.lastTs) / 1000, 0.05);
      state.lastTs = ts;

      if (!state.paused) {
        if (state.phase === 'static' || state.phase === 'critical') {
          if (state.playing) {
            state.theta = Math.min(CONFIG.maxAngle, state.theta + CONFIG.angleRate * dt);
            state.thetaRad = (state.theta * Math.PI) / 180;
            if (state.theta >= CONFIG.maxAngle) state.playing = false;
          }

          const check = computeForces(state, false);
          const thetaCDeg = (check.thetaC * 180) / Math.PI;
          if (check.Gx > check.fMax) {
            state.phase = 'sliding';
            state.velocity = 0;
          } else if (Math.abs(state.theta - thetaCDeg) <= CONFIG.criticalTolerance) {
            state.phase = 'critical';
          } else {
            state.phase = 'static';
          }
        } else {
          const physics = computeForces(state, true);
          state.velocity += physics.accel * dt;
          state.blockPos += state.velocity * dt * CONFIG.pixelsPerMeter;

          if (state.phase === 'rising') {
            if (state.blockPos <= CONFIG.topPos) {
              state.blockPos = CONFIG.topPos;
              state.velocity = 0;
              const rest = computeForces(state, false);
              state.phase = rest.Gx > rest.fMax ? 'sliding' : 'static';
              if (state.phase === 'static') state.playing = false;
            } else if (state.velocity >= 0) {
              state.velocity = 0;
              const rest = computeForces(state, false);
              state.phase = rest.Gx > rest.fMax ? 'sliding' : 'static';
              if (state.phase === 'static') state.playing = false;
            }
          } else if (state.blockPos >= CONFIG.bottomPos) {
            state.blockPos = CONFIG.bottomPos;
            state.velocity = 0;
            state.playing = false;
            state.reachedBottom = true;
          }
        }
      }

      sync();
      draw();

      if (state.playing) {
        requestRef.current = requestAnimationFrame(tick);
      } else {
        requestRef.current = null;
      }
    },
    [computeForces, draw, sync],
  );

  const startLoop = useCallback(() => {
    if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    stateRef.current.lastTs = null;
    requestRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const refresh = useCallback(() => {
    const state = stateRef.current;
    const check = computeForces(state, false);
    const thetaCDeg = (check.thetaC * 180) / Math.PI;
    if (state.phase !== 'sliding' && state.phase !== 'rising') {
      if (check.Gx > check.fMax) state.phase = 'sliding';
      else if (Math.abs(state.theta - thetaCDeg) <= CONFIG.criticalTolerance) state.phase = 'critical';
      else state.phase = 'static';
    }
    state.lastTs = null;
    sync();
    draw();
  }, [computeForces, draw, sync]);

  useSVGScene(svgRef, (s) => {
    const staticLayer = s.group();
    const plankLayer = s.group();
    const blockLayer = s.group();

    staticLayer.add(
      s.line(50, CONFIG.pivotY, 650, CONFIG.pivotY).stroke({
        color: palette.objectStroke,
        width: 4,
        linecap: 'round',
      }),
    );
    staticLayer.add(s.circle(12).center(CONFIG.pivotX, CONFIG.pivotY).fill(palette.objectStroke));

    const ghost = s.group();
    ghost
      .rect(CONFIG.plankLength, 14)
      .move(-CONFIG.plankLength, -7)
      .radius(3.5)
      .attr({
        fill: 'none',
        stroke: palette.plankStroke,
        'stroke-width': 1.4,
        'stroke-opacity': 0.7,
        'stroke-dasharray': '8,6',
      });
    const ghostLabel = s
      .text('临界斜面 θc')
      .attr({ x: 0, y: 0, 'text-anchor': 'end' })
      .fill(palette.plankStroke)
      .font({ size: '12px' });
    staticLayer.add(ghost);
    staticLayer.add(ghostLabel);

    const plank = s.rect(CONFIG.plankLength, 14).move(-CONFIG.plankLength, -7).radius(3.5).attr({
      fill: palette.plank,
      stroke: palette.plankStroke,
      'stroke-width': 1.4,
    });
    plankLayer.add(plank);
    plankLayer.transform({ translate: [CONFIG.pivotX, CONFIG.pivotY] });

    const block = s
      .rect(CONFIG.blockSize, CONFIG.blockSize)
      .move(-CONFIG.blockSize / 2, -CONFIG.blockSize - 7)
      .attr({ fill: palette.object, stroke: palette.objectStroke, 'stroke-width': 1.4 });
    blockLayer.add(block);
    plankLayer.add(blockLayer);

    const createArrow = (color: string, opacity = 1) => {
      const marker = s
        .marker(9, 6, function (add) {
          add.path('M0,0 L0,6 L9,3 z').fill(color);
        })
        .ref(9, 3);

      return s
        .path('M0,0 L0,0')
        .stroke({ color, width: 2.8 })
        .marker('end', marker)
        .opacity(opacity);
    };

    const vecG = createArrow(palette.forceGravity);
    const vecN = createArrow(palette.forceNormal);
    const vecF = createArrow(palette.forceFriction);
    const vecGx = createArrow(palette.forceComponent, 0.75);
    const vecGy = createArrow(palette.forceComponent, 0.45);

    blockLayer.add(vecG).add(vecN).add(vecF).add(vecGx).add(vecGy);

    const createLabel = (text: string, color: string, opacity = 1) =>
      s
        .text(text)
        .move(0, 0)
        .attr({
          fill: color,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-size': '16px',
          'font-weight': 'bold',
        })
        .opacity(opacity);

    const labelG = createLabel('G', palette.forceGravity);
    const labelN = createLabel('N', palette.forceNormal);
    const labelF = createLabel('f', palette.forceFriction);
    const labelGx = createLabel('Gx', palette.forceComponent, 0.75);
    const labelGy = createLabel('Gy', palette.forceComponent, 0.45);

    blockLayer.add(labelG).add(labelN).add(labelF).add(labelGx).add(labelGy);

    snapRef.current = {
      plank: plankLayer,
      ghost,
      ghostLabel,
      block: blockLayer,
      vecG,
      vecN,
      vecF,
      vecGx,
      vecGy,
      labelG,
      labelN,
      labelF,
      labelGx,
      labelGy,
    };

    draw();
  });

  useEffect(() => {
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleToggle = () => {
    const state = stateRef.current;
    if (state.playing && !state.paused) {
      state.paused = true;
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      sync();
      return;
    }

    if (state.playing && state.paused) {
      state.paused = false;
      sync();
      startLoop();
      return;
    }

    if (state.reachedBottom) {
      state.blockPos = CONFIG.topPos;
      state.velocity = 0;
      state.reachedBottom = false;
      state.phase = 'static';
    }
    if (state.phase === 'rising' && state.blockPos >= CONFIG.topPos) {
      state.phase = 'static';
    }

    state.playing = true;
    state.paused = false;
    sync();
    startLoop();
  };

  const handleReset = () => {
    if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    requestRef.current = null;

    stateRef.current = {
      theta: 0,
      thetaRad: 0,
      mass: CONFIG.massDefault,
      mu: CONFIG.muDefault,
      phase: 'static',
      blockPos: CONFIG.topPos,
      velocity: 0,
      playing: false,
      paused: false,
      reachedBottom: false,
      lastTs: null,
    };
    setMass(CONFIG.massDefault);
    setMu(CONFIG.muDefault);
    refresh();
  };

  const handleThetaChange = (value: number) => {
    const state = stateRef.current;
    state.playing = false;
    state.paused = false;
    state.theta = value;
    state.thetaRad = (value * Math.PI) / 180;
    if (state.phase === 'sliding' || state.phase === 'rising') {
      state.phase = 'static';
      state.velocity = 0;
      state.blockPos = CONFIG.topPos;
      state.reachedBottom = false;
    }
    refresh();
  };

  const handleMassChange = (value: number) => {
    const state = stateRef.current;
    state.mass = value;
    refresh();
  };

  const handleMuChange = (value: number) => {
    const state = stateRef.current;
    state.mu = value;
    refresh();
  };

  const handleRising = () => {
    const state = stateRef.current;
    state.playing = false;
    state.paused = false;
    state.blockPos = CONFIG.bottomPos;
    state.velocity = -CONFIG.risingSpeed;
    state.phase = 'rising';
    state.reachedBottom = false;
    state.playing = true;
    sync();
    startLoop();
  };

  const thetaCDeg = (forces.thetaC * 180) / Math.PI;
  const isKinetic = phase === 'sliding' || phase === 'rising';
  const phaseText = phase === 'sliding' && reachedBottom ? '到达底端' : PHASE_TEXT[phase];

  const kpiItems: KpiItem[] = [
    { label: '倾角 θ', value: `${theta.toFixed(1)}°` },
    { label: '临界角 θc', value: `${thetaCDeg.toFixed(1)}°`, hint: `tanθc = μ = ${mu.toFixed(2)}` },
    { label: '下滑分力 Gx', value: `${forces.Gx.toFixed(1)} N`, color: palette.forceComponent },
    { label: '最大静摩擦 f_max', value: `${forces.fMax.toFixed(1)} N` },
    { label: '当前摩擦力 f', value: `${forces.f.toFixed(1)} N`, color: palette.forceFriction },
    {
      label: '运动状态',
      value: phaseText,
      hint: isKinetic ? `a = ${Math.abs(forces.accel).toFixed(2)} m/s²` : `f / f_max = ${forces.fMax > 0 ? (forces.f / forces.fMax * 100).toFixed(0) : 0}%`,
    },
  ];

  const chipTone =
    phase === 'sliding'
      ? 'bg-red-100 text-red-700'
      : phase === 'critical'
        ? 'bg-amber-100 text-amber-700'
        : phase === 'rising'
          ? 'bg-sky-100 text-sky-700'
          : 'bg-white/90 text-slate-700';

  return (
    <DemoPage
      title={name}
      description={demo.description}
      principles={
        <>
          <PrincipleCard title="斜面受力分析" variant="slate">
            物体在斜面上受重力 G、支持力 N 与摩擦力 f。重力可正交分解为沿斜面的下滑分力 Gx = mg sinθ 与垂直斜面的分力 Gy = mg cosθ，画布上同时画出这两个分力。
          </PrincipleCard>
          <PrincipleCard title="静摩擦与滑动摩擦" variant="slate">
            静止时静摩擦力按需供给，f = Gx，只要不超过最大值 μN；当 Gx 超过 μN 时物体开始下滑，摩擦力变为滑动摩擦力 f = μN。
          </PrincipleCard>
          <PrincipleCard title="临界条件" variant="slate">
            临界角 θc 满足 tanθc = μ。倾角小于 θc 时物体静止，大于 θc 时下滑；θc 只由摩擦系数决定，与物体质量无关。
          </PrincipleCard>
        </>
      }
      reference={
        <>
          参考常量：重力 G = {forces.G.toFixed(1)} N ｜ 支持力 N = {forces.N.toFixed(1)} N ｜ 垂直分力 Gy ={' '}
          {forces.Gy.toFixed(1)} N（G 由质量与 g 决定，N、Gy 随倾角变化，此处不再重复进入 KPI）
        </>
      }
      extra={
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-muted-foreground">相关演示：</span>
            <Link className="text-primary underline-offset-4 hover:underline" to="/lever-balance/">
              杠杆平衡条件
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" to="/falling-ball/">
              球体落液受力分析
            </Link>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">实验考点速查</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXAM_TIPS.map((tip) => (
                <article key={tip.title} className="rounded-md border bg-card p-3">
                  <h3 className="font-medium">{tip.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tip.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-lg font-semibold">摩擦系数与临界角对照表</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">摩擦系数 μ</th>
                    {MU_TABLE.map((row) => (
                      <th key={row.mu} className="py-2 pr-4 font-medium">
                        {row.mu.toFixed(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-muted-foreground">临界角 θc</td>
                    {MU_TABLE.map((row) => (
                      <td key={row.mu} className="py-2 pr-4 font-mono">
                        {row.thetaC.toFixed(1)}°
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              把摩擦系数滑块调到 0 即为光滑斜面，此时 θc = 0°，物体在任意倾角下都会下滑，加速度为 g sinθ。本页只覆盖斜面与摩擦；抛体运动、碰撞、弹簧振子与圆周运动不在本页范围内。
            </p>
          </div>
        </div>
      }
    >
      <DemoMain>
        <SimulationCanvas svgRef={svgRef} viewBox="0 0 700 500">
          <div className={`absolute left-4 top-4 rounded px-2 py-1 text-sm font-bold ${chipTone}`}>
            {phaseText}
            {phase === 'critical' ? '：即将下滑' : ''}
            {phase === 'rising' ? '：摩擦力已反向' : ''}
          </div>
        </SimulationCanvas>
        <KpiBar items={kpiItems} />
      </DemoMain>

      <DemoSidebar>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">实验控制</h3>
          <DemoControls
            isPlaying={playing}
            onToggle={handleToggle}
            onReset={handleReset}
            playLabel={paused ? '继续' : '自动演示'}
            hoverTip={
              <>
                点击自动演示，倾角会从 0° 匀速抬升；
                <p className="font-bold">随时拖动下方倾角滑块接管，或点「初速度上滑」观察摩擦力反向。</p>
              </>
            }
          />

          <div className="space-y-3">
            <ParamSlider
              label="倾角 θ"
              value={theta}
              min={0}
              max={CONFIG.maxAngle}
              step={1}
              onValueChange={handleThetaChange}
              formatValue={(v) => `${v.toFixed(0)}°`}
            />
            <ParamSlider
              label="物体质量 m"
              value={mass}
              min={CONFIG.massMin}
              max={CONFIG.massMax}
              step={1}
              onValueChange={handleMassChange}
              formatValue={(v) => `${v.toFixed(0)} kg`}
            />
            <ParamSlider
              label="摩擦系数 μ"
              value={mu}
              min={CONFIG.muMin}
              max={CONFIG.muMax}
              step={0.05}
              onValueChange={handleMuChange}
              formatValue={(v) => v.toFixed(2)}
            />
          </div>

          <button
            type="button"
            onClick={handleRising}
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <ArrowUp className="h-4 w-4" /> 初速度上滑
          </button>
        </div>
      </DemoSidebar>
    </DemoPage>
  );
};

export default FrictionInclinedPlane;