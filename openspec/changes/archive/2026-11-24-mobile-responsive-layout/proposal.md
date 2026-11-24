# Proposal

## Why

移动端体验存在明显的空间浪费与操作别扭：侧边栏默认展开且固定 `w-64`（256px），在手机屏上几乎占满整屏，用户须手动收起才能看到内容；收起后，内容区仍叠加多层固定内边距（Layout 的 `p-6`、DemoPage 的 `p-4`、Card 的 `p-6`），在 375px 屏宽下单边累计约 64px，浪费约 34% 的可用宽度。这些内边距均无响应式变体，侧边栏也没有移动端抽屉行为，导致移动端内容贴边不足、首屏体验差。

## What Changes

- 收紧移动端内容内边距：为布局内容包裹层、顶栏、演示页容器、首页容器补充响应式内边距（移动端约 12px，`sm`（640px）及以上恢复原值），桌面端视觉不变。
- 将共享卡片组件 `CardHeader`/`CardContent` 的默认 `p-6` 改为响应式（移动端 16px），以匹配移动端紧凑排版。
- 让侧边栏在移动端（`< md`，768px）默认收起，展开时以 fixed 浮层 + 半透明遮罩的抽屉形式滑出；桌面端（`md+`）保持常驻侧边栏，行为与现状一致。
- 新增移动端判定能力（`useMediaQuery` 钩子），用于区分桌面/移动端侧边栏行为与初始状态。

## Capabilities

### New Capabilities

无。本变更属于纯 UI / 响应式布局打磨，不引入新的系统能力。

### Modified Capabilities

无。本变更不改变既有 spec 级需求，故通过 `.openspec.yaml` 的 `skip_specs: true` 显式跳过 specs。

## Impact

- 布局与侧边栏：`src/components/Layout.tsx`
- 演示页容器：`src/components/demo/DemoPage.tsx`
- 首页容器：`src/components/Dashboard.tsx`
- 共享卡片组件：`src/components/ui/card.tsx`
- 新增钩子：`src/hooks/useMediaQuery.ts`