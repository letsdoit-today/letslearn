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
}

export const siteUrl = 'https://learn.letsdoit.today';

const Demos: Demo[] = demos.map((demo) => ({
  name: demo.name,
  slug: demo.slug,
  category: demo.category,
  path: demo.path,
  description: demo.description,
  keywords: demo.keywords,
  icon: getDemoIcon(demo.slug),
}));

export default Demos;