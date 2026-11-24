import { useEffect, useRef, useState, useCallback } from 'react';
import type { G, Circle, Line, Polygon, Text } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { useSEO } from '@/hooks/useSEO';
import { useSimulation } from '@/hooks/useSimulation';
import { useSVGScene } from '@/hooks/useSVGScene';
import { simulateFallingBall, type FallingBallState } from '@/lib/physics/fallingBall';
import { DemoPage, SimulationCanvas, DemoSidebar } from '@/components/demo/DemoPage';
import { DemoControls } from '@/components/demo/DemoControls';
import { ParamSlider } from '@/components/demo/ParamSlider';
import { DataPanel, type DataItem } from '@/components/demo/DataPanel';
import { PrincipleCard } from '@/components/demo/PrincipleCard';
import Demos, { siteUrl } from '@/lib/Meta';
import { palette, rgba } from '@/lib/palette';

const name = '球体落入液体实验';

interface SnapContext {
    ball: Circle;
    arrowG: G;
    arrowFb: G;
    arrowFd: G;
    arrowN: G;
}

const FallingBall: React.FC = () => {
    useSEO({
        title: `${name} - 物理力学演示 | Physics Learn`,
        description: Demos.find(demo => demo.name === name)?.description || '',
        keywords: '球体落入液体,浮力实验,重力演示,物理力学,流体阻力',
        canonical: `${siteUrl}${Demos.find(demo => demo.name === name)?.path || ''}`,
        ogImage: `${siteUrl}/og-falling-ball.jpg`
    });

    const svgRef = useRef<SVGSVGElement>(null);
    const [density, setDensity] = useState(1000);
    const [radius, setRadius] = useState(0.07);
    const [rhoBall, setRhoBall] = useState(7800);

    // Physics Constants
    const g = 9.8;
    const Cd = 0.47;
    const pixelsPerMeter = 200;
    const width = 800;
    const height = 500;
    const waterLevel = 200;

    const snapContext = useRef<SnapContext | null>(null);

    const sim = useSimulation<FallingBallState>(
        () => simulateFallingBall({ density, radius, rhoBall, g, Cd, pixelsPerMeter, height, waterLevel }),
        [density, radius, rhoBall],
        { dt: 0.01 },
    );

    useSVGScene(svgRef, (draw) => {
        // Draw Water
        const water = draw.rect(width, height - waterLevel).move(0, waterLevel);
        water.attr({ fill: rgba(palette.water, 0.5), stroke: "none" });

        draw.line(0, waterLevel, width, waterLevel).attr({ stroke: palette.water, "stroke-width": 2 });

        // Draw Ball
        const ball = draw.circle(radius * pixelsPerMeter * 2).center(width / 2, 50);
        ball.attr({ fill: palette.object, stroke: palette.objectStroke, "stroke-width": 2 });

        // Helper for arrows
        const createArrow = (color: string) => {
            const g = draw.group();
            const line = draw.line(0, 0, 0, 50);
            const head = draw.polygon('-5,50 5,50 0,60');
            const label = draw.text("").move(10, 30);

            line.attr({ stroke: color, "stroke-width": 3 });
            head.attr({ fill: color });
            label.attr({ fill: color, "font-size": "14px", "font-weight": "bold" });

            g.add(line);
            g.add(head);
            g.add(label);
            g.hide();
            return g;
        };

        const arrowG = createArrow(palette.forceGravity);
        const arrowFb = createArrow(palette.forceBuoyancy);
        const arrowFd = createArrow(palette.forceDrag);
        const arrowN = createArrow(palette.forceNormal);

        snapContext.current = { ball, arrowG, arrowFb, arrowFd, arrowN };
    });

    const updateVisuals = useCallback((frame: FallingBallState) => {
        const ctx = snapContext.current;
        if (!ctx) return;

        const { ball, arrowG, arrowFb, arrowFd, arrowN } = ctx;

        // Update Ball
        ball.cy(frame.y);
        ball.radius(radius * pixelsPerMeter);

        const updateArrow = (arrow: G, x: number, y: number, length: number, angle: number, text: string) => {
            if (Math.abs(length) < 0.015) {
                arrow.hide();
                return;
            }
            arrow.show();

            const line = arrow.findOne('line') as Line;
            const head = arrow.findOne('polygon') as Polygon;
            const label = arrow.findOne('text') as Text;

            const displayLen = length;

            line.plot(0, 0, 0, displayLen);
            head.plot(`-5,${displayLen} 5,${displayLen} 0,${displayLen + 10}`);
            label.text(text).y(displayLen / 2);

            const matrix = new Matrix().translate(x, y).rotate(angle, x, y);
            arrow.transform(matrix);

            if (angle === 180) {
                label.transform({ rotate: 180, origin: 'center' }).x(-25).y(displayLen / 2);
            } else {
                label.transform({ rotate: 0 }).x(10).y(displayLen / 2);
            }
        };

        const arrowScale = 2;
        updateArrow(arrowG, width / 2, frame.y, frame.G * arrowScale, 0, "G");
        updateArrow(arrowFb, width / 2, frame.y, frame.Fb * arrowScale, 180, "Fb");
        updateArrow(arrowN, width / 2, frame.y + radius * pixelsPerMeter, frame.N * arrowScale, 180, "N");

        if (frame.Fd > 0) {
            updateArrow(arrowFd, width / 2, frame.y, Math.abs(frame.Fd) * arrowScale, 180, "Fd");
        } else {
            updateArrow(arrowFd, width / 2, frame.y, Math.abs(frame.Fd) * arrowScale, 0, "Fd");
        }
    }, [radius, pixelsPerMeter, width]);

    useEffect(() => {
        if (sim.currentFrame) {
            updateVisuals(sim.currentFrame);
        }
    }, [sim.currentFrame, updateVisuals]);

    const currentFrame = sim.currentFrame ?? { t: 0, y: 50, v: 0, G: 0, Fb: 0, Fd: 0, N: 0, Fnet: 0 };
    const currentH = (waterLevel - currentFrame.y) / pixelsPerMeter;

    const dataItems: DataItem[] = [
        { label: '高度 h', value: `${currentH.toFixed(2)} m` },
        { label: '速度 v', value: `${currentFrame.v.toFixed(2)} m/s` },
        { label: '重力 G', value: `${currentFrame.G.toFixed(2)} N`, color: palette.forceGravity },
        { label: '浮力 Fb', value: `${currentFrame.Fb.toFixed(2)} N`, color: palette.forceBuoyancy },
        { label: '阻力 Fd', value: `${Math.abs(currentFrame.Fd).toFixed(2)} N`, color: palette.forceDrag },
        { label: '支持力 N', value: `${currentFrame.N.toFixed(2)} N`, color: palette.forceNormal },
        { label: '净力 Fnet', value: `${currentFrame.Fnet.toFixed(2)} N`, highlight: true },
    ];

    return (
        <DemoPage
            title={name}
            description={Demos.find(demo => demo.name === name)?.description || ''}
        >
            <SimulationCanvas svgRef={svgRef} viewBox={`0 0 ${width} ${height}`}>
                {/* Legend Overlay */}
                <div className="absolute top-4 right-4 bg-white/90 p-3 rounded shadow text-sm space-y-1">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 block" style={{ backgroundColor: palette.forceGravity }}></span> 重力 G</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 block" style={{ backgroundColor: palette.forceBuoyancy }}></span> 浮力 Fb</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 block" style={{ backgroundColor: palette.forceDrag }}></span> 阻力 Fd</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 block" style={{ backgroundColor: palette.forceNormal }}></span> 支持力 N</div>
                </div>
            </SimulationCanvas>

            <DemoSidebar>
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">实验控制</h3>
                    <DemoControls
                        isPlaying={sim.isRunning}
                        onToggle={sim.toggle}
                        onReset={sim.reset}
                        hoverTip={<>点击自动演示，或<p className="font-bold">手动滑动下方的时间轴</p>以控制时间。</>}
                    />

                    <div className="space-y-3">
                        <ParamSlider
                            label="液体密度 (ρ)"
                            value={density}
                            min={800} max={1200} step={50}
                            onValueChange={setDensity}
                            formatValue={(v) => `${v} kg/m³`}
                        />
                        <ParamSlider
                            label="球体密度 (ρ)"
                            value={rhoBall}
                            min={1000} max={20000} step={100}
                            onValueChange={setRhoBall}
                            formatValue={(v) => `${v} kg/m³`}
                        />
                        <ParamSlider
                            label="球半径 (r)"
                            value={radius}
                            min={0.05} max={0.2} step={0.01}
                            onValueChange={setRadius}
                            formatValue={(v) => `${v} m`}
                        />
                        <ParamSlider
                            label="时间 (t)"
                            value={sim.time}
                            min={0} max={sim.maxTime} step={0.01}
                            onValueChange={(v) => { sim.pause(); sim.setTime(v); }}
                            formatValue={(v) => `${v.toFixed(2)} s`}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">实时数据</h3>
                    <DataPanel items={dataItems} />
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">原理说明</h3>
                    <div className="space-y-3">
                        <PrincipleCard title="牛顿第二定律">
                            物体运动遵循牛顿第二定律 F = ma，其中F为净力，m为质量，a为加速度。
                            球体下落过程中，净力Fnet = G - Fb - Fd - N决定其加速度方向。
                        </PrincipleCard>
                        <PrincipleCard title="阿基米德浮力原理">
                            物体在液体中受到的浮力等于其排开液体的重量，Fb = ρ液体 × g × V排。
                            当球体完全浸沒时，V排等于球体体积；部分浸沒时，V排为浸沒部分的体积。
                        </PrincipleCard>
                        <PrincipleCard title="流体阻力特性">
                            球体在液体中运动时受到阻力Fd = ½ × Cd × ρ液体 × A × v²，
                            其中Cd为阻力系数，A为截面面积，v为相对速度。阻力方向与运动方向相反。
                        </PrincipleCard>
                    </div>
                </div>
            </DemoSidebar>
        </DemoPage>
    );
};

export default FallingBall;