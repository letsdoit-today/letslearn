import type { ComponentType } from 'react';
import demos from '@/lib/demos.json';
import { getDemoIcon } from '@/lib/demoIcons';

//declare the type of the demo
export type Demo = {
  name: string;
  slug: string;
  category: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  keywords: string[];
  topic?: string;
}

export const siteUrl = 'https://learn.letsdoit.today';
export const siteName = 'Physics Learn';

export const categoryLabels: Record<string, string> = {
  math: '数学',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  geography: '地理',
};

const Demos: Demo[] = demos.map((demo) => ({
  name: demo.name,
  slug: demo.slug,
  category: demo.category,
  path: demo.path,
  description: demo.description,
  keywords: demo.keywords,
  topic: demo.topic,
  icon: getDemoIcon(demo.slug),
}));

export const getDemoBySlug = (slug: string): Demo => {
  const demo = Demos.find((item) => item.slug === slug);
  if (!demo) throw new Error(`demos.json 中缺少 slug 为 "${slug}" 的演示条目`);
  return demo;
};

const seoCache = new Map<string, ReturnType<typeof buildDemoSEOUncached>>();

function buildDemoSEOUncached(slug: string) {
  const demo = getDemoBySlug(slug);
  const subject = categoryLabels[demo.category] ?? '理科';
  const topic = demo.topic ?? '';

  return {
    title: `${demo.name} - ${subject}${topic}互动演示 | ${siteName}`,
    description: demo.description,
    keywords: [...demo.keywords, `${subject}学习`, `${subject}互动演示`].join(','),
    canonical: `${siteUrl}${demo.path}`,
    ogImage: `${siteUrl}/og-${demo.slug}.jpg`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '首页',
          item: `${siteUrl}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: demo.name,
          item: `${siteUrl}${demo.path}`,
        },
      ],
    },
  };
}

export const buildDemoSEO = (slug: string) => {
  const cached = seoCache.get(slug);
  if (cached) return cached;
  const result = buildDemoSEOUncached(slug);
  seoCache.set(slug, result);
  return result;
};

export default Demos;