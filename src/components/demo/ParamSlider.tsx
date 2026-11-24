import type { ReactNode } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  formatValue?: (value: number) => string;
  helper?: ReactNode;
}

export function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  disabled,
  formatValue,
  helper,
}: ParamSliderProps) {
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div className="space-y-1">
      <Label>
        {label}: {display}
      </Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(vals) => onValueChange(vals[0])}
      />
      {helper}
    </div>
  );
}