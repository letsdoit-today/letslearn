import { useEffect, type RefObject } from 'react';
import { SVG, type Svg } from '@svgdotjs/svg.js';

export function useSVGScene(
  svgRef: RefObject<SVGSVGElement>,
  setup: (draw: Svg) => void,
): void {
  useEffect(() => {
    if (!svgRef.current) return;

    const draw = SVG(svgRef.current);
    draw.clear();
    setup(draw);

    return () => {
      draw.clear();
    };
    // 仅在挂载时初始化一次，参数变化由各 demo 自行驱动重绘
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}