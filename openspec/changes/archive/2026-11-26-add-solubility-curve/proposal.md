# Proposal

## Why

站点现有 10 个演示全部属于物理，化学为 0 覆盖；而按「初中 > 小学 > 高中」的优先级约定，初中化学是当前缺口最大且优先级最高的一块。溶解度曲线是中考化学的高频双料考点——既考读图，又与溶质质量分数计算连考，其中「降温结晶」是一个静态插图完全讲不清的动态过程。本次以它作为化学学科的第一个演示。

## What Changes

- 新增演示「溶解度曲线与饱和溶液」（slug `solubility-curve`，`category` 取 `chemistry`），作为化学分组下的首个条目。
- 提供三种初中常见溶质的溶解度曲线（硝酸钾、氯化钠、氢氧化钙），用户可切换并对比「陡升 / 平缓 / 下降」三种曲线形态。
- 温度、溶剂质量、加入溶质总量均可调，实时给出该温度下的溶解度、已溶解与未溶解的溶质质量、溶质质量分数以及饱和状态。
- 支持「降温结晶」：温度降低时溶解度下降，多余溶质以晶体形式析出并沉积在杯底，溶质质量分数随之下降。
- 杯内视图与曲线视图联动：曲线上的当前状态点随温度移动，杯内溶液由不饱和变为饱和、再析出晶体。
- 读数按既有分层规则呈现：温度、溶解度、溶质质量分数、已溶解溶质、未溶解溶质、溶剂质量进 KPI 条；「饱和溶液的质量分数 = S/(100+S)」等恒定关系以单行小字呈现。
- 复用既有语义色与共享 demo 组件；新增化学领域语义色（溶液、晶体）写入全局调色板。
- 同步站点登记：`src/lib/demos.json` 新增条目、`src/lib/demoIcons.tsx` 新增图标映射、`src/App.tsx` 注册组件、`ROADMAP.md` 更新化学章节与覆盖总览。
- **不在本次范围内**：首页与 SEO 文案仍写死「物理」，`Layout.tsx` 仍缺「地理 / 生物」分组。两者属于全局壳层改动，另行处理。

## Capabilities

### New Capabilities

- `solubility-curve`: 溶解度曲线演示的溶质切换、温度与溶质/溶剂调节、饱和判定、降温结晶析出、曲线与杯内视图联动、读数分层，以及化学学科的站点登记。

### Modified Capabilities

（无。既有 `demo-workspace-layout`、`demo-canvas-legend`、`app-shell-layout` 的需求不变，仅作为约束遵循；`Layout.tsx` 已有 `chemistry` 分组且按 `category` 过滤，无需修改外壳即可容纳本演示。）

## Impact

- 新增代码：`src/lib/chem/solubility.ts`（溶解度数据表、插值、饱和与析出求解）、`src/demos/SolubilityCurve.tsx`（曲线视图、杯内视图与控件）。
- 修改代码：`src/lib/demos.json`、`src/lib/demoIcons.tsx`、`src/App.tsx`、`src/lib/palette.ts`（新增溶液与晶体的语义色）。
- 修改文档：`ROADMAP.md`（化学章节、覆盖总览与进行中 change 表）。
- 依赖：不引入新依赖，复用 React、`@svgdotjs/svg.js`、`lucide-react` 与共享组件（`DemoPage`、`SimulationCanvas`、`DemoSidebar`、`KpiBar`、`ParamSlider`、`DemoControls`、`CanvasLegend`、`PrincipleCard`）。
- 路由与派生资源：`scripts/prerender.js`、`scripts/gen-sitemap.js`、`scripts/verify-layout.mjs` 均从 `demos.json` 派生，新条目自动纳入，无需改动脚本。