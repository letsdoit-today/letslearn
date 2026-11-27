import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import Demos, { categoryLabels, siteName, siteUrl } from '@/lib/Meta';


const Dashboard: React.FC = () => {
  const itemList = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '理科互动演示列表',
      itemListElement: Demos.map((demo, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: demo.name,
        description: demo.description,
        url: `${siteUrl}${demo.path}`,
      })),
    }),
    [],
  );

  const demoKeywords = useMemo(
    () => Array.from(new Set(Demos.flatMap((demo) => demo.keywords))).slice(0, 16),
    [],
  );

  useSEO({
    title: `理科模拟实验 - 互动式理科学习平台 | ${siteName}`,
    description:
      '面向小学、初中、高中的理科互动演示平台，覆盖数学、物理、化学、生物四科。二次函数图像与参数、斜面摩擦与受力分析、光的折射与透镜成像、杠杆力矩、单摆简谐振动、电磁感应、溶解度曲线、孟德尔遗传、光合作用与呼吸作用等演示均支持参数调节与实时数据联动，帮助直观理解抽象概念。',
    keywords: `理科学习,数学演示,物理实验,化学演示,生物演示,互动教学,初中理科,${demoKeywords.join(',')}`,
    canonical: siteUrl,
    ogImage: `${siteUrl}/og-dashboard.jpg`,
    jsonLd: itemList,
  });

  useEffect(() => {
    window.__PRERENDER_READY__ = true;
  }, []);

  const categoryCount = useMemo(() => {
    const counts = new Map<string, number>();
    Demos.forEach((demo) => {
      counts.set(demo.category, (counts.get(demo.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([category, count]) => ({
      label: categoryLabels[category] ?? category,
      count,
    }));
  }, []);

  return (
    <div className="container mx-auto max-w-5xl px-3 sm:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">理科模拟实验</h1>
        <p className="text-muted-foreground">
          探索交互式数学、物理、化学与生物演示。
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {categoryCount.map((item) => `${item.label} ${item.count} 个`).join(' · ')}
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
                  开始演示
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