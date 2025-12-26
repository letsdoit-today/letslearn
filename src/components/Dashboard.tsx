import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Beaker, 
  Triangle, 
  Waves, 
  Glasses, 
  ArrowRight,
  EyeIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';

const demos = [
  { 
    name: '球体落入液体受力分析', 
    path: '/falling-ball', 
    icon: Beaker,
    description: '模拟球体从空中落入水中的过程，观察重力、浮力、阻力等受力情况。'
  },
  { 
    name: '斜面摩擦力', 
    path: '/friction-inclined-plane', 
    icon: Triangle,
    description: '探究物体在斜面上滑动时摩擦力、重力分量与支持力的关系。'
  },
  { 
    name: '光的折射', 
    path: '/air-water-refraction', 
    icon: Waves,
    description: '可视化光线在空气与水界面传播时的折射现象。'
  },
  { 
    name: '凸透镜成像', 
    path: '/convex-lens', 
    icon: Glasses,
    description: '交互式模拟凸透镜成像规律。'
  },
  { 
    name: '凹透镜成像', 
    path: '/concave-lens', 
    icon: Glasses,
    description: '交互式模拟凹透镜成像规律。'
  },
  { 
    name: '人眼视觉调节原理模拟', 
    path: '/eye-sim', 
    icon: EyeIcon,
    description: '模拟人眼视觉调节原理，包括距离调节、角度调节、颜色调节等。'
  },
];

const Dashboard: React.FC = () => {
  useSEO({
    title: '物理模拟实验 - 互动式物理学习平台',
    description: '专业的物理学习平台，提供球体落入液体、斜面摩擦力、光的折射、凸透镜成像、凹透镜成像等交互式物理实验演示。',
    keywords: '物理实验,力学演示,光学实验,物理学习,互动教学',
    canonical: 'https://learn.letsdoit.today',
    ogImage: 'https://learn.letsdoit.today/og-dashboard.jpg'
  });

  return (
    <div className="container mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">物理模拟实验</h1>
        <p className="text-muted-foreground">
          探索交互式物理演示与数学可视化工具。
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demos.map((demo) => (
          <Card key={demo.path} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <demo.icon className="w-6 h-6" />
              </div>
              <CardTitle>{demo.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 min-h-[40px]">
                {demo.description}
              </CardDescription>
              <Link to={demo.path}>
                <Button className="w-full group">
                  开始实验
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;