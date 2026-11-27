/**
 * 全局语义调色板
 *
 * 所有画布（SVG）配色集中在此定义，替代散落在各 demo 中的十六进制字面量。
 * 设计原则：颜色即语义 —— 同一物理量在全站使用同一颜色。
 * 色值基于 Tailwind 默认色阶，保证与 UI 语义色协调。
 */

export const palette = {
  // 画布背景
  canvasBg: '#f8fafc', // slate-50

  // 实物 / 物体（教科书式深灰主体）
  object: '#334155', // slate-700
  objectStroke: '#1e293b', // slate-800

  // 力矢量（颜色即语义，全站统一）
  forceGravity: '#dc2626', // red-600 重力 G
  forceNormal: '#16a34a', // green-600 支持力 / 法向力 N
  forceFriction: '#2563eb', // blue-600 摩擦力 f
  forceBuoyancy: '#0ea5e9', // sky-500 浮力 Fb
  forceDrag: '#f59e0b', // amber-500 阻力 Fd
  forceComponent: '#9333ea', // purple-600 重力分力 Gx
  forceTension: '#0891b2', // cyan-600 绳张力 T

  // 光
  ray: '#dc2626', // red-600 光线（实线光路）

  // 电磁（颜色即语义，全站统一）
  field: '#6366f1', // indigo-500 磁场（× 符号阵列）
  current: '#f43f5e', // rose-500 感应电流与流动小点
  emf: '#10b981', // emerald-500 动生电动势 ε

  // 介质 / 结构
  water: '#38bdf8', // sky-400 水域填充
  lensGlass: '#e2e8f0', // slate-200 透镜玻璃填充
  lensBody: '#0ea5e9', // sky-500 晶状体（人眼）描边
  plank: '#d97706', // amber-600 斜面木板
  plankStroke: '#b45309', // amber-700 斜面木板描边
  eyeShell: '#64748b', // slate-500 眼球外壳

  // 化学（颜色即语义，全站统一）
  solution: '#14b8a6', // teal-500 溶液填充
  crystal: '#f472b6', // pink-400 晶体 / 未溶解固体
  curve: '#1e293b', // slate-800 溶解度曲线

  // 数学（颜色即语义，全站统一）
  mathCurve: '#1e293b', // slate-800 当前曲线 y = ax² + bx + c
  mathReference: '#94a3b8', // slate-400 参考曲线 y = ax²
  mathAxis: '#94a3b8', // slate-400 对称轴
  mathVertex: '#ea580c', // orange-600 顶点
  mathRoot: '#2563eb', // blue-600 与 x 轴交点

  // 生物（颜色即语义，全站统一）
  bioDominant: '#16a34a', // green-600 显性性状
  bioRecessive: '#7c3aed', // violet-600 隐性性状
  bioGamete: '#0ea5e9', // sky-500 配子
  bioParent: '#475569', // slate-600 亲本
  bioChloroplast: '#15803d', // green-700 叶绿体 / 光合速率
  bioMitochondrion: '#ea580c', // orange-600 线粒体 / 呼吸速率
  bioGasCo2: '#64748b', // slate-500 二氧化碳
  bioGasO2: '#0284c7', // sky-600 氧气
  bioOrganic: '#d97706', // amber-600 有机物

  // 参考 / 标注
  reference: '#94a3b8', // slate-400 参考线（主光轴、法线、虚线）
  canvasText: '#334155', // slate-700 画布文字与标记点

  // 状态
  statusActive: '#ea580c', // orange-600 动态状态高亮
} as const;

export type PaletteKey = keyof typeof palette;

/** 将十六进制色值转为 rgba 字符串，用于需要透明度的场景 */
export function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}