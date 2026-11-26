/**
 * 平面镜成像几何内核
 *
 * 全部量均为纯函数计算：镜像变换（反射定律 + 对称性）产出一份自洽结果，
 * 场景、读数、光线均从同一结果读取，避免两处公式漂移。
 *
 * 坐标约定：
 * - 画布 viewBox 800×500，镜面过中心 MIRROR_CENTER，默认竖直放置。
 * - 物体位于镜前（默认在镜面左侧），法线 normal 指向镜前（物体所在侧）。
 * - 单位换算：1 cm = 20 px（PX_PER_CM）。
 */

export interface Point {
  x: number;
  y: number;
}

/** 单位换算：1 cm = 20 px */
export const PX_PER_CM = 20;

/** 镜面中心（画布几何约定，与渲染层保持一致） */
export const MIRROR_CENTER: Point = { x: 400, y: 250 };

/** 镜面可视段半长（px） */
export const MIRROR_HALF = 220;

/** 反射光线从入射点延伸的长度（px） */
export const RAY_LENGTH = 260;

/** 入射点相对物体在镜面上垂足的偏移（px），用于让两条光线斜入射 */
export const INCIDENT_SPREAD = 80;

export interface PlaneMirrorInput {
  /** 镜面倾角（相对竖直，逆时针为正，单位度） */
  angleDeg: number;
  /** 物体底部位置（px） */
  objectBottom: Point;
  /** 物体高度（px），物体竖直向上 */
  objectHeightPx: number;
}

export interface RayPath {
  /** 光线起点（物体端点） */
  source: Point;
  /** 镜面上的入射点 */
  incident: Point;
  /** 反射光线终点 */
  reflectedEnd: Point;
  /** 反向延长线终点（应落在像点附近） */
  virtualEnd: Point;
  /** 入射角（度） */
  incidentAngleDeg: number;
  /** 反射角（度） */
  reflectedAngleDeg: number;
}

export interface PlaneMirrorResult {
  mirrorCenter: Point;
  /** 镜面方向单位向量 */
  mirrorDir: Point;
  /** 法线单位向量（指向镜前） */
  normal: Point;
  /** 镜面可视段两端 */
  mirrorStart: Point;
  mirrorEnd: Point;
  objectBottom: Point;
  objectTop: Point;
  imageBottom: Point;
  imageTop: Point;
  /** 物距（cm，带符号量取绝对值） */
  objectDistanceCm: number;
  /** 像距（cm） */
  imageDistanceCm: number;
  /** 物高（cm） */
  objectHeightCm: number;
  /** 像高（cm） */
  imageHeightCm: number;
  /** 物体底部点发出的光线 */
  bottomRay: RayPath;
  /** 物体顶部点发出的光线 */
  topRay: RayPath;
}

export const PLANE_MIRROR_DEFAULT_INPUT: PlaneMirrorInput = {
  angleDeg: 0,
  objectBottom: { x: 220, y: 300 },
  objectHeightPx: 100,
};

const DEG = Math.PI / 180;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function mul(a: Point, s: number): Point {
  return { x: a.x * s, y: a.y * s };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(p: Point): Point {
  const len = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / len, y: p.y / len };
}

/** 镜面方向与法线（法线指向镜前，即默认物体所在的左侧） */
export function mirrorBasis(angleDeg: number): { mirrorDir: Point; normal: Point } {
  const theta = angleDeg * DEG;
  return {
    mirrorDir: { x: Math.sin(theta), y: Math.cos(theta) },
    normal: { x: -Math.cos(theta), y: Math.sin(theta) },
  };
}

/**
 * 镜像变换：像点 P' = P - 2·((P - A)·n)·n。
 * 对任意镜面倾角成立，无特例分支。
 */
export function reflectPoint(p: Point, a: Point, n: Point): Point {
  const t = dot(sub(p, a), n);
  return { x: p.x - 2 * t * n.x, y: p.y - 2 * t * n.y };
}

/**
 * 平面镜成像完整求解。
 *
 * 像点由镜像变换得到；光路由反射定律（r = i - 2·(i·n)·n）得到。
 * 反向延长线终点沿反射方向的反方向独立求解，应当与像点重合（误差 < 0.5 px），
 * 从而验证「反射光线反向延长线交于像点」这一虚像定义与镜像变换自洽。
 */
export function computePlaneMirror(input: PlaneMirrorInput): PlaneMirrorResult {
  const { mirrorDir, normal } = mirrorBasis(input.angleDeg);
  const mirrorCenter = MIRROR_CENTER;

  const mirrorStart = add(mirrorCenter, mul(mirrorDir, -MIRROR_HALF));
  const mirrorEnd = add(mirrorCenter, mul(mirrorDir, MIRROR_HALF));

  const objectTop = {
    x: input.objectBottom.x,
    y: input.objectBottom.y - input.objectHeightPx,
  };

  const imageBottom = reflectPoint(input.objectBottom, mirrorCenter, normal);
  const imageTop = reflectPoint(objectTop, mirrorCenter, normal);

  const signedU = dot(sub(input.objectBottom, mirrorCenter), normal);
  const signedV = dot(sub(imageBottom, mirrorCenter), normal);

  const objectDistanceCm = Math.abs(signedU) / PX_PER_CM;
  const imageDistanceCm = Math.abs(signedV) / PX_PER_CM;
  const objectHeightCm = input.objectHeightPx / PX_PER_CM;
  const imageHeightCm =
    Math.hypot(imageTop.x - imageBottom.x, imageTop.y - imageBottom.y) / PX_PER_CM;

  // 入射点：物体在镜面上的垂足沿镜面方向偏移，并限制在可视段内
  const incidentPoint = (source: Point, offset: number): Point => {
    const t = dot(sub(source, mirrorCenter), mirrorDir);
    const clamped = clamp(t + offset, -MIRROR_HALF, MIRROR_HALF);
    return add(mirrorCenter, mul(mirrorDir, clamped));
  };

  const buildRay = (source: Point, image: Point, offset: number): RayPath => {
    const incident = incidentPoint(source, offset);
    const inDir = normalize(sub(incident, source));
    const cosInc = dot(inDir, normal);
    const incidentAngleDeg = Math.acos(clamp(Math.abs(cosInc), 0, 1)) / DEG;
    const reflectedAngleDeg = incidentAngleDeg;

    // 反射方向 r = i - 2·(i·n)·n
    const reflectedDir = sub(inDir, mul(normal, 2 * cosInc));
    const reflectedEnd = add(incident, mul(reflectedDir, RAY_LENGTH));

    // 反向延长线：从入射点沿反射方向的反方向延伸至像点距离
    const backDir = mul(reflectedDir, -1);
    const toImageLen = Math.hypot(image.x - incident.x, image.y - incident.y);
    const virtualEnd = add(incident, mul(backDir, toImageLen));

    return {
      source,
      incident,
      reflectedEnd,
      virtualEnd,
      incidentAngleDeg,
      reflectedAngleDeg,
    };
  };

  const bottomRay = buildRay(input.objectBottom, imageBottom, -INCIDENT_SPREAD);
  const topRay = buildRay(objectTop, imageTop, INCIDENT_SPREAD);

  return {
    mirrorCenter,
    mirrorDir,
    normal,
    mirrorStart,
    mirrorEnd,
    objectBottom: input.objectBottom,
    objectTop,
    imageBottom,
    imageTop,
    objectDistanceCm,
    imageDistanceCm,
    objectHeightCm,
    imageHeightCm,
    bottomRay,
    topRay,
  };
}