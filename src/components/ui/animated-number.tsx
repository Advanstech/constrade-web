"use client";

import { useEffect, useState } from "react";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({ value, isCurrency = true, prefix = "", suffix = "", className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isCompact, setIsCompact] = useState(true);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const duration = 1200; // 1.2 seconds smooth animation
    const startValue = displayValue;
    const endValue = value;

    if (startValue === endValue) return;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutQuart for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(startValue + (endValue - startValue) * easeProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const shouldCompact = isCompact && Math.abs(value) >= 10000; // Only compact if final value is large

  const formattedValue = isCurrency 
    ? formatGHS(displayValue, { compact: shouldCompact })
    : displayValue.toLocaleString(undefined, { 
        maximumFractionDigits: shouldCompact ? 2 : 0,
        notation: shouldCompact ? "compact" : "standard"
      });
      
  const formatted = `${prefix}${formattedValue}${suffix}`;

  return (
    <span 
      onClick={() => setIsCompact(!isCompact)} 
      className={cn(
        "cursor-pointer transition-colors hover:opacity-80 active:scale-95 inline-block",
        className
      )}
      title={isCompact ? "Click to see exact amount" : "Click to see compact amount"}
    >
      {formatted}
    </span>
  );
}
