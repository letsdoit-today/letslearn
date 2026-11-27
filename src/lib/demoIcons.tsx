import type { ComponentType } from 'react';
import { Beaker, Triangle, Waves, Glasses, EyeIcon, FlaskConical, Scale, Gauge, Magnet, Zap, TestTubes, FlipHorizontal, Dna, Leaf, FunctionSquare } from 'lucide-react';

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  'falling-ball': Beaker,
  'friction-inclined-plane': Triangle,
  'air-water-refraction': Waves,
  'convex-lens': Glasses,
  'concave-lens': Glasses,
  'eye-simulation': EyeIcon,
  'lever-balance': Scale,
  'pendulum-oscillation': Gauge,
  'electromagnetic-induction': Magnet,
  'magnet-coil-induction': Zap,
  'solubility-curve': TestTubes,
  'plane-mirror-imaging': FlipHorizontal,
  'mendel-inheritance': Dna,
  'photosynthesis-respiration': Leaf,
  'quadratic-function-graph': FunctionSquare,
};

const fallbackIcon: ComponentType<{ className?: string }> = FlaskConical;

export function getDemoIcon(slug: string): ComponentType<{ className?: string }> {
  return iconMap[slug] ?? fallbackIcon;
}