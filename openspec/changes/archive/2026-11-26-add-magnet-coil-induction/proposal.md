# Proposal

## Why

站点已有的「电磁感应实验」以导体棒切割磁感线为载体，只能讲动生电动势 ε = BLv 与安培力阻碍运动，无法覆盖磁通量变化率这一更本质的法拉第表述，也讲不出两个最常考的反直觉结论：磁铁静止在线圈中时磁通量最大而电动势为零；同一段行程无论快慢，累计电荷 Q = N|ΔΦ|/R 恒定。电磁学仍是站点最大的内容空白，新增一个磁铁进出线圈的独立页面即可补上这一块。

## What Changes

- 新增独立演示「电磁感应-磁铁插入/拔出线圈实验」（slug `magnet-coil-induction`），与既有 `electromagnetic-induction` 并存，后者名称、路径与内容不做任何改动。
- 演示采用脚本化时间轴而非手动拖拽：主时间轴为「插入 → 停留 → 拔出 → 停留」，另提供「一次穿过线圈」预设，使磁通量在中心取极大、电动势过零变号的过程可被观察。
- 全部物理量按准静态处理（忽略线圈自感），每帧由 Φ(z) = μ0·m·a²/2(a²+z²)^(3/2) 解析计算 Φ、ε = -N dΦ/dt、I = ε/R、F_楞次、累计电荷 q 与焦耳热 Q；线圈自感 L 与 τ_L = L/R 作为参考常量单行呈现，并在讲解区说明其远小于穿越时间故可忽略。
- 冲击电流计指针采用欠阻尼弹道式二阶系统（周期约 2.5 s、阻尼比约 0.1），使指针峰值偏角近似正比于本段累计电荷，从而可演示「Q 与快慢无关」。
- 提供「幽灵曲线」对照：保留上一档速度的 ε(t) 与指针偏角 θ(t)，以低透明度叠加在当前曲线上，支持两档速度直接比较。
- 三种读数按既有分层规则呈现：逐帧变化的 Φ、ε、I、θ、q 进 KPI 条；N、a、R、m、ΔΦ_total、Q_total、L、τ_L 等恒定派生量降级为参考常量小字。
- 复用既有语义色：磁场 `field`、感应电流 `current`、电动势 `emf`，不新增调色板条目。
- 同步站点登记：`src/lib/demos.json` 新增条目、`src/lib/demoIcons.tsx` 新增图标映射、`App.tsx` 注册组件、`README.md` 路线图更新电磁学计数。
- 将 `public/sitemap.xml` 从手工维护改为由 `src/lib/demos.json` 生成：新增 `scripts/gen-sitemap.js`，在构建前生成站点地图，并提供 `--check` 模式校验仓库内文件与元数据是否一致。此前的三次手工同步已漏过 `lever-balance`、`pendulum-oscillation` 两条路由，并出现过缺失结尾斜杠的格式不一致。

## Capabilities

### New Capabilities

- `magnet-coil-induction`: 磁铁插入/拔出线圈演示的时间轴驱动、磁通量与感应量的准静态解析计算、冲击电流计弹道响应、双速对照与站点登记。

### Modified Capabilities

（无。本次为全新能力，既有 `electromagnetic-induction` 的需求不变。）

## Impact

- 新增代码：`src/lib/physics/magnetCoil.ts`（物理内核）、`src/demos/MagnetCoilInduction.tsx`（场景与控件）、`scripts/gen-sitemap.js`（站点地图生成器）。
- 修改代码：`src/lib/demos.json`、`src/lib/demoIcons.tsx`、`src/App.tsx`、`package.json`（新增 `sitemap` 脚本并在 `build`、`build:prerender` 前置调用）。
- 修改站点资源：`public/sitemap.xml`（改为生成产物）、`README.md`。
- 依赖：不引入新依赖，复用现有 React、@svgdotjs/svg.js、lucide-react 与共享 demo 组件（`DemoPage`、`KpiBar`、`ParamSlider`、`DemoControls`、`CanvasLegend`、`PrincipleCard`）。
- 路由与预渲染：`scripts/prerender.js` 与 `scripts/verify-layout.mjs` 均从 `demos.json` 派生，无需改动；新页面自动纳入预渲染与布局验证。
- CI 影响：`.github/workflows/default.yml` 执行 `npm run build:prerender`，站点地图随之生成，工作流文件无需改动。