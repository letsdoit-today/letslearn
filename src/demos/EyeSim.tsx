import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useSEO } from '@/hooks/useSEO';
import Demos, { siteUrl } from '@/lib/Meta';

const name = '人眼视觉调节原理模拟';

const EyeSim: React.FC = () => {
  useSEO({
    title: `${name} - 光学物理演示 | Physics Learn`,
    description: Demos.find(demo => demo.name === name)?.description || '',
    keywords: '人眼视觉调节,晶状体调节,光学实验,物理光学,视觉成像',
    canonical: `${siteUrl}${Demos.find(demo => demo.name === name)?.path || ''}`,
    ogImage: `${siteUrl}/og-eye-simulation.jpg`
  });

  const [objectDistance, setObjectDistance] = useState(400); // 物体距离
  const [, setAnimating] = useState(false);

  // 常量定义
  const RETINA_X = 800;          // 视网膜位置 (固定)
  const LENS_X = 600;            // 晶状体中心位置
  const EYE_RADIUS = 100;        // 眼球半径
  const OBJECT_Y_SIZE = 60;      // 物体高度

  // 核心逻辑：计算晶状体形态和光路
  const accommodation = useMemo(() => {
    // 归一化距离 (0-1)，400是远，150是近
    const t = (400 - objectDistance) / (400 - 150);
    const thickness = 15 + t * 25; // 晶状体物理厚度 15 (薄) 到 40 (厚)
    const curveControl = 10 + t * 30; // 弧度控制
    
    // 物体坐标
    const objX = LENS_X - objectDistance;
    const objY_Top = 250 - OBJECT_Y_SIZE;
    const objY_Bottom = 250 + OBJECT_Y_SIZE;

    // 视网膜成像高度（简化为倒立成像）
    const imageY_Top = 250 + (OBJECT_Y_SIZE * 0.4); 
    const imageY_Bottom = 250 - (OBJECT_Y_SIZE * 0.4);

    return {
      thickness,
      curveControl,
      objX,
      objY_Top,
      objY_Bottom,
      imageY_Top,
      imageY_Bottom,
      isNear: t > 0.6
    };
  }, [objectDistance]);

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
            <svg viewBox="0 0 1000 500" className="w-full h-auto">
              {/* 背景参考线 */}
              <line x1="0" y1="250" x2="1000" y2="250" stroke="#334155" strokeDasharray="5,5" />

              {/* 眼球外壳 */}
              <path 
                d={`M ${LENS_X} 150 A ${EYE_RADIUS} ${EYE_RADIUS} 0 1 1 ${LENS_X} 350`} 
                fill="none" 
                stroke="#64748b" 
                strokeWidth="4" 
              />
              <text x="820" y="240" fill="#94a3b8" fontSize="12">视网膜 (Retina)</text>
              <line x1={RETINA_X} y1="150" x2={RETINA_X} y2="350" stroke="#ef4444" strokeWidth="3" opacity="0.3" />

              {/* 物体 (一支铅笔或简单的形状) */}
              <g transform={`translate(${accommodation.objX}, 250)`}>
                <rect x="-5" y={`-${OBJECT_Y_SIZE}`} width="10" height={OBJECT_Y_SIZE * 2} fill="#fbbf24" rx="2" />
                <circle cx="0" cy={`-${OBJECT_Y_SIZE}`} r="8" fill="#f87171" />
                <text x="-20" y={`-${OBJECT_Y_SIZE + 15}`} fill="white" fontSize="14" fontWeight="bold">目标物体</text>
              </g>

              {/* 光线: 从物体到晶状体 */}
              <path 
                d={`M ${accommodation.objX} ${accommodation.objY_Top} L ${LENS_X} 200`} 
                stroke="rgba(56, 189, 248, 0.6)" 
                strokeWidth="1.5" 
                fill="none" 
              />
              <path 
                d={`M ${accommodation.objX} ${accommodation.objY_Bottom} L ${LENS_X} 300`} 
                stroke="rgba(56, 189, 248, 0.6)" 
                strokeWidth="1.5" 
                fill="none" 
              />

              {/* 光线: 从晶状体到视网膜 */}
              <path 
                d={`M ${LENS_X} 200 L ${RETINA_X} ${accommodation.imageY_Top}`} 
                stroke="rgba(56, 189, 248, 0.9)" 
                strokeWidth="2" 
                fill="none" 
              />
              <path 
                d={`M ${LENS_X} 300 L ${RETINA_X} ${accommodation.imageY_Bottom}`} 
                stroke="rgba(56, 189, 248, 0.9)" 
                strokeWidth="2" 
                fill="none" 
              />

              {/* 倒立的像 (在视网膜上) */}
              <g transform={`translate(${RETINA_X}, 250)`}>
                <rect x="-2" y={`-${OBJECT_Y_SIZE * 0.4}`} width="4" height={OBJECT_Y_SIZE * 0.8} fill="#f87171" opacity="0.8" />
                <circle cx="0" cy={OBJECT_Y_SIZE * 0.4} r="4" fill="#fbbf24" opacity="0.8" />
                <text x="15" y="0" fill="#ef4444" fontSize="12" writingMode="tb">倒立实像</text>
              </g>

              {/* 晶状体 (Lens) - 动态变形 */}
              <path 
                d={`
                  M ${LENS_X} 180 
                  Q ${LENS_X + accommodation.thickness} 250 ${LENS_X} 320 
                  Q ${LENS_X - accommodation.thickness} 250 ${LENS_X} 180
                `} 
                fill="rgba(186, 230, 253, 0.5)" 
                stroke="#0ea5e9" 
                strokeWidth="3"
              />
              <text x={LENS_X - 60} y="170" fill="#38bdf8" fontSize="14" fontWeight="bold">晶状体</text>
              
              {/* 睫状肌 (Ciliary Muscles) */}
              <rect x={LENS_X - 10} y="145" width="20" height="35" fill={accommodation.isNear ? "#f97316" : "#475569"} rx="5" />
              <rect x={LENS_X - 10} y="320" width="20" height="35" fill={accommodation.isNear ? "#f97316" : "#475569"} rx="5" />
              <text x={LENS_X + 25} y="140" fill={accommodation.isNear ? "#f97316" : "#94a3b8"} fontSize="12">睫状肌</text>
            </svg>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实验控制</h3>
              <div className="space-y-1">
                <Label>物体距离: {objectDistance.toFixed(0)} px</Label>
                <Slider
                  value={[objectDistance]}
                  min={150}
                  max={450}
                  step={1}
                  onValueChange={(vals) => {
                    setAnimating(false);
                    setObjectDistance(vals[0]);
                  }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>近处 (需增厚晶状体)</span>
                  <span>远处 (需放松晶状体)</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">实时数据</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">物体距离</span>
                  <span className="font-mono">{objectDistance.toFixed(0)} px</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">晶状体厚度</span>
                  <span className="font-mono">{accommodation.thickness.toFixed(1)}</span>
                </div>
                <div className="col-span-2 bg-slate-100 p-2 rounded">
                  <span className="text-muted-foreground block">调节状态</span>
                  <span className="font-bold">
                    {accommodation.isNear ? '近距离调节 (睫状肌收缩)' : '远距离调节 (睫状肌舒张)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">原理说明</h3>
              <div className="space-y-3">
                <div className="bg-slate-100 p-3 rounded">
                  <h4 className="text-blue-600 font-bold mb-1 text-sm">1. 物体位置</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    当物体靠近眼睛时，进入眼球的光线发散程度更高。
                  </p>
                </div>
                <div className="bg-slate-100 p-3 rounded">
                  <h4 className="text-blue-600 font-bold mb-1 text-sm">2. 晶状体变化</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    睫状肌收缩，晶状体依靠弹性变凸（变厚），从而增加折光能力。
                  </p>
                </div>
                <div className="bg-slate-100 p-3 rounded">
                  <h4 className="text-blue-600 font-bold mb-1 text-sm">3. 完美成像</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    折射后的光线准确汇聚在视网膜上，形成清晰的倒立实像。
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

export default EyeSim;