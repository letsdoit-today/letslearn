# Tasks

## 1. `useSimulation` 播放速度

- [x] 1.1 在 `UseSimulationOptions` 中新增 `speed?: number`（默认 `1`），RAF 循环推进改为 `prev + dt * speed`，保留现有 `>= maxTime` 停靠与边界钳制逻辑。
- [x] 1.2 验证：`speed` 缺省时行为与现状一致（构建通过、类型无误）。

## 2. 球触底即停 + 兜底上限

- [x] 2.1 在 `simulateFallingBall` 中新增 `landed` 标志：球触底（`y` 到底 + `v` 归零）后停止循环；将 `maxTime` 默认值由 `60` 改为 `10`。
- [x] 2.2 验证：默认钢球下 `frames` 末帧时间约 0.7s（时间条显著缩短）；`rhoBall=1000` 时末帧为兜底 10s（循环正常终止）。

## 3. `FallingBall` 慢放接入

- [x] 3.1 `FallingBall.tsx` 调用 `useSimulation` 时传入 `{ dt: 0.01, speed: 0.25 }`。
- [x] 3.2 验证：自动演示下落约 2.8s 播完，受力箭头随浸没深度变化肉眼可观察。

## 4. 集成验证

- [x] 4.1 `npm run build` 通过，无类型错误。
- [x] 4.2 走查：默认钢球时间条终点为落地时刻；`rhoBall=1000` 时间条为兜底 10s；手动拖动滑块顺滑。

## Workflow

- [ ] 归档本变更。