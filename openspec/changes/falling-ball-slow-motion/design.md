# Design

## Context

数据链现状：

```
simulateFallingBall(dt=0.01, maxTime=60)  →  生成 6001 帧（t = 0 ~ 60s）
        │
        ▼
useSimulation:  RAF 每帧把 time 推进 dt=0.01s（≈ 1:1 真实时间播放）
        │
        ▼
时间滑块:  min=0, max=sim.maxTime=60s
```

默认钢球 `rhoBall=7800` 约 0.7s 沉底，之后 59.3s 球静止在水底。两个问题的根因是同一个：**时间轴长度（60s）与实际动作（~0.7s）严重不匹配**，且**播放为 1:1**。

## Goals / Non-Goals

### Goals

- 放慢下落过程，使浮力、阻力随浸没深度变化的过程可观察。
- 时间条只覆盖有效下落过程，去掉死区。

### Non-Goals

- 不改变物理场景（仍为钢球）、不调整受力数值。
- 不新增速度选择 UI（固定慢放）。
- 不改变物理积分步长 `dt=0.01`。

## Decisions

### 决策 1：`useSimulation` 增加 `speed` 选项

在 `UseSimulationOptions` 中新增 `speed?: number`（默认 `1`）。RAF 循环每帧推进 `prev + dt * speed`，`speed=1` 时行为与现状完全一致。这是通用回放能力，与具体实验解耦；`FallingBall` 传入 `speed: 0.25` 即得约 4 倍慢放。

- 慢放只影响自动演示的时间推进；手动拖动滑块直接 `setTime`，不受 `speed` 影响。

### 决策 2：球触底即停 + 兜底上限

`simulateFallingBall` 增加 `landed` 标志：球触底（`y` 到底 + `v` 归零）后停止循环，返回的 `frames` 末帧即落地时刻，`useSimulation` 推导的 `maxTime` 随之等于实际落地时间（默认钢球 ~0.7s）。

`maxTime` 默认值 `60 → 10` 作为兜底：仅当球永不触底（中性浮力 `rhoBall=1000`）时循环才跑到上限，避免死循环，同时避免中性浮力场景时间条过长。

### 决策 3：不改变物理 `dt`，接受 ~15fps 的画面更新

`0.25x` 时 `time` 每帧推进 `0.0025s`，而物理帧间隔 `0.01s`，画面每 4 个动画帧更新一次（约 15fps）。球沿直线下落，15fps 足够平滑，无需更细的物理 `dt` 或帧间插值。只有当未来需要更低倍率（≤0.1x）时，才考虑物理 `dt` 降到 0.001 或插值。

## Risks / Trade-offs

- **中性浮力（`rhoBall=1000`）时间条仍较长**：该场景永不触底，时间条为兜底 10s，仍比落地场景长，但相比 60s 已显著改善，可接受。
- **慢放后自动演示总时长**：默认钢球约 `0.7 / 0.25 ≈ 2.8s` 播完，处于舒适观察区间。
- **通用 hook 改动范围**：`useSimulation` 当前仅被 `FallingBall` 使用，新增可选 `speed`（默认 1）不影响其他实验（如有）。