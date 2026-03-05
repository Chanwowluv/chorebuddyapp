import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startYRef.current;

    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, MAX_PULL));
    } else {
      pullingRef.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistance >= THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  // Register touchmove with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, [handleTouchMove]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = isRefreshing ? 0 : progress * 180;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center overflow-hidden transition-all duration-200 ease-out"
        style={{
          height: pullDistance > 0 || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` : '0px',
          opacity: progress,
        }}
      >
        <div className="flex items-center justify-center py-2">
          <RefreshCw
            className={`w-6 h-6 text-[#5E3B85] ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              transition: isRefreshing ? undefined : 'transform 0.1s ease-out',
            }}
          />
        </div>
      </div>

      {children}
    </div>
  );
}
