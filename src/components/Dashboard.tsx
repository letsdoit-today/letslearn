import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import Demos from '@/lib/Meta';


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
        {Demos.map((demo) => (
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