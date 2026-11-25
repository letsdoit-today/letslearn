# Tasks

## 1. 共享组件层

- [x] 1.1 新建 `src/components/demo/KpiBar.tsx`：定义 `KpiItem`（label、value、color、hint）与 `KpiBar`，横向 `flex flex-wrap`，数值 `font-mono` 加粗放大、标签 `text-xs` 弱化；验证方式：`npm run build` 的 tsc 阶段通过，且临时在任一页面渲染后可见 4–6 项横排、无横向溢出。
- [x] 1.2 新建 `src/components/demo/DemoMain.tsx`：`flex-1 min-w-0 flex flex-col gap-3` 容器；验证方式：tsc 通过，且被 `DemoPage` 工作台区域实际包裹使用。
- [x] 1.3 扩展 `DemoPage` 接收 `principles` 与 `reference` 两个可选插槽，内部固定渲染顺序为 CardHeader → principles → reference → children；验证方式：传入任一 ReactNode 后，在页面上确认其出现在 CardHeader 之下、工作台之上。
- [x] 1.4 为 `SimulationCanvas` 增加兜底高度上限（svg 配合 `max-h`），上限取值宽松以免常规视口触发；验证方式：在 1366×768 折叠左导航时画布不超出可视高度，常规视口下画布仍等比。
- [x] 1.5 在 `package.json` 新增 `verify:layout` 脚本指向 `scripts/verify-layout.mjs`；验证方式：`npm run` 列表中出现该脚本。

## 2. 布局验证脚本

- [x] 2.1 新建 `scripts/verify-layout.mjs`：从 `src/lib/demos.json` 派生路由，用 devDependency 中已有的 puppeteer 在 1366×768 与 1920×1080 两种视口下逐路由测量；验证方式：脚本可运行并输出每条路由的测量结果。
- [x] 2.2 实现同屏断言：滚动至工作台后，画布底边、侧栏底边、KPI 条底边均不超过视口高度，容差 8px；验证方式：故意注入一个超高侧栏后脚本以非零退出码失败。
- [x] 2.3 实现无横向溢出断言：`document.body.scrollWidth <= clientWidth`；验证方式：故意注入一个超宽元素后脚本失败并指出路由。
- [x] 2.4 实现非法段落嵌套断言：页面内不存在 `p > p`；验证方式：在 `PrincipleCard` 中临时传入多段文本使嵌套出现，脚本失败并指出路由。
- [x] 2.5 确认路由清单自动派生：不手工维护列表；验证方式：临时在 `demos.json` 增加一条后脚本覆盖到新增路由（验证后移除该临时条目）。

## 3. 页面迁移（按结构由简到繁）

- [x] 3.1 迁移 `AirWaterRefraction`：4 项读数全部进 KPI 条，讲解 3 卡改为通栏 2 列，侧栏只留控制与滑块；验证方式：`npm run build` 通过且 `npm run verify:layout` 该路由通过。
- [x] 3.2 迁移 `ConvexLensSim`：同 3.1 模式；验证方式：同上。
- [x] 3.3 迁移 `ConcaveLensSim`：同 3.1 模式；验证方式：同上。
- [x] 3.4 迁移 `EyeSim`：3 项读数进 KPI 条；验证方式：同上。
- [x] 3.5 迁移 `FrictionInclinedPlane`：KPI 取 θ、Gx、f_max、f，G 与 N 降级为侧栏明细，保留画布左上角状态徽章；验证方式：同上。
- [x] 3.6 迁移 `FallingBall`：KPI 取 h、v、Fd、Fnet，G/Fb/N 降级为侧栏明细，保留画布右上角图例浮层；验证方式：同上。
- [x] 3.7 迁移 `LeverBalance`：KPI 取 L1′、L2′、M1、M2、ΔM，杠杆类型降级为侧栏明细，保留画布左上角状态徽章；验证方式：同上。
- [x] 3.8 迁移 `PendulumOscillation`：KPI 取 T₀、T、偏差、每周期滞后，L/m/振幅/总机械能改为侧栏能量区与参考常量；验证方式：同上。
- [x] 3.9 迁移 `ElectromagneticInduction`：KPI 取 ε、I、F_A、P、Q、v、x，x_total/τ/v∞ 改为参考常量，侧栏压缩为「控制 + 驱动模式 + 时间轴 + 两列参数 + 预设 + 能量条」，删除侧栏独立数据面板；验证方式：同上。

## 4. 集成验证

- [x] 4.1 运行 `npm run verify:layout`，确认 9 条路由在两种视口、折叠/展开导航下全部通过且无横向溢出、无非法段落嵌套。
- [x] 4.2 运行 `npm run build:prerender`，确认 9 条路由的 `index.html` 全部生成且预渲染无报错、`dist/sitemap.xml` 内容未变。
- [ ] 4.3 在 1366×768 与 1920×1080 下手动目检 9 个页面，确认画布、控制区、KPI 条同屏，且滚动到工作台时讲解区已移出可视区域。

## Workflow follow-up

- 项目评审要求满足后归档该 change。
- 归档后核对主 spec `demo-workspace-layout` 的 Purpose 与需求内容完整。