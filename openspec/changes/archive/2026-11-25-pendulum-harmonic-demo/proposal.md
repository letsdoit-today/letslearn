# Proposal

## Why

单摆是力学教学里最容易被教错的一块。市面上多数演示只给一个摆，学生看完只会记住"摆来摆去"，而真正反直觉的三个考点全都看不见：

1. 周期**与质量无关**（拖质量滑块应该毫无反应）
2. 周期**与振幅几乎无关**，但只在 θ 很小时成立——60° 释放周期会慢 7.3%，这是肉眼可数的差距
3. `sinθ ≈ θ` 这个近似的误差从第几个周期开始显形

所以需要的不只是一个摆，而是**两个摆同场竞速**：同摆长、同质量、不同释放角，同时释放，几秒后明显错拍。一个画面同时打穿三个考点。

## What Changes

**新增 demo：单摆/简谐振动（`pendulum-oscillation`），四层叠加**

- **运动层**：双摆并列竞速，左 θ₀ = 5°（简谐区），右 θ₀ = 60°（非线性区）。同 L、同 m、同侧释放，时间轴同步回放
- **力层**：只在大摆上绘制三个力矢量——重力 `mg`（红）、绳张力 `T`（青）、切向回复力 `−mg sinθ`（紫）。小摆留白，避免 130px 宽度里挤 6 个箭头
- **能量层**：大摆的动能 / 重力势能 / 总能量堆叠条，实时展示 KE ↔ PE 来回倒而 E_total 恒定
- **图表层**：归一化 θ/θ₀ 的 θ-t 曲线区，真实轨迹与简谐近似虚线（`θ₀·cos(√(g/L)t)`）同框对比，误差随周期累积分离

**修改公共能力**

- `useSimulation` 新增 `loop?: boolean`（默认 `false`）。单摆是永不停止的周期运动，播完停在终点体验差；默认 `false` 保证现有 4 个 demo 行为完全不变
- `palette` 新增语义色 `forceTension`（绳张力）

**参数与交互**

- 滑块：摆长 `L ∈ [0.4, 1.0] m`、质量 `m ∈ [0.1, 2.0] kg`、释放角 `θ₀`（通过预设切换 5° / 60°）
- 预设：小角度对照 / 大角度对照 / 同场竞速 / 长摆慢摆 / 重置
- 播放控制：播放 / 暂停 / 重置，`maxTime ≈ 8 s`（约 4 个周期），固定 `dt = 0.01`

**注册与文档**

- `demos.json` 追加元数据（路由与预渲染单一数据源）
- `demoIcons.tsx` 新增图标映射
- `App.tsx` 注册组件
- `README.md` 路线图勾选「单摆/简谐」，力学 3/6 → 4/6

## Capabilities

本变更为纯演示内容新增，不改变任何既有 spec 级行为（公共 hook 的 `loop` 选项为可选、默认关闭，不构成行为变更）。按项目既有约定，本 change 在 `.openspec.yaml` 中声明 `skip_specs: true`。

### New Capabilities

（无）

### Modified Capabilities

（无）

## Impact

**新增文件**

- `src/lib/physics/pendulum.ts`——纯函数层：`exactPeriod()`（第一类完全椭圆积分，AGM 算法）、`integrate()`（velocity Verlet）、`energy()`、受力分解
- `src/demos/PendulumOscillation.tsx`——主组件

**修改文件**

- `src/hooks/useSimulation.ts`——新增 `loop?: boolean`
- `src/lib/palette.ts`——新增 `forceTension`
- `src/lib/demos.json` / `src/lib/demoIcons.tsx` / `src/App.tsx`——注册三处
- `README.md`——路线图

**风险点**

- 公共 hook 改动需回归现有 4 个 demo（默认 `false` 时行为不变）
- 双摆水平跨度受 `PX_PER_M` 与 L 上限约束，需保证 θ₀=60° 时两摆不重叠
- θ₀ 不能取 90°：`T = mg cosθ + mv²/L`，θ=90° 释放瞬间 `T = 0`，绳松弛、模型失效