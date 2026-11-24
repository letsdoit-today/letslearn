import type { ReactNode } from 'react';

export interface PrincipleCardProps {
  title: string;
  children: ReactNode;
  variant?: 'blue' | 'slate';
}

export function PrincipleCard({ title, children, variant = 'blue' }: PrincipleCardProps) {
  if (variant === 'slate') {
    return (
      <div className="bg-muted p-3 rounded">
        <h4 className="text-primary font-bold mb-1 text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
      </div>
    );
  }
  return (
    <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
      <h4 className="font-semibold text-primary mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}