'use client';

import { useCallback, useRef, useState } from 'react';

type Direction = 'left' | 'right' | 'up' | 'down';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  isSwiping: boolean;
  direction: Direction | null;
  deltaX: number;
  deltaY: number;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function useSwipeGestures(handlers: SwipeHandlers) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  });

  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setSwipeState({ isSwiping: true, direction: null, deltaX: 0, deltaY: 0 });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;

    let direction: Direction | null = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    setSwipeState({ isSwiping: true, direction, deltaX, deltaY });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!startRef.current) return;

    const { deltaX, deltaY, direction } = swipeState;
    const elapsed = Date.now() - startRef.current.time;
    const velocityX = Math.abs(deltaX) / elapsed;
    const velocityY = Math.abs(deltaY) / elapsed;

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const absDelta = isHorizontalSwipe ? Math.abs(deltaX) : Math.abs(deltaY);
    const velocity = isHorizontalSwipe ? velocityX : velocityY;

    if (absDelta > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD) {
      switch (direction) {
        case 'left':
          handlers.onSwipeLeft?.();
          break;
        case 'right':
          handlers.onSwipeRight?.();
          break;
        case 'up':
          handlers.onSwipeUp?.();
          break;
        case 'down':
          handlers.onSwipeDown?.();
          break;
      }
    }

    startRef.current = null;
    setSwipeState({ isSwiping: false, direction: null, deltaX: 0, deltaY: 0 });
  }, [swipeState, handlers]);

  return {
    swipeState,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
