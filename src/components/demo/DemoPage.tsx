import { useEffect, type ReactNode, type RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

declare global {
  interface Window {
    __PRERENDER_READY__?: boolean;
  }
}

export function SimulationCanvas({
  svgRef,
  viewBox,
  children,
}: {
  svgRef?: RefObject<SVGSVGElement>;
  viewBox?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex-1 relative border rounded-lg overflow-hidden bg-slate-50">
      {svgRef ? <svg ref={svgRef} viewBox={viewBox} className="w-full h-auto" /> : null}
      {children}
    </div>
  );
}

export function DemoSidebar({ children }: { children: ReactNode }) {
  return <div className="w-full lg:w-80 space-y-6">{children}</div>;
}

export function DemoPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  useEffect(() => {
    window.__PRERENDER_READY__ = true;
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}