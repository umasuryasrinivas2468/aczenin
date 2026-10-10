"use client";

/*
  Motion defaults for the studio: every animation below honours the user's
  reduced-motion setting, so nothing slides for someone who asked it not to.
*/

import { MotionConfig, motion } from "framer-motion";
import type { ReactNode } from "react";

export default function StudioMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
      {children}
    </MotionConfig>
  );
}

/* Page-level entrance: a short fade-and-rise, staggered for direct children. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
