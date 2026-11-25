# Design

## Context

动机见 proposal.md - Why。设计需遵守的既有约束：

- 9 个演示页结构同构：`DemoPage` 内含 `SimulationCanvas` + `DemoSidebar`，侧栏都是「实验控制 / 参数 / 预设 / 能量 / 实时数据 / 原理说明」六段。
- 共享组件接口现状：[DemoPage.tsx](file:///e:/workspace/learn/src/components/demo/DemoPage.tsx) 的 `DemoPage` 只接受 `title`/`description`/`children`；`DemoSidebar` 固定 `w-full lg:w-80 space-y-6`；`SimulationCanvas` 的 svg 为 `w-full h-auto`，高度完全由宽度驱动。
- 滚动容器是 [Layout.tsx](file:///e:/workspace/learn/src/components/Layout.tsx#L225-L227) 的 `div.flex-1.p-3.sm:p-6.overflow-auto`，不是 window；左侧导航为 `w-64`，折叠时 `md:w-0`。
- [DataPanel.tsx](file:///e:/workspace/learn/src/components/demo/DataPanel.tsx) 是 2 列网格，`highlight` 项占满整行；[PrincipleCard.tsx](file:///e:/workspace/learn/src/components/demo/PrincipleCard.tsx) 把 children 包在单个 `<p>` 内，因此只能容纳一段文本。
- 无 lint、无测试脚本；`puppeteer` 已是 devDependency，`scripts/prerender.js` 已在用它。

高度预算是本设计的核心张力。1366×768 下的实际链路（含此前被忽略的左导航与 main padding）：

```
视口 1366 − 左导航 256 = main 1110
main 1110 − p-6(48) = container 1062
container − p-4(32) − card p-6(48) = 卡片内宽 982
982 − gap(24) − 侧栏 320 = 画布列 638
画布高 = 638 × 500/800 = 399
可用高度 = 768 − 56(header) − 48(main p-6) ≈ 664，扣除卡片 padding 后约 640
```

## Goals / Non-Goals

**Goals:**

- 用「移出」而非「压缩」解决高度竞争：把读数与讲解搬出侧栏，而不是把侧栏挤紧或加内部滚动条。
- 9 页迁移做成机械改动：每页只改数据项分组与插槽内容，不改物理计算。
- 「一屏」可自动化回归，不依赖肉眼。

**Non-Goals:**

- 不改 `src/lib/physics/*` 的任何计算。
- 不改路由、`demos.json`、`sitemap.xml`、预渲染流程。
- 不为窄屏（`<lg`）设计同屏方案；`flex-col` 降级为纵向堆叠即可。
- 不引入新依赖，不引入视觉回归测试。
- 不改 `ParamSlider` / `DemoControls` / `Slider` 的公共接口。

## Decisions

### 1. 工作台的纵向结构：讲解前置、工作台独占一屏

```
CardHeader（标题 + 描述）        可滚出
Principles（通栏 2 列 4 卡）     可滚出
Reference（参考常量单行小字）      可滚出
------------------------------------------------- 滚动到此处
+---------------------+  +----------------------+
|  SimulationCanvas   |  |  DemoSidebar         |
|  (399px @1366)      |  |  控制 + 参数 + 预设   |
+---------------------+  |  （无内部滚动条）      |
|  时间轴滑块 28       |  |                      |
+---------------------+  |                      |
|  KpiBar 68          |  |                      |
+---------------------+  +----------------------+
```

**替代方案 A**：KPI 条做成画布与侧栏下方的整页通栏。否决理由：侧栏 592px 已高于画布 399px，通栏 KPI 会与其叠加，band 变成 660 > 640；放在画布列内则被 592 吸收，不额外增高。
**替代方案 B**：侧栏加 `max-h + overflow-y-auto`。否决理由：控制区要求同屏可见，内部滚动会造成页面滚动套侧栏滚动的双层嵌套，且滑块拖拽在触屏上可能与滚动争抢手势。
**替代方案 C**：讲解留在侧栏内折叠。否决理由：320px 栏宽下每行仅约 18 个汉字，折叠只降低高度、不改善可读性。

### 2. 组件边界：新增 `DemoMain` 与 `KpiBar`，收窄 `DemoSidebar`

- `DemoMain`：`flex-1 min-w-0 flex flex-col gap-3`，包住「画布 + 时间轴 + KPI 条」。存在的意义是让 9 页的迁移变成机械的两行包裹，而不是各页重复写同一串 className。
- `KpiBar`：横向 `flex flex-wrap`，每项 `数值为主（font-mono 加大）+ 标签为辅（text-xs muted）`。不复用 `DataPanel`：后者的视觉语言是 2 列网格 + `col-span-2` 跨列底色，横排后该语义失效，也撑不出「数值优先」的层级。
- `DemoSidebar` 职责收窄为纯控制区，保留 `w-full lg:w-80`；不增加滚动能力。

### 3. 读数三层分层规则

| 层级 | 判据 | 位置 | 数量上限 |
| --- | --- | --- | --- |
| 实时 KPI | 随播放或参数变化 | 画布列内 `KpiBar` | 4–6 |
| 参考常量 | 整段播放恒定 | 讲解区下方单行小字 | 不限 |
| 次级明细 | 有用但非结论性 | 侧栏 `DataPanel`（可选） | 不限 |

**替代方案**：只保留 KPI 一层，删掉其余读数。否决理由：部分页面（如 FallingBall 的 G/Fb/N 分解、LeverBalance 的杠杆类型与平衡状态）有教学价值，直接删除会损失信息；下沉而非删除。

### 4. 时间轴归位到画布列

时间轴滑块与画布是同一物理过程的两个视角，放侧栏会割裂；移入画布列后，「拖时间 → 看画面 → 读 KPI」形成一条连续视线。已在画布左上角重复显示 `t` 的页面（Pendulum、Induction）删除该芯片，`t` 只保留在时间轴标签与 KPI 条。

**保留例外**：LeverBalance 与 FrictionInclinedPlane 画布左上角是**状态徽章**（平衡 / 下滑），语义与时间读数不同，保留不动。

### 5. `DemoPage` 的接口演进

`DemoPage` 从「title/description/children」扩展为接收 `principles` 与 `reference` 两个可选插槽，内部固定渲染顺序：CardHeader → Principles → Reference → 工作台（children）。这样 9 页只需把讲解卡片组搬到 `principles` 属性、参考常量搬到 `reference` 属性，而不需要各自拼装外层容器。

**替代方案**：让各页自己用 `<div>` 拼装。否决理由：9 份重复的布局代码，且新增演示时容易漏掉顺序约定。

### 6. 画布高度的兜底上限

左导航折叠时画布列变宽至 856，画布高 535，band 变 651，超出可用 640 约 11px。给 `SimulationCanvas` 加一个宽松的 `max-h`（配合 svg `max-h-full w-auto`）作为兜底，只在极端组合下生效，不改变常规视口下的等比表现。

**替代方案**：不给上限、接受 11px 溢出。否决理由：该组合（折叠导航 + 1366×768）是真实可触达的，且溢出会让 KPI 条被截断。

### 7. 验证脚本复用既有 puppeteer

新增 `scripts/verify-layout.mjs`，从 `demos.json` 派生路由（与 `prerender.js` 同源，新增演示自动纳入），在 1366×768 与 1920×1080 两种视口下断言：

```
- 画布底边、侧栏底边、KPI 条底边 <= 视口高度（滚动到工作台后测量）
- document.body.scrollWidth <= clientWidth（无横向溢出）
- 页面内不存在 p > p 直接嵌套
```

**替代方案**：不写脚本、纯目检。否决理由：本次动 9 个文件，纯目检不可回归；而 puppeteer 已在依赖中，边际成本低。

### 8. 9 页 KPI 映射

| 页面 | KPI 条（4–6 项） | 参考常量 / 次级明细 |
| --- | --- | --- |
| FallingBall | h, v, Fd, Fnet | G, Fb, N（侧栏明细） |
| FrictionInclinedPlane | θ, Gx, f_max, f | G, N（侧栏明细） |
| AirWaterRefraction | θᵢ, θᵗ, R, T | — |
| ConvexLensSim | u, v, m, 成像性质 | — |
| ConcaveLensSim | u, v, m, 成像性质 | — |
| EyeSim | 物体距离, 晶状体厚度, 调节状态 | — |
| LeverBalance | L1′, L2′, M1, M2, ΔM | 杠杆类型, 平衡状态（侧栏明细） |
| PendulumOscillation | t, T₀, T, 偏差, 总机械能 E | L, m, 振幅, 每周期滞后 |
| ElectromagneticInduction | t, ε, I, F_A, v, Q | x, x_total, τ, v∞ |

## Risks / Trade-offs

- **侧栏 592px 仍高于画布列 515px** → band 由侧栏决定；通过把能量条压成 KPI 行尾细条、预设按钮改 2 列紧凑排布来压低侧栏，若仍超出则按 spec 要求精简侧栏而非加滚动条。
- **`SimulationCanvas` 加 `max-h` 可能让画布在超宽视口下不再等比** → 上限值取足够宽松（如 `min(70vh, 620px)`），只在折叠导航 + 低视口等极端组合触发。
- **`PrincipleCard` 单 `<p>` 结构** → 现有 9 页都把多段文本塞进一个 children，迁移时统一改为「一卡一段」，同时修掉 `<p>` 嵌套；组件本身不改接口。
- **`DemoPage` 接口变更影响 9 个文件** → 属 **BREAKING**（内部结构），按 tasks 逐页迁移并在每页迁移后立即跑验证脚本，避免大爆炸式改动。
- **验证脚本的视口断言可能因字体/DPI 波动** → 断言留 8px 容差，只捕获结构性溢出而非像素级差异。
- **触屏上时间轴移入画布列后更靠近画布** → 拖拽区域与画布浮层不重叠（时间轴在画布下方独立成行），无手势冲突。

## Migration Plan

1. 先落地共享层（`KpiBar`、`DemoMain`、`DemoPage` 插槽、`SimulationCanvas` 上限），此时 9 页仍用旧结构，构建应保持通过。
2. 按「结构最简单的先迁移」顺序逐页改造：AirWater → ConvexLens → ConcaveLens → EyeSim → FrictionInclinedPlane → FallingBall → LeverBalance → PendulumOscillation → ElectromagneticInduction。每页迁移后跑 `npm run build` 与布局验证脚本。
3. 全部迁移完成后跑全量 `build:prerender`，确认预渲染与 sitemap 不受影响。

**回滚**：本次改动集中在 `src/components/demo/*` 与 9 个演示文件，物理内核与站点索引未动，回滚即还原这些文件，不涉及数据迁移。