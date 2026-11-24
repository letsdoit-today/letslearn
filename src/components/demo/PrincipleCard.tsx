import type { ReactNode } from 'react';

export interface PrincipleCardProps {
  title: string;
  children: ReactNode;
  variant?: 'blue' | 'slate';
}

export function PrincipleCard({ title, children, variant = 'blue' }: PrincipleCardProps) {
  if (variant === 'slate') {
    return (
      <div className="bg-slate-100 p-3 rounded">
        <h4 className="text-blue-600 font-bold mb-1 text-sm">{title}</h4>
        <p className="text-xs text-slate-700 leading-relaxed">{children}</p>
      </div>
    );
  }
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h4 className="font-semibold text-blue-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-700">{children}</p>
    </div>
  );
}