import type { ReactNode } from 'react';

export interface LegendItem {
  label: string;
  color: string;
}

export function CanvasLegend({ items, note }: { items: LegendItem[]; note?: ReactNode }) {
  return (
    <div
      data-demo-legend
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-foreground">{item.label}</span>
        </span>
      ))}
      {note ? <span className="text-[11px] text-muted-foreground">{note}</span> : null}
    </div>
  );
}