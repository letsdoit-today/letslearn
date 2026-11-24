export interface LensImage {
  v: number;
  m: number;
  typeKey: string;
}

export const IMAGE_TYPE_TEXT: Record<string, string> = {
  'image-type-inverted-enlarged-real': '倒立 放大 实像',
  'image-type-inverted-reduced-real': '倒立 缩小 实像',
  'image-type-inverted-same-real': '倒立 等大 实像',
  'image-type-upright-enlarged-virtual': '正立 放大 虚像',
  'image-type-upright-reduced-virtual': '正立、缩小、虚像',
  'image-type-parallel': '平行',
};

/**
 * 薄透镜成像公式：1/f = 1/u + 1/v。
 * f 为正表示凸透镜，为负表示凹透镜。
 * 返回像距 v、放大率 m 与像类型 typeKey。
 */
export function calculateThinLens(u: number, f: number): LensImage {
  if (f > 0 && Math.abs(u - f) < 0.1) {
    return { v: Infinity, m: Infinity, typeKey: 'image-type-parallel' };
  }

  const v = (u * f) / (u - f);
  const m = -v / u;

  if (f < 0) {
    return { v, m, typeKey: 'image-type-upright-reduced-virtual' };
  }

  let typeKey: string;
  if (u > f) {
    if (Math.abs(m) > 1) typeKey = 'image-type-inverted-enlarged-real';
    else if (Math.abs(m) < 1) typeKey = 'image-type-inverted-reduced-real';
    else typeKey = 'image-type-inverted-same-real';
  } else {
    typeKey = 'image-type-upright-enlarged-virtual';
  }

  return { v, m, typeKey };
}

export function imageTypeText(typeKey: string): string {
  return IMAGE_TYPE_TEXT[typeKey] ?? typeKey;
}