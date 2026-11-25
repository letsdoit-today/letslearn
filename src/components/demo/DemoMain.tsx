import type { ReactNode } from 'react';

export function DemoMain({ children }: { children: ReactNode }) {
  return (
    <div data-demo-workspace className="flex-1 min-w-0 flex flex-col gap-3">
      {children}
    </div>
  );
}