import { useEffect, type ReactNode, type RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

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
    <div data-demo-canvas className="flex-1 relative border rounded-lg overflow-hidden bg-slate-50">
      {svgRef ? (
        <svg ref={svgRef} viewBox={viewBox} className="w-full h-auto max-h-[calc(100vh_-_12rem)]" />
      ) : null}
      {children}
    </div>
  );
}

export function DemoSidebar({ children }: { children: ReactNode }) {
  return <div data-demo-sidebar className="w-full xl:w-80 space-y-6">{children}</div>;
}

export function DemoPage({
  title,
  description,
  principles,
  reference,
  children,
}: {
  title: string;
  description: string;
  principles?: ReactNode;
  reference?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    window.__PRERENDER_READY__ = true;
  }, []);

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{title}</h1>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {principles ? (
            <div className="grid gap-3 sm:grid-cols-2">{principles}</div>
          ) : null}
          {reference ? (
            <div className="text-xs text-muted-foreground">{reference}</div>
          ) : null}
          <div className="flex flex-col xl:flex-row gap-6">{children}</div>
        </CardContent>
      </Card>
    </div>
  );
}