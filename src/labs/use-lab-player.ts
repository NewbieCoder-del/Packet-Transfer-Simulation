import { useCallback, useEffect, useState } from 'react';

export interface LabPlayer {
  index: number;
  playing: boolean;
  atEnd: boolean;
  start: () => void;
  step: () => void;
  reset: () => void;
}

const STEP_DELAY = 900;

interface PlayerState {
  key: string;
  index: number;
  playing: boolean;
}

/**
 * Plays a pre-computed list of lab steps. A new configuration rebuilds the step
 * list and restarts playback from the first step.
 */
export function useLabPlayer(count: number, configKey: string): LabPlayer {
  const [state, setState] = useState<PlayerState>({ key: configKey, index: 0, playing: false });

  // A different configuration is a different run: reset while rendering instead of in an effect.
  if (state.key !== configKey) {
    setState({ key: configKey, index: 0, playing: false });
  }

  const last = Math.max(count - 1, 0);
  const index = Math.min(state.index, last);
  const atEnd = count === 0 || index >= last;

  useEffect(() => {
    if (!state.playing || atEnd) return;
    const timer = setTimeout(() => {
      setState((current) => ({ ...current, index: Math.min(current.index + 1, last) }));
    }, STEP_DELAY);
    return () => clearTimeout(timer);
  }, [state.playing, index, atEnd, last]);

  const start = useCallback(() => {
    if (count <= 1) return;
    setState((current) => {
      const currentIndex = Math.min(current.index, last);
      if (currentIndex < last && current.playing) return { ...current, playing: false };
      return { ...current, index: currentIndex >= last ? 0 : currentIndex, playing: true };
    });
  }, [count, last]);

  const step = useCallback(() => {
    setState((current) => ({ ...current, playing: false, index: Math.min(Math.min(current.index, last) + 1, last) }));
  }, [last]);

  const reset = useCallback(() => {
    setState((current) => ({ ...current, index: 0, playing: false }));
  }, []);

  return { index, playing: state.playing && !atEnd, atEnd, start, step, reset };
}
