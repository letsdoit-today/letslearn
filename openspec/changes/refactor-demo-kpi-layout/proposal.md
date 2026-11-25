# Proposal

## Why

9 个演示页面的侧栏是单一纵向长列，把「一次性设定的参数控件」和「持续观察的实时读数」混在同一空间里竞争高度，导致用户在 1366×768 等常见视口下必须滚动才能看到读数，而滚动后画布已离屏——「调参 → 看数 → 看画面」的反馈闭环被打断。同时讲解被压在 320px 窄栏内，行宽仅约 18 个汉字，可读性差。

## What Changes

- 确立「演示工作台」布局范式：同一屏内必须同时容纳**实验画布、控制区、KPI 读数条**三者，使参数变化与物理响应的因果在同屏可读；页面标题与描述（CardHeader）不在同屏要求内。
- 新增 `KpiBar` 组件：横向排列 4–6 项「结论性读数」，数值为主、标签为辅，可换行；不替代 `DataPanel`（后者保留为侧栏内的次级明细）。
- 新增 `DemoMain` 容器：承载画布列（画布 + 时间轴 + KPI 条 + 能量条），使 9 个页面共享同一纵向节奏。
- `DemoSidebar` 明确为「纯控制区」：只放播放控制、模式切换、参数滑块与预设，不再承载读数与讲解。
- 讲解区（`PrincipleCard` 组）移出侧栏，改为 CardHeader 下方的通栏 2 列排布；窄栏 18 字行宽提升至约 40 字。
- 恒定派生量（如 τ、v∞、x_total、摆长、质量）从实时数据面板下沉为讲解区下方的一行参考常量，不再与逐帧变化量并列。
- 时间轴滑块移入画布列、紧邻画布下方；画布左上角重复显示 `t` 的芯片在时间轴已存在的页面中移除。
- **BREAKING**（仅内部结构）：`DemoPage` 的子元素顺序契约由「canvas + sidebar」变为「header / principles / main + sidebar」，9 个演示页需同步迁移。
- 新增 `scripts/verify-layout.mjs`：用已在 devDependencies 中的 puppeteer，对 9 条路由在 1366×768 与 1920×1080 两种视口下断言「画布、控制区、KPI 条同屏且无横向溢出」，把「一屏」从主观判断变为可回归的断言。

## Capabilities

### New Capabilities

- `demo-workspace-layout`: 演示页面的工作台布局范式，定义同屏必须共存的内容集合、各区域的信息职责边界、读数分层规则（实时 KPI / 参考常量 / 次级明细），以及该范式的自动化验证方式。

### Modified Capabilities

（无。项目当前无既有主 spec，本次为全新能力。）

## Impact

- 新增代码：`src/components/demo/KpiBar.tsx`、`src/components/demo/DemoMain.tsx`、`scripts/verify-layout.mjs`。
- 修改共享组件：`src/components/demo/DemoPage.tsx`（`DemoSidebar` 职责收窄、新增 `principles` 与 `reference` 插槽、`SimulationCanvas` 增加兜底高度上限）。
- 迁移页面（9 个）：`FallingBall`、`FrictionInclinedPlane`、`AirWaterRefraction`、`ConvexLensSim`、`ConcaveLensSim`、`EyeSim`、`LeverBalance`、`PendulumOscillation`、`ElectromagneticInduction`。
- 数据来源不变：各页 `dataItems` 拆分为 `kpiItems` / `referenceItems`，物理计算与 `src/lib/physics/*` 不改动。
- 依赖：不引入新依赖；`package.json` 新增 `verify:layout` 脚本。
- 站点资源：`sitemap.xml`、`demos.json`、路由与预渲染均不受影响。
- 窄屏（`<lg`）下 `flex-col` 降级为纵向堆叠，同屏要求不适用，本次不做额外处理。