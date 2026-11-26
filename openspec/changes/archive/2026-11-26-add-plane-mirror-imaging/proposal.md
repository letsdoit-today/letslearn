# Proposal

## Why

站点现有四个光学演示全部集中在「折射 + 透镜 + 人眼」，而初中光学中几乎每年中考必考的「光的反射与平面镜成像」完全缺失。几何光学链路在反射这一环是断的：学生能调折射角、能拖凸透镜，却看不到像与物关于镜面对称、看不到虚像为何不能用光屏承接，也无法练习平面镜成像作图。按站点「初中 > 小学 > 高中」的优先级约定，这是当前边际价值最高的一块空白。

## What Changes

- 新增独立演示「平面镜成像实验」（slug `plane-mirror-imaging`），与既有四个光学演示并存，不改动任何既有页面的名称、路径与内容。
- 以拖拽物体为主交互：用户拖动镜前物体（蜡烛或箭头），实时呈现像的位置、大小、正倒与虚实，并使像与物关于镜面对称这一关系可直接量读。
- 绘制两条入射光线及其反射光线，并画出反射光线的反向延长线交于像点，使「虚像不是实际光线会聚而成」可被看见。
- 提供镜面旋转控制：转动镜面时像随之绕物体对称转动，用于呈现「像的位置随镜面方向改变」。
- 提供「镜后挡板」开关：挡板置于镜后，像依然可见，用于呈现教材中证明虚像存在的经典实验。
- 提供「对称辅助线」开关：显示物点与像点的连线及其与镜面的垂直关系，并同时标出物距与像距。
- 读数按既有分层规则呈现：逐帧变化的物距、像距、物高、像高、入射角、反射角进 KPI 条；放大率恒为 1、像距恒等于物距、连线垂直于镜面等恒定结论以单行小字呈现。
- 复用既有语义色与共享 demo 组件，不新增调色板条目，不引入新依赖。
- 同步站点登记：`src/lib/demos.json` 新增条目、`src/lib/demoIcons.tsx` 新增图标映射、`src/App.tsx` 注册组件、`ROADMAP.md` 勾选光学条目并补上 slug。

## Capabilities

### New Capabilities

- `plane-mirror-imaging`: 平面镜成像演示的拖拽交互、像与物的镜面对称关系、反射光线与虚像延长线作图、镜面旋转与镜后挡板实验，以及读数分层与站点登记。

### Modified Capabilities

（无。本次为全新能力，既有 `demo-workspace-layout`、`demo-canvas-legend` 与 `electromagnetic-induction` 的需求均不变，仅作为约束遵循。）

## Impact

- 新增代码：`src/lib/physics/planeMirror.ts`（几何与反射内核）、`src/demos/PlaneMirror.tsx`（场景与控件）。
- 修改代码：`src/lib/demos.json`、`src/lib/demoIcons.tsx`、`src/App.tsx`。
- 修改文档：`ROADMAP.md`（光学条目勾选、补 slug）。
- 依赖：不引入新依赖，复用 React、`@svgdotjs/svg.js`、`lucide-react` 与共享组件（`DemoPage`、`SimulationCanvas`、`DemoSidebar`、`KpiBar`、`ParamSlider`、`DemoControls`、`CanvasLegend`、`PrincipleCard`）。
- 路由与派生资源：`scripts/prerender.js`、`scripts/gen-sitemap.js` 与 `scripts/verify-layout.mjs` 均从 `demos.json` 派生，新条目自动纳入预渲染、站点地图与布局验证，无需改动脚本。
- CI：`.github/workflows/default.yml` 无需改动。