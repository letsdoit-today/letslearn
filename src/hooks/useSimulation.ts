import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseSimulationOptions {
  dt?: number;
  speed?: number;
  loop?: boolean;
}

export interface SimulationApi<T> {
  frames: T[];
  time: number;
  maxTime: number;
  isRunning: boolean;
  currentFrame: T | undefined;
  setTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
}

export function useSimulation<T extends { t: number }>(
  compute: () => T[],
  deps: unknown[],
  { dt = 0.01, speed = 1, loop = false }: UseSimulationOptions = {},
): SimulationApi<T> {
  const frames = useMemo(compute, deps);
  const maxTime = useMemo(
    () => (frames.length > 0 ? frames[frames.length - 1].t : 0),
    [frames],
  );

  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const toggle = useCallback(() => setIsRunning((r) => !r), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTime(0);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    let rafId = 0;
    const loopFn = () => {
      setTime((prev) => {
        const next = prev + dt * speed;
        if (next >= maxTime) {
          if (loop && maxTime > 0) {
            return next % maxTime;
          }
          setIsRunning(false);
          return maxTime;
        }
        return next;
      });
      rafId = requestAnimationFrame(loopFn);
    };
    rafId = requestAnimationFrame(loopFn);

    return () => cancelAnimationFrame(rafId);
  }, [isRunning, maxTime, dt, speed, loop]);

  const currentFrame = useMemo(
    () => frames.find((f) => f.t >= time) ?? frames[frames.length - 1],
    [frames, time],
  );

  return {
    frames,
    time,
    maxTime,
    isRunning,
    currentFrame,
    setTime,
    play,
    pause,
    toggle,
    reset,
  };
}