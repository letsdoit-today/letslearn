import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SVG, Svg, G, Rect, Circle, Line, Polygon, Text, Matrix } from '@svgdotjs/svg.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

interface SimulationState {
    t: number;
    y: number;
    v: number;
    G: number;
    Fb: number;
    Fd: number;
    N: number;
    Fnet: number;
}

const FallingBall: React.FC = () => {
    useSEO({
        title: '球体落入液体实验 - 物理力学演示 | Physics Learn',
        description: '交互式球体落入液体物理实验，模拟重力、浮力、阻力等受力情况，可视化物体在空气和水中的运动规律。',
        keywords: '球体落入液体,浮力实验,重力演示,物理力学,流体阻力',
        canonical: 'https://learn.letsdoit.today/falling-ball',
        ogImage: 'https://learn.letsdoit.today/og-falling-ball.jpg'
    });

    const svgRef = useRef<SVGSVGElement>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(0);
    const [density, setDensity] = useState(1000);
    const [radius, setRadius] = useState(0.07);
    const [rhoBall, setRhoBall] = useState(7800); // Ball density (was constant)

    // Physics Constants
    const g = 9.8;
    const Cd = 0.47;
    const pixelsPerMeter = 200;
    const width = 800;
    const height = 500;
    const waterLevel = 200;

    // Simulation Data Cache
    const simulationData = useRef<SimulationState[]>([]);
    const maxTime = useRef(2);
    const snapContext = useRef<{
        s: Svg;
        ball: Circle;
        water: Rect;
        arrowG: G;
        arrowFb: G;
        arrowFd: G;
        arrowN: G;
    } | null>(null);

    // Calculate Simulation Data
    const calculateSimulation = useMemo(() => {
        return () => {
            const data: SimulationState[] = [];
            const dt = 0.01;
            let t = 0;
            let y = 50; // Initial Y
            let v = 0;

            const mass = rhoBall * (4 / 3) * Math.PI * Math.pow(radius, 3);

            // Limit max time or stop when settled
            while (t <= 60) {
                const G = mass * g;

                // Buoyancy
                let Vsub = 0;
                const distFromSurface = (y - waterLevel) / pixelsPerMeter;

                if (distFromSurface > radius) {
                    Vsub = (4 / 3) * Math.PI * Math.pow(radius, 3);
                } else if (distFromSurface < -radius) {
                    Vsub = 0;
                } else {
                    const h = radius + distFromSurface;
                    Vsub = (Math.PI * Math.pow(h, 2) / 3) * (3 * radius - h);
                }

                const Fb = density * g * Vsub;

                // Drag
                const immersionRatio = Vsub / ((4 / 3) * Math.PI * Math.pow(radius, 3));
                const area = Math.PI * Math.pow(radius, 2);
                const vDir = v > 0 ? 1 : -1;
                let Fd = 0.5 * Cd * density * area * Math.pow(v, 2) * immersionRatio * vDir;

                // Support Force
                let N = 0;

                // Collision/Ground
                if (y + radius * pixelsPerMeter >= height) {
                    y = height - radius * pixelsPerMeter;
                    v = 0;
                    Fd = 0;
                    N = G - Fb;
                    if (N < 0) N = 0;
                }

                const Fnet = G - Fb - Fd - N;

                data.push({ t, y, v, G, Fb, Fd, N, Fnet });

                const a = Fnet / mass;
                v += a * dt;
                y += v * dt * pixelsPerMeter;

                if (y + radius * pixelsPerMeter > height) {
                    y = height - radius * pixelsPerMeter;
                    v = 0;
                }

                t += dt;
            }
            simulationData.current = data;
            maxTime.current = data[data.length - 1].t;
        };
    }, [density, radius, rhoBall]);

    // Initialize Snap
    useEffect(() => {
        if (!svgRef.current) return;

        const s = SVG(svgRef.current);
        s.clear();

        // Draw Water
        const water = s.rect(width, height - waterLevel).move(0, waterLevel);
        water.attr({ fill: "rgba(52, 152, 219, 0.5)", stroke: "none" });

        s.line(0, waterLevel, width, waterLevel).attr({ stroke: "#2980b9", "stroke-width": 2 });

        // Draw Ball
        const ball = s.circle(radius * pixelsPerMeter * 2).center(width / 2, 50);
        ball.attr({ fill: "#95a5a6", stroke: "#7f8c8d", "stroke-width": 2 });

        // Helper for arrows
        const createArrow = (color: string) => {
            const g = s.group();
            const line = s.line(0, 0, 0, 50);
            const head = s.polygon('-5,50 5,50 0,60');
            const label = s.text("").move(10, 30);

            line.attr({ stroke: color, "stroke-width": 3 });
            head.attr({ fill: color });
            label.attr({ fill: color, "font-size": "14px", "font-weight": "bold" });

            g.add(line);
            g.add(head);
            g.add(label);
            g.hide();
            return g;
        };

        const arrowG = createArrow("#e74c3c");
        const arrowFb = createArrow("#3498db");
        const arrowFd = createArrow("#f1c40f");
        const arrowN = createArrow("#9b59b6");

        snapContext.current = { s, ball, water, arrowG, arrowFb, arrowFd, arrowN };

        calculateSimulation();
        updateVisuals(0);

    }, []); // Run once on mount

    // Re-run simulation when params change
    useEffect(() => {
        calculateSimulation();
        // Update visuals for current time with new params
        updateVisuals(time);

        // Update ball radius visual
        if (snapContext.current) {
            snapContext.current.ball.radius(radius * pixelsPerMeter);
        }
    }, [density, radius, calculateSimulation]);

    // Animation Loop
    useEffect(() => {
        let animationFrameId: number;

        const animate = () => {
            if (isRunning) {
                setTime(prev => {
                    const nextTime = prev + 0.01;
                    if (nextTime >= maxTime.current) {
                        setIsRunning(false);
                        return maxTime.current;
                    }
                    return nextTime;
                });
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isRunning]);

    // Update Visuals when time changes
    useEffect(() => {
        updateVisuals(time);
    }, [time]);

    const updateVisuals = (t: number) => {
        if (!snapContext.current || simulationData.current.length === 0) return;

        const { ball, arrowG, arrowFb, arrowFd, arrowN } = snapContext.current;

        // Find frame
        const frame = simulationData.current.find(f => f.t >= t) || simulationData.current[simulationData.current.length - 1];
        if (!frame) return;

        // Update Ball
        ball.cy(frame.y);

        // Update Arrows
        const updateArrow = (arrow: G, x: number, y: number, length: number, angle: number, text: string) => {
            if (Math.abs(length) < 0.015) {
                arrow.hide();
                return;
            }
            arrow.show();

            const line = arrow.findOne('line') as Line;
            const head = arrow.findOne('polygon') as Polygon;
            const label = arrow.findOne('text') as Text;

            // Limit arrow length visually if too large, but scaling is better
            const displayLen = length;

            line.plot(0, 0, 0, displayLen);
            head.plot(`-5,${displayLen} 5,${displayLen} 0,${displayLen + 10}`);
            label.text(text).y(displayLen / 2);

            const matrix = new Matrix().translate(x, y).rotate(angle, x, y);
            arrow.transform(matrix);

            // Text rotation fix
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
    };

    // Current data for display
    const currentFrame = simulationData.current.find(f => f.t >= time) || { G: 0, Fb: 0, Fd: 0, N: 0, Fnet: 0, v: 0, y: 50 };
    const currentH = (waterLevel - currentFrame.y) / pixelsPerMeter;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>球体落入液体受力分析</CardTitle>
                    <CardDescription>
                        模拟球体从空中落入液体中的过程，观察重力、浮力、阻力和支持力的变化。
                        <p className="text-red-500">
                            调整液体和球体密度，观察当液体密度大于、等于、小于球体密度时，球体下落过程中所受的力如何变化。
                        </p>
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col lg:flex-row gap-6">
                    {/* Canvas Area */}
                    <div className="flex-1 relative border rounded-lg overflow-hidden bg-slate-50">
                        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" />

                        {/* Legend Overlay */}
                        <div className="absolute top-4 right-4 bg-white/90 p-3 rounded shadow text-sm space-y-1">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#e74c3c] block"></span> 重力 G</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#3498db] block"></span> 浮力 Fb</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#f1c40f] block"></span> 阻力 Fd</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#9b59b6] block"></span> 支持力 N</div>
                        </div>
                    </div>

                    {/* Controls & Data */}
                    <div className="w-full lg:w-80 space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">实验控制</h3>
                            <div className="flex gap-2">
                                <HoverCard>
                                    <HoverCardTrigger className='w-full'>
                                        <Button className='w-full' onClick={() => setIsRunning(!isRunning)} variant={isRunning ? "secondary" : "default"}>
                                            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                            {isRunning ? "暂停" : "自动演示"}
                                        </Button>
                                    </HoverCardTrigger>
                                    <HoverCardContent>
                                        点击自动演示，或<p className="font-bold">手动滑动下方的时间轴</p>以控制时间。
                                    </HoverCardContent>
                                </HoverCard>
                                <Button onClick={() => { setIsRunning(false); setTime(0); }} variant="outline">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label>液体密度 (ρ): {density} kg/m³</Label>
                                    <Slider
                                        value={[density]}
                                        min={800} max={1200} step={50}
                                        onValueChange={(vals) => setDensity(vals[0])}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>球体密度 (ρ): {rhoBall} kg/m³</Label>
                                    <Slider
                                        value={[rhoBall]}
                                        min={1000} max={20000} step={100}
                                        onValueChange={(vals) => setRhoBall(vals[0])}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>球半径 (r): {radius} m</Label>
                                    <Slider
                                        value={[radius]}
                                        min={0.05} max={0.2} step={0.01}
                                        onValueChange={(vals) => setRadius(vals[0])}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>时间 (t): {time.toFixed(2)} s</Label>
                                    <Slider
                                        value={[time]}
                                        min={0} max={maxTime.current} step={0.01}
                                        onValueChange={(vals) => { setIsRunning(false); setTime(vals[0]); }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">实时数据</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block">高度 h</span>
                                    <span className="font-mono">{currentH.toFixed(2)} m</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">速度 v</span>
                                    <span className="font-mono">{currentFrame.v.toFixed(2)} m/s</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">重力 G</span>
                                    <span className="font-mono text-[#e74c3c]">{currentFrame.G.toFixed(2)} N</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">浮力 Fb</span>
                                    <span className="font-mono text-[#3498db]">{currentFrame.Fb.toFixed(2)} N</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">阻力 Fd</span>
                                    <span className="font-mono text-[#f1c40f]">{Math.abs(currentFrame.Fd).toFixed(2)} N</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">支持力 N</span>
                                    <span className="font-mono text-[#9b59b6]">{currentFrame.N.toFixed(2)} N</span>
                                </div>
                                <div className="col-span-2 bg-slate-100 p-2 rounded">
                                    <span className="text-muted-foreground block">净力 Fnet</span>
                                    <span className="font-mono font-bold">{currentFrame.Fnet.toFixed(2)} N</span>
                                </div>
                            </div>
                        </div>

                        {/* 原理说明 */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">原理说明</h3>
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="font-semibold text-blue-800 mb-2">牛顿第二定律</h4>
                                    <p className="text-sm text-gray-700">
                                        物體運動遵循牛頓第二定律 F = ma，其中F為淨力，m為質量，a為加速度。
                                        球體下落過程中，淨力Fnet = G - Fb - Fd - N決定其加速度方向。
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="font-semibold text-blue-800 mb-2">阿基米德浮力原理</h4>
                                    <p className="text-sm text-gray-700">
                                        物體在液體中受到的浮力等於其排開液體的重量，Fb = ρ液體 × g × V排。
                                        當球體完全浸沒時，V排等於球體體積；部分浸沒時，V排為浸沒部分的體積。
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="font-semibold text-blue-800 mb-2">流體阻力特性</h4>
                                    <p className="text-sm text-gray-700">
                                        球體在液體中運動時受到阻力Fd = ½ × Cd × ρ液體 × A × v²，
                                        其中Cd為阻力係數，A為截面積，v為相對速度。阻力方向與運動方向相反。
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

export default FallingBall;