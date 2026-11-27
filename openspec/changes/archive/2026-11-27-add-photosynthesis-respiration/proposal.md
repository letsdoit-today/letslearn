# Proposal

## Why

生物学科目前只有孟德尔遗传一个条目，而初中生物的另一个 P0 考点「光合作用与呼吸作用」仍为空白。这条考点的难点不在名词记忆，而在两个过程的**方向相反、同时发生、由光照强度决定谁占上风**：学生常把两者理解成「白天光合、晚上呼吸」的互斥关系，也说不清净交换方向为何会在清晨与傍晚翻转。这类「过程类知识」用静态图很难讲清，动画收益最大。

站点已具备 `category: "biology"` 的归类链路与侧栏「生物」分组（由孟德尔遗传条目验证），本条不需要任何基建改动，边际成本低。

## What Changes

- 新增演示 `/photosynthesis-respiration/`，呈现叶肉细胞内叶绿体（光合作用）与线粒体（呼吸作用）两个同时进行的过程及其物质流
- 以**昼夜时刻**为唯一主变量：时刻驱动光照强度，光照强度驱动光合速率，呼吸速率恒定，净速率决定细胞与外界的气体交换方向
- 提供自动昼夜扫描（可播放 / 暂停 / 拖拽时间轴），夜间与白天的净交换箭头方向随之翻转
- 提供「光照强度 – 速率」曲线，标出光补偿点，使「净吸收与净释放的分界」可读
- 新增生物语义色：叶绿体、线粒体、CO₂、O₂、有机物
- 在 `demos.json` / `App.tsx` / `demoIcons.tsx` 登记该演示，并在 ROADMAP 中勾选该条目

不在本次范围内：光反应与暗反应（类囊体、基质、ATP/NADPH、C3/C5）、温度与 CO₂ 浓度作为第二自变量、碘液检验淀粉等实验操作流程、生态系统碳循环与能量流动。

## Capabilities

### New Capabilities

- `photosynthesis-respiration`: 叶肉细胞内光合作用与呼吸作用的昼夜协同演示，覆盖时刻到光照强度的映射、两过程的速率计算、净交换方向判定、光补偿点读数与「光照强度 – 速率」曲线。

### Modified Capabilities

无。侧栏「生物」分组与 `category: "biology"` 归类链路已由 `mendel-inheritance` 建立，本条复用既有行为，不改变任何既有 requirement。

## Impact

- 新增 `src/lib/bio/photosynthesis.ts`（速率模型与时刻映射的纯函数内核）
- 新增 `src/demos/PhotosynthesisRespiration.tsx`（演示场景）
- 修改 `src/lib/palette.ts`：新增生物语义色
- 修改 `src/lib/demos.json`、`src/App.tsx`、`src/lib/demoIcons.tsx`：登记演示
- 修改 `ROADMAP.md`：勾选条目、更新覆盖计数与进行中 change 表
- 复用既有组件：`DemoPage` / `DemoMain` / `DemoSidebar` / `KpiBar` / `CanvasLegend` / `DemoControls` / `ParamSlider` / `PrincipleCard`
- 复用既有 hooks：`useSVGScene`（一次挂载）、`useSimulation`（昼夜帧序列播放与拖拽）
- 不引入新依赖；不改动任何既有演示与共享组件的行为