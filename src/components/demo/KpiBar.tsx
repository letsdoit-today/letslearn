import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface KpiItem {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}

export function KpiBar({ items, children }: { items: KpiItem[]; children?: ReactNode }) {
  return (
    <div data-demo-kpi className="flex flex-wrap items-stretch gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 min-w-[6.5rem] rounded-lg border bg-card px-3 py-2"
        >
          <div className="text-[11px] leading-tight text-muted-foreground truncate">
            {item.label}
          </div>
          <div
            className={cn('font-mono text-base font-semibold leading-tight')}
            style={item.color ? { color: item.color } : undefined}
          >
            {item.value}
          </div>
          {item.hint ? (
            <div className="text-[11px] leading-tight text-muted-foreground truncate">
              {item.hint}
            </div>
          ) : null}
        </div>
      ))}
      {children}
    </div>
  );
}