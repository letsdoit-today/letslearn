# Proposal

## Why

站点的数学分组目前为空，`demos.json` 里没有任何 `category: "math"` 的条目，侧栏「数学」分组虽然存在但筛不到内容。按 ROADMAP 的「初中优先 + 缺口最大」两条标准，数学是仅剩的两个零覆盖学科之一，且初中段「二次函数」是高频考点，交互收益明显。

二次函数的教学难点不在记公式，而在**三个参数各自的职责边界**：学生常把 `c` 当成顶点纵坐标、认为 `b` 为正时对称轴在右侧、以为改 `b` 会改变抛物线形状。这类混淆靠静态图对照难以消除，而把三条曲线放在同一坐标系里实时联动，可以让「谁改形状、谁只改位置」变成可直接比对的事实。

站点已具备侧栏分组按 `category` 自动归类的能力（`menuGroups` 里已有 `id: 'math'`），本条不需要任何基建改动，边际成本低。

## What Changes

- 新增演示 `/quadratic-function-graph/`，在同一坐标系中绘制当前曲线 `y = ax² + bx + c` 与参考曲线 `y = ax²`
- 以**纯滑块**驱动：`a`、`b`、`c` 三个参数各一个滑块，不使用播放、时间轴或自动扫描（二次函数没有时间维度）
- 用**两条曲线全等比对**呈现参数职责：拖 `b`、`c` 时两条曲线始终全等、只发生平移；拖 `a` 时两条曲线一起改变形状
- 绘制对称轴 `x = -b/(2a)`、顶点 `(h, k)`、与 `y` 轴交点 `(0, c)`、与 `x` 轴交点，并按判别式 `Δ` 的三种符号分别处理交点
- 提供五个预设场景按钮（标准型 / 开口向下 / 双根 / 顶点在轴上 / 无实根），用于快速定位到有教学意义的参数组合
- 新增数学语义色：当前曲线、参考曲线、对称轴、顶点、与 `x` 轴交点
- 在 `demos.json` / `App.tsx` / `demoIcons.tsx` 登记该演示，并在 ROADMAP 中勾选该条目、更新数学覆盖计数

不在本次范围内：`a = 0` 的退化情形（退化为一次函数）、配方法推导与顶点式变形过程的逐步演示、一元二次方程求解与韦达定理、与 x 轴交点区间的解集表示、二次函数在区间上的最值、实际应用题（利润、抛物线运动）、`b` 与 `a` 的联合口诀式总结。

## Capabilities

### New Capabilities

- `quadratic-function-graph`: 二次函数 `y = ax² + bx + c` 的参数—图像联动演示，覆盖三个参数对形状与位置的三类响应、参考曲线全等比对、`a ≠ 0` 约束、对称轴与顶点与判别式读数、与两轴交点、预设场景与读数分层。

### Modified Capabilities

无。侧栏「数学」分组与 `category` 自动归类链路已由 `app-shell-layout` 建立，本条复用既有行为，不改变任何既有 requirement。

## Impact

- 新增 `src/lib/math/quadratic.ts`（参数求解、顶点/对称轴/判别式/根与坐标映射的纯函数内核）
- 新增 `src/demos/QuadraticFunctionGraph.tsx`（演示场景）
- 修改 `src/lib/palette.ts`：新增数学语义色
- 修改 `src/lib/demos.json`、`src/App.tsx`、`src/lib/demoIcons.tsx`：登记演示
- 修改 `ROADMAP.md`：勾选条目、更新数学覆盖计数与进行中 change 表
- 复用既有组件：`DemoPage` / `DemoMain` / `DemoSidebar` / `KpiBar` / `CanvasLegend` / `ParamSlider` / `PrincipleCard`
- 复用既有 hook：`useSVGScene`（一次挂载、参数变化时只更新既有元素的属性）
- 不使用 `useSimulation` 与 `DemoControls`（本条无时间维度，与 `solubility-curve` 同为参数驱动型）
- 不引入新依赖；不改动任何既有演示与共享组件的行为