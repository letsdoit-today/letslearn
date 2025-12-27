import { 
  Beaker, 
  Triangle, 
  Waves, 
  Glasses, 
  EyeIcon,
} from 'lucide-react';

//declare the type of the demo
export type Demo = {
  name: string;
  category: string;
  path: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}

export const siteUrl = 'https://learn.letsdoit.today';

const Demos: Demo[] = [
  { 
    name: '球体落入液体实验', 
    category: 'physics',
    path: '/falling-ball', 
    icon: Beaker,
    description: '模拟球体从空中落入水中的过程，观察重力、浮力、阻力等受力情况。'
},
{ 
    name: '斜面摩擦实验', 
    category: 'physics',
    path: '/friction-inclined-plane', 
    icon: Triangle,
    description: '交互式斜面摩擦物理实验，模拟物体在斜面上的受力分析，可视化重力、支持力、摩擦力的平衡关系。'
},
{ 
    name: '空气-水折射实验', 
    category: 'physics',
    path: '/air-water-refraction', 
    icon: Waves,
    description: '交互式空气-水折射物理实验，模拟光线在不同介质中的折射现象，可视化斯涅尔定律和菲涅尔公式。'
},
{ 
    name: '凸透镜成像模拟', 
    category: 'physics',
    path: '/convex-lens', 
    icon: Glasses,
    description: '交互式模拟凸透镜成像规律。'
},
{ 
    name: '凹透镜成像模拟', 
    category: 'physics',
    path: '/concave-lens', 
    icon: Glasses,
    description: '交互式模拟凹透镜成像规律。'
},
{ 
    name: '人眼视觉调节原理模拟', 
    category: 'physics',
    path: '/eye-sim', 
    icon: EyeIcon,
    description: '交互式人眼视觉调节物理实验，模拟晶状体如何通过改变厚度来调节焦距，可视化人眼成像原理。'
  },
];

export default Demos;