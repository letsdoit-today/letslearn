import { cn } from '@/lib/utils';

export interface DataItem {
  label: string;
  value: string;
  className?: string;
  color?: string;
  mono?: boolean;
  highlight?: boolean;
}

export function DataPanel({ items }: { items: DataItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {items.map((item) => (
        <div
          key={item.label}
          className={item.highlight ? 'col-span-2 bg-slate-100 p-2 rounded' : undefined}
        >
          <span className="text-muted-foreground block">{item.label}</span>
          <span
            className={cn(
              item.mono !== false && 'font-mono',
              item.highlight && 'font-bold',
              item.className,
            )}
            style={item.color ? { color: item.color } : undefined}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}