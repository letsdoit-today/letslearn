# Proposal

## Why

站点现有 6 个 demo 集中在力学（球体落液、斜面摩擦）与光学（折射、凸/凹透镜、人眼），「杠杆与力矩」这一中考/高考高频考点完全空缺。同时，现有 demo 均为「随时间演化」或「手动拖拽」形态，缺少一个「参数即时配平」的静态探究形态。力矩概念的最大教学误区是「力臂 = 支点到作用点的距离」，只有把倾斜施力画出来才能真正打掉这一误区。

## What Changes

- 新增「杠杆平衡与力矩实验」demo，采用静态配平为主 + 横梁缓动倾斜的混合形态。
- 支持 6 个参数滑块：`F1`、`L1`、`θ1`、`F2`、`L2`、`θ2`；有效力臂按 `L·sinθ` 计算。
- 可视化分层：结构（横梁/支点）→ 力臂虚线（从支点垂直连到力的作用线，含垂足直角标记）→ 力箭头（按 θ 倾斜）→ 力矩旋向弧形箭头。
- 提供三类杠杆预设按钮（等臂天平 / 省力杠杆 / 费力杠杆）。
- 实时数据面板展示有效力臂、左右力矩、净力矩、平衡状态、杠杆类型。
- 横梁倾角以 RAF 插值缓动（约 300ms）追随目标倾角；倾角仅作视觉反馈，不参与力矩运算。
- 同步修正 README 中已过期的「新增 demo 步骤」（原描述的 `generate-static.js` / `vite.config.ts` 路由已不存在，实际由 `scripts/prerender.js` 从 `demos.json` 派生）。

## Capabilities

### New Capabilities

<!-- 无：本次为新增一个演示页面，不引入新的系统行为能力，故在 .openspec.yaml 中设置 skip_specs: true。 -->

### Modified Capabilities

<!-- 无：不涉及现有能力的需求变更。 -->

## Impact

- 新增 `src/lib/physics/lever.ts`：力矩计算纯函数（无 React / SVG 依赖）。
- 新增 `src/demos/LeverBalance.tsx`：SVG 绘制、滑块交互、缓动。
- `src/lib/demos.json`：追加元数据（同时驱动 `scripts/prerender.js` 的预渲染路由）。
- `src/lib/demoIcons.tsx`：新增 `lever-balance` 图标映射。
- `src/App.tsx`：新增 import 与 `demoComponents` 映射。
- `README.md`：勾选路线图中的「杠杆力矩」，修正新增 demo 步骤描述。
- 不涉及共享组件、依赖或构建配置变更。