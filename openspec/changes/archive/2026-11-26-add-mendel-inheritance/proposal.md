# Proposal

## Why

站点已覆盖物理 11 个 demo 与化学 1 个 demo，而**生物仍为 0 覆盖**。ROADMAP 3.4 把「孟德尔遗传」列为初中段交互价值最高的条目之一：它是过程类知识，单靠课本上的遗传图解很难让学生真正理解「3 : 1 从哪来」以及「3 : 1 是概率而非必然」。按站点「初中 > 小学 > 高中」的优先级约定，这是当前缺口最大、且边际收益明确的一块空白。

同时，本次是生物学科的首个条目，需要同时打通「学科归类链路」——当前侧栏 `menuGroups` 只有数学、物理、化学三组，`category: "biology"` 的条目不会出现在任何菜单中，这是必须先解决的前置阻塞。

## What Changes

- 新增独立演示「孟德尔遗传实验」（slug `mendel-inheritance`），与既有 12 个演示并存，不改动任何既有页面的名称、路径与内容。
- **仅实现一对相对性状（单因子杂交）**：`DD × dd`、`Dd × Dd`、`Dd × dd` 三类亲本组合，呈现 F1 与 F2 的基因型、表现型与分离比。双因子（自由组合定律，9 : 3 : 3 : 1）明确不在本次范围，留给后续独立 demo。
- 提供棋盘法（Punnett square）交互：由亲本基因型自动生成配子行/列并填充 2×2 格子，使「3 : 1 而不是 2 : 2」的来源可见。
- 提供大样本随机模拟：样本数可调（4 → 1000），实时呈现表现型比例条与累计计数，使「3 : 1 是概率收敛结果，样本少时可能偏离」可被亲眼看到。随机序列使用可复现的种子化伪随机数，保证画面可复现、可校验。
- 提供亲本基因型选择（三档）与显隐性关系说明，使显性 / 隐性判定规则（`D` 掩盖 `d`）可被直接读出。
- 提供「子代抽样」交互：从模拟结果中随机抽取个体，展示其基因型与表现型，用于说明「表现型相同不代表基因型相同」（`DD` 与 `Dd` 都是高茎）。
- 读数按既有分层规则呈现：逐帧变化的样本数、高茎数、矮茎数、实测比例进 KPI 条；理论分离比 3 : 1、显性完全掩盖隐性、配子随机结合等恒定结论以单行小字呈现。
- **打通生物学科归类链路**：`src/components/Layout.tsx` 的 `menuGroups` 新增「生物」分组；`src/lib/palette.ts` 新增生物语义色；`src/lib/demoIcons.tsx` 新增图标映射（当前 fallback 是化学的 `FlaskConical`，不适合生物条目）。
- 同步站点登记：`src/lib/demos.json` 新增条目、`src/App.tsx` 注册组件、`ROADMAP.md` 勾选生物条目并补上 slug 与学科计数。

## Capabilities

### New Capabilities

- `mendel-inheritance`: 孟德尔一对相对性状遗传演示的基因型输入、配子生成与棋盘法填充、大样本随机模拟与比例收敛、子代抽样，以及读数分层与生物学科归类链路。

### Modified Capabilities

（无。本次为全新能力，既有 `demo-workspace-layout`、`demo-canvas-legend`、`app-shell-layout` 的需求均不变，仅作为约束遵循。`app-shell-layout` 中关于侧栏分组的既有需求允许新增分组，不构成需求变更。）

## Impact

- 新增代码：`src/lib/bio/mendel.ts`（遗传内核：基因型、配子、棋盘、种子化随机模拟）、`src/demos/MendelInheritance.tsx`（场景与控件）。
- 修改代码：`src/components/Layout.tsx`（新增「生物」分组）、`src/lib/palette.ts`（新增生物语义色）、`src/lib/demoIcons.tsx`（新增图标映射）、`src/lib/demos.json`、`src/App.tsx`。
- 修改文档：`ROADMAP.md`（生物条目勾选、补 slug、更新学科 × 学段覆盖总览）。
- 依赖：不引入新依赖，复用 React、`@svgdotjs/svg.js`、`lucide-react` 与共享组件（`DemoPage`、`SimulationCanvas`、`DemoSidebar`、`KpiBar`、`ParamSlider`、`DemoControls`、`CanvasLegend`、`PrincipleCard`）。
- 路由与派生资源：`scripts/prerender.js`、`scripts/gen-sitemap.js` 与 `scripts/verify-layout.mjs` 均从 `demos.json` 派生，新条目自动纳入预渲染、站点地图与布局验证，无需改动脚本。
- CI：`.github/workflows/default.yml` 无需改动。