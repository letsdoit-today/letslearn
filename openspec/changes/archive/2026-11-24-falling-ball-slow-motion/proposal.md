# Proposal

## Why

球体落入液体实验中，默认钢球（`rhoBall=7800`）约 0.7s 即沉底，而时间轴却长达 60s 且播放为 1:1 真实时间。结果是：下落过程不到 1 秒就播完，浮力、阻力随浸没深度变化的过程肉眼无法观察；时间条 99% 是球沉底后静止的死区。需要放慢下落、并让时间轴与有效下落过程匹配。

## What Changes

- `useSimulation` 增加播放速度选项 `speed`（默认 `1`），按倍率控制自动演示的时间推进速度。
- 球体落入液体实验固定 `0.25x` 慢放，使下落过程放慢约 4 倍。
- `simulateFallingBall` 在球触底后提前停止积分，让时间轴终点即实际落地时刻；`maxTime` 默认 `60 → 10` 作为兜底（仅中性浮力、永不触底时生效）。
- 不改变物理场景（仍为钢球）、物理参数与受力数值。

## Capabilities

### New Capabilities

<!-- 无：本次为演示体验优化，不新增系统行为能力，故在 .openspec.yaml 中设置 skip_specs: true。 -->

### Modified Capabilities

<!-- 无：不涉及现有能力的需求变更。 -->

## Impact

- `src/hooks/useSimulation.ts`：新增 `speed` 选项。
- `src/lib/physics/fallingBall.ts`：触底即停 + 兜底 `maxTime` 调整。
- `src/demos/FallingBall.tsx`：传入 `speed: 0.25`。
- 不涉及共享组件、API 或依赖变更。