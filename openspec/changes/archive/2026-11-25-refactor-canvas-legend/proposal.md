# Proposal

## Why

演示画布上的图例是固定像素尺寸的绝对定位浮层，而画布本身随容器宽度缩放，两者坐标系不一致。实测（puppeteer 量取 4 个带图例页面）：

- 390px 视口：lever-balance 图例占画布宽度 80%、高度 59%，且与画布左上角状态芯片重叠；pendulum-oscillation 占 71% 宽；electromagnetic-induction 占 56% 宽且同样重叠
- 768px 视口：图例高度占比仍达 48%
- 1024px 视口：`lg` 断点触发后侧栏从下方搬到右侧，画布宽度从 382px 塌到 294px（比手机还窄），lever-balance 图例占画布宽度 86%、pendulum-oscillation 76%，并再次与左上角芯片重叠

图例是静态参考信息，不是逐帧数据，却占用了最宝贵的画布可视面积，并在窄屏上盖住实验现象本身。

## What Changes

- 新增共享组件 `CanvasLegend`：横向 `flex-wrap` 流式图例，恒定渲染在画布边框之下作为图注，不进入画布的绝对定位层
- 4 个带浮层图例的页面（`LeverBalance`、`PendulumOscillation`、`FallingBall`、`ElectromagneticInduction`）改用 `CanvasLegend`，删除各自的绝对定位图例块，统一 `p-3 text-sm w-3 h-3` 与 `p-2 text-xs w-2.5 h-2.5` 两种漂移的规格
- `PendulumOscillation` 图例内的说明文字（"箭头长度以 mg 归一化"）随图例改为图注内的弱化说明，不再嵌在浮层里
- 画布内的状态芯片（`t = …`、平衡状态、运动状态）保留为绝对定位浮层，仅做窄屏字号收紧
- 布局校验脚本 `scripts/verify-layout.mjs`：视口矩阵补入 `1024×768`；新增断言——画布内任何绝对定位子元素的面积不得超过画布面积的 25%
- 不涉及 `lg` 断点导致的画布塌陷问题：该问题与图例是两个独立病灶（改法是调断点或侧栏宽度），按单独 change 处理

## Capabilities

### New Capabilities

- `demo-canvas-legend`: 演示画布图注的渲染位置、内容结构与窄屏行为，确保图例在任何视口下不遮挡画布内容

### Modified Capabilities

（无。`demo-workspace-layout` 定义的是工作台同屏布局，本次不改动其需求。）

## Impact

- 新增：`src/components/demo/CanvasLegend.tsx`
- 修改：`src/demos/LeverBalance.tsx`、`src/demos/PendulumOscillation.tsx`、`src/demos/FallingBall.tsx`、`src/demos/ElectromagneticInduction.tsx`
- 修改：`scripts/verify-layout.mjs`（视口矩阵与新增断言）
- 不改动：`DemoPage`、`SimulationCanvas`、`DemoMain`、`KpiBar` 的既有接口与 `demo-workspace-layout` 的同屏预算