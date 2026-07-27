"use client";

// React Bits — animated beam border (brand-blue travelling glow).
// https://reactbits.dev
import type { ReactNode } from "react";

interface AnimatedBorderProps {
  children: ReactNode;
  className?: string;
}

export default function AnimatedBorder({ children, className = "" }: AnimatedBorderProps) {
  return (
    <div className={`beam-wrap rounded ${className}`}>
      <div className="beam-inner rounded bg-white overflow-hidden">{children}</div>
    </div>
  );
}
