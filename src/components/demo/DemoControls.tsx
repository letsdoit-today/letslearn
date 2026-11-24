import type { ReactNode } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export interface DemoControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onReset: () => void;
  playLabel?: string;
  pauseLabel?: string;
  hoverTip?: ReactNode;
}

export function DemoControls({
  isPlaying,
  onToggle,
  onReset,
  playLabel = '自动演示',
  pauseLabel = '暂停',
  hoverTip,
}: DemoControlsProps) {
  const playButton = (
    <Button onClick={onToggle} variant={isPlaying ? 'secondary' : 'default'} className="w-full">
      {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
      {isPlaying ? pauseLabel : playLabel}
    </Button>
  );

  return (
    <div className="flex gap-2">
      {hoverTip ? (
        <HoverCard>
          <HoverCardTrigger className="w-full">{playButton}</HoverCardTrigger>
          <HoverCardContent>{hoverTip}</HoverCardContent>
        </HoverCard>
      ) : (
        playButton
      )}
      <Button onClick={onReset} variant="outline" size="icon">
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}