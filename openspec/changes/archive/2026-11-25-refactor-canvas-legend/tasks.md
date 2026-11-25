# Tasks

## 1. 共享组件

- [x] 1.1 新建 `src/components/demo/CanvasLegend.tsx`：导出 `LegendItem`（label、color）与 `CanvasLegend`，`flex flex-wrap gap-x-4 gap-y-1 text-xs`，色块统一 `w-3 h-3 rounded-sm`；验证方式：`npm run build` 的 tsc 阶段通过，且任一页面渲染后条目单行排列、色块与字号与其余页面一致。
- [x] 1.2 为 `CanvasLegend` 增加可选 `note` 属性承载弱化说明文字（`text-[11px] text-muted-foreground`），随条目一起换行；验证方式：传入 note 后文字出现在图注行内、不产生横向溢出。

## 2. 页面迁移

- [x] 2.1 迁移 `LeverBalance`：删除画布内 `absolute top-4 right-4` 图例块，改用 `CanvasLegend` 渲染在画布之下，标签缩短为 `力臂 L′`、`作用力 F1`、`作用力 F2`、`力矩 M`；保留左上角平衡状态徽章；验证方式：`npm run verify:layout` 该路由通过，且画布内无图例级浮层。
- [x] 2.2 迁移 `PendulumOscillation`：删除画布内图例块，改用 `CanvasLegend`，`箭头长度以 mg 归一化，仅表示相对大小` 移入 `note`；验证方式：同上。
- [x] 2.3 迁移 `FallingBall`：删除画布内 `Legend Overlay`，改用 `CanvasLegend`；验证方式：同上。
- [x] 2.4 迁移 `ElectromagneticInduction`：删除画布内 `absolute top-4 right-4` 图例块，改用 `CanvasLegend`，5 项条目（B、I、v、F_A、ε/F_外）全量保留；验证方式：同上。

## 3. 画布浮层收紧

- [x] 3.1 检查 4 个页面的画布内绝对定位芯片（时间芯片、状态徽章），确认仅承载短文本，必要时收紧窄屏字号；验证方式：`verify:layout` 新增的面积断言在全部视口下通过。

## 4. 校验脚本

- [x] 4.1 在 `scripts/verify-layout.mjs` 的视口矩阵补入 `1024×768`；验证方式：脚本输出的测量行包含该视口，且 9 条路由在该视口下同屏断言通过。
- [x] 4.2 实现浮层面积断言：遍历 `[data-demo-canvas]` 内绝对定位子元素，面积占比超过 25% 时失败并指出路由与元素尺寸；验证方式：临时把任一页面的图例块放回画布内，脚本以非零退出码失败并指明该路由。

## 5. 集成验证

- [x] 5.1 运行 `npm run verify:layout`，确认 9 条路由在 3 种视口、折叠/展开导航下全部通过。
- [x] 5.2 运行 `npm run build:prerender`，确认预渲染无报错、`dist/sitemap.xml` 内容未变。
- [x] 5.3 在 390px、768px、1024px、1366px 四种宽度下手动目检 4 个带图例页面，确认图例位于画布下方、不遮挡画布内容、不与芯片重叠。

## Workflow follow-up

- 项目评审要求满足后归档该 change。
- 归档后核对主 spec `demo-canvas-legend` 的 Purpose 与需求内容完整。