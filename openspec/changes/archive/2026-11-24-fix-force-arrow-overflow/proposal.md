# Proposal

## Why

斜面摩擦实验中代表重力的箭头（G）竖直向下超出画布底部被裁剪，箭头尖端与标签不可见；球体落入液体实验中，球体落到接近底部时重力箭头同样超出画布下边界。两个实验的受力箭头都因「力值 × 固定像素比例」直接画箭头、且未在画布底部预留余量，在物体靠近画布边缘时被 SVG `viewBox` 裁剪，影响受力分析的可读性。

## What Changes

- 斜面摩擦实验：将画布 `viewBox` 高度从 400 提高到 500，为竖直向下的重力箭头预留底部空间；不改动箭头比例、几何与物理计算。
- 球体落入液体实验：将箭头缩放系数 `arrowScale` 从 2 降低到 1.0，并把 `viewBox` 高度与物理底面解耦（在物理底面下方新增底部边距），使球体沉底时重力箭头完整可见。
- 不改变两个实验的物理模型与受力数值。

## Capabilities

### New Capabilities

<!-- 无：本次为纯视觉显示修复，不新增系统行为能力，故在 .openspec.yaml 中设置 skip_specs: true。 -->

### Modified Capabilities

<!-- 无：不涉及现有能力的需求变更。 -->

## Impact

- `src/demos/FrictionInclinedPlane.tsx`：`viewBox` 高度调整。
- `src/demos/FallingBall.tsx`：`arrowScale` 与 `viewBox` 高度 / 底部边距调整。
- 不涉及 `src/lib/physics/*`、共享组件、API 或依赖变更。