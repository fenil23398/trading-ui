"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
};

export function AnimatedNumber({
  value,
  decimals = 2,
  durationMs = 240,
  className,
  prefix = "",
  suffix = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const start = prevValueRef.current;
    const delta = value - start;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) * (1 - progress);
      const next = start + delta * eased;
      setDisplayValue(next);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        prevValueRef.current = value;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, value]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}
