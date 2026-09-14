"use client";

/**
 * Shared motion primitives.
 *
 * Content rises into place on scroll, headlines resolve word by word, and hero
 * art drifts on a parallax track. Every primitive collapses to a plain static
 * render when the visitor prefers reduced motion.
 */

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ElementType,
  type ReactNode,
} from "react";

/** The house easing curve: a firm start that settles instead of bouncing. */
export const EASE = [0.22, 1, 0.36, 1] as const;

type Direction = "up" | "down" | "left" | "right" | "none";

const offsetFor = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
    default:
      return {};
  }
};

/* ------------------------------------------------------------------ Reveal */

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Where the element travels in from. */
  direction?: Direction;
  distance?: number;
  delay?: number;
  duration?: number;
  /** Add a little scale-in alongside the slide. */
  scale?: boolean;
}

/** Fades and slides a block into place the first time it scrolls into view. */
export const Reveal = ({
  children,
  className,
  direction = "up",
  distance = 28,
  delay = 0,
  duration = 0.7,
  scale = false,
}: RevealProps) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        ...offsetFor(direction, distance),
        ...(scale ? { scale: 0.96 } : {}),
      }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

/* ----------------------------------------------------------------- Stagger */

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Gap between each child entrance, in seconds. */
  stagger?: number;
  delay?: number;
}

/** Parent that releases its StaggerItem children one after another. */
export const Stagger = ({ children, className, stagger = 0.09, delay = 0 }: StaggerProps) => {
  const reduced = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

export const StaggerItem = ({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & ComponentProps<typeof motion.div>) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={staggerItemVariants} {...rest}>
      {children}
    </motion.div>
  );
};

/* --------------------------------------------------------------- WordsRise */

interface WordsRiseProps {
  text: string;
  className?: string;
  /** Class applied to the words listed in `highlight`. */
  highlightClassName?: string;
  /** Zero-based word indices that get `highlightClassName`. */
  highlight?: number[];
  delay?: number;
  stagger?: number;
  as?: ElementType;
}

/**
 * Headline that resolves word by word from behind a clipping mask, the
 * signature type-set entrance on modern fintech hero sections.
 */
export const WordsRise = ({
  text,
  className,
  highlightClassName,
  highlight = [],
  delay = 0,
  stagger = 0.055,
  as: Tag = "h1",
}: WordsRiseProps) => {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  const highlighted = new Set(highlight);

  if (reduced) {
    return (
      <Tag className={className}>
        {words.map((word, i) => (
          <span key={i} className={highlighted.has(i) ? highlightClassName : undefined}>
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-bottom pb-[0.14em] -mb-[0.14em]"
        >
          <motion.span
            className={highlighted.has(i) ? `inline-block ${highlightClassName ?? ""}` : "inline-block"}
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.75, delay: delay + i * stagger, ease: EASE }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
};

/* ---------------------------------------------------------------- Parallax */

/**
 * Drifts its children against the scroll direction while the section passes
 * through the viewport. `speed` is the travel distance in pixels.
 */
export const Parallax = ({
  children,
  className,
  speed = 60,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className={className}>
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------- Float */

/** Slow idle bob, used for the free-floating UI cards in the hero. */
export const Float = ({
  children,
  className,
  amplitude = 10,
  duration = 6,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [-amplitude, amplitude, -amplitude] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};

/* ----------------------------------------------------------------- Counter */

/** Counts up to `value` once it scrolls into view. */
export const Counter = ({
  value,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (reduced) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo: fast out of the gate, gentle landing on the final number.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
};

/* ---------------------------------------------------------------- TiltCard */

/** Card that tilts a few degrees toward the cursor and lifts on hover. */
export const TiltCard = ({
  children,
  className,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), {
    stiffness: 200,
    damping: 20,
  });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((event.clientX - rect.left) / rect.width - 0.5);
        y.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

/* -------------------------------------------------------- ScrollProgressBar */

/** Thin brand-coloured progress rail pinned to the top of the page. */
export const ScrollProgressBar = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-smeorange-500 via-smeorange-400 to-smebank-500"
      style={{ scaleX }}
    />
  );
};
