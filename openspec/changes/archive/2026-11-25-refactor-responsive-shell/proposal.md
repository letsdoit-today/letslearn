# Proposal

## Why

两个问题同源，都在应用外壳（app shell）的滚动与断点设计上：

1. **左侧导航随页面滚走**。`Layout` 外层是 `min-h-screen flex`，桌面端 `<aside>` 为 `md:static`，随文档流移动；内容区虽然写了 `overflow-auto`，但父级高度为 `auto`，该容器永远不会成为滚动容器，实际滚动的是 body，于是导航跟着滚出视口。用户需要一直能看到导航以切换实验。

2. **1024–1279px 下画布被挤到极小**。`DemoPage` 的 `lg:flex-row` 在 1024px 就把 320px 侧栏搬到右侧，同时左侧导航占 256px，实测画布绘制区仅 **294×184**——比 390px 手机（316×198）还小，容器却被 `flex-1` 拉到 409px 高，多出 225px 纯空白。

## What Changes

- `Layout` 外层改为 `h-dvh overflow-hidden`，内容区 `flex-1 overflow-auto` 成为唯一滚动容器，左侧导航在桌面端始终固定不动
- `DemoPage` 的行布局断点由 `lg`（1024px）提升到 `xl`（1280px）：1024–1279px 区间侧栏回落到画布下方纵向排列，画布获得完整内容宽度
- **BREAKING**（spec 层面）：`demo-workspace-layout` 的「三件同屏」约束适用范围由 `≥1024px` 收窄为 `≥1280px`，并新增 1024–1279px 的降级条款（画布 + KPI 同屏，控制区在其下方）
- 新增能力 `app-shell-layout`：规定导航固定、单一滚动容器与内容区高度基准
- `SimulationCanvas` 的画布高度上限常数由 `calc(100vh_-_9rem)` 上调：导航固定后 sticky header 不再覆盖画布，图注行（若已落地）另占一行
- `scripts/verify-layout.mjs`：视口矩阵改为 1024×768 / 1366×768 / 1920×1080；侧栏底边断言仅在 ≥1280px 生效；横向溢出改测内容滚动容器的 `scrollWidth`

## Capabilities

### New Capabilities

- `app-shell-layout`: 应用外壳的滚动契约——导航固定、内容区为唯一滚动容器、视口高度基准与移动端抽屉行为

### Modified Capabilities

- `demo-workspace-layout`: 「画布、控制区与 KPI 条同屏共存」需求的适用视口从 ≥1024px 改为 ≥1280px，并新增 1024–1279px 的降级布局条款

## Impact

- 修改：`src/components/Layout.tsx`（外层高度与滚动容器）
- 修改：`src/components/demo/DemoPage.tsx`（`lg:flex-row` → `xl:flex-row`、画布高度上限常数）
- 修改：`scripts/verify-layout.mjs`（视口矩阵、断言作用域、溢出测量目标）
- 不涉及：9 个演示页面各自的实现（它们的布局全部经由 `DemoPage`，无需逐页改动）
- 与 `refactor-canvas-legend` 的先后关系：两者都会改 `verify-layout.mjs`，需串行实施