# Proposal

## Why

站点当前 8 个演示全部集中在力学与光学，电磁学覆盖率为 0，而电磁感应是高中物理最核心、最常考、也最需要动态可视化的板块之一。现站已有成熟的「参数 → 逐帧物理积分 → SVG 场景 + 实时曲线 + 数据面板」骨架，新增一个电磁感应演示边际成本低，却能填掉最大的内容空白。

## What Changes

- 新增演示「导体棒切割磁感线」，覆盖三种驱动模式：
  - 模式 1 惯性滑行：给定初速度 v₀，安培力做负功使棒减速至停止（电磁阻尼）。
  - 模式 2 恒力驱动：恒定外力 F 作用下由静止加速，趋于收尾速度 v∞。
  - 模式 3 匀速拖动：速度由滑块直接给定，反解所需外力，稳态下各量恒定。
- 三种模式共用一个物理引擎与一套绘制逻辑，帧结构一致；派生量 ε = BLv、I = ε/R、F_A = BIL、P = I²R、Q = ∫I²R dt 每帧计算且与模式无关。
- 物理量一律使用真实数值，不做可视化篡改；时间轴自适应（duration = 5τ）、采样自适应（帧数固定约 800）、轨道比例尺按总行程自动缩放并在画布上标注「按比例缩放」。
- 模式 3 的图表语义为 ε–v 过原点特性直线，工作点随 v 滑块移动；焦耳热 Q 通过数据面板与能量条呈现，不绘制时间曲线。
- 新增磁场 / 感应电流 / 电动势的语义色到全局调色板。
- 修复 `public/sitemap.xml`：新增本条路由，并补齐此前遗漏的 `lever-balance`、`pendulum-oscillation`，修正 `friction-inclined-plane` 缺失的结尾斜杠。
- 更新 `README.md` 路线图中「电磁感应」的完成标记。

## Capabilities

### New Capabilities

- `electromagnetic-induction`: 导体棒切割磁感线演示的物理计算、三驱动模式行为、画面呈现与守恒校验。

### Modified Capabilities

（无。本次为全新能力，不修改既有能力的需求。）

## Impact

- 新增代码：`src/lib/physics/induction.ts`（物理内核）、`src/demos/ElectromagneticInduction.tsx`（场景与控件）。
- 修改代码：`src/lib/demos.json`、`src/lib/demoIcons.tsx`、`src/App.tsx`、`src/lib/palette.ts`。
- 修改站点资源：`public/sitemap.xml`、`README.md`。
- 依赖：不引入新依赖，复用现有 React、@svgdotjs/svg.js、lucide-react 与既有 demo 组件。
- 路由与预渲染：`scripts/prerender.js` 从 `demos.json` 派生路由，无需改动；`vite.config.ts` 无需改动。