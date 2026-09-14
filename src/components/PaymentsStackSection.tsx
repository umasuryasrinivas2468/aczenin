"use client";

/**
 * Payments-stack convergence.
 *
 * Five image cards sit scattered around a centred headline. As the section is
 * scrolled through, every card travels to the exact centre of the stage,
 * scaling down and un-rotating on the way, until they overlap into a single
 * compact payment card. Once the stack has formed it slides toward the bottom
 * of the stage and hands the page over to the next section.
 *
 * SCATTERED -> INWARD -> OVERLAP -> SINGLE STACK -> STACK MOVES DOWN
 *
 * Everything is driven straight off `useScroll` progress (scrubbed, never
 * fire-once), so the choreography plays forwards and backwards with the wheel.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

/** Progress at which every card has landed on the stack. */
const CONVERGED = 0.58;
/** Progress at which the parallax drift hands over to the inward travel. */
const DRIFT = 0.14;

interface CardSpec {
  id: string;
  src: string;
  alt: string;
  label: string;
  meta: string;
  /** Scattered origin, as a fraction of the stage width/height from centre. */
  from: { x: number; y: number; rotate: number };
  /** Tighter origin used below `lg`, where the stage is much narrower. */
  fromMobile: { x: number; y: number; rotate: number };
  /** Pre-convergence parallax drift, in pixels. */
  drift: number;
  /** Paint order inside the finished stack — highest sits on top. */
  z: number;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80`;

/**
 * The sector imagery carried over from the retired "Industries We Serve"
 * grid — this section now does that job as it converges.
 */
const CARDS: CardSpec[] = [
  {
    id: "retail",
    src: unsplash("photo-1604719312566-8912e9227c6a"),
    alt: "Retail",
    label: "Retail",
    meta: "Storefront collections",
    from: { x: -0.34, y: -0.3, rotate: -9 },
    fromMobile: { x: -0.3, y: -0.3, rotate: -7 },
    drift: -26,
    z: 10,
  },
  {
    id: "manufacturing",
    src: unsplash("photo-1574472374272-26e91165e036"),
    alt: "Manufacturing",
    label: "Manufacturing",
    meta: "Vendor payouts",
    from: { x: 0.34, y: -0.28, rotate: 8 },
    fromMobile: { x: 0.3, y: -0.28, rotate: 6 },
    drift: 22,
    z: 20,
  },
  {
    id: "services",
    src: unsplash("photo-1521791136064-7986c2920216"),
    alt: "Services",
    label: "Services",
    meta: "Retainers & invoicing",
    from: { x: -0.43, y: 0.08, rotate: -5 },
    fromMobile: { x: -0.34, y: 0.04, rotate: -4 },
    drift: 30,
    z: 30,
  },
  {
    id: "logistics",
    src: "/images/logistics.jpg",
    alt: "Logistics",
    label: "Logistics",
    meta: "COD reconciliation",
    from: { x: 0.41, y: 0.12, rotate: 6 },
    fromMobile: { x: 0.33, y: 0.08, rotate: 5 },
    drift: -18,
    z: 40,
  },
  {
    id: "ecommerce",
    src: unsplash("photo-1516321318423-f06f85e504b3"),
    alt: "E-commerce",
    label: "E-commerce",
    meta: "T+1 settlements",
    from: { x: 0.02, y: 0.35, rotate: -3 },
    fromMobile: { x: 0, y: 0.33, rotate: -3 },
    drift: 34,
    z: 50,
  },
];

/* ------------------------------------------------------------------ stage */

/** Live pixel size of the sticky stage, so travel distances stay responsive. */
const useStageSize = (ref: RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};

/* ------------------------------------------------------------------- card */

interface ConvergingCardProps {
  card: CardSpec;
  /** Spring-smoothed scroll progress for the whole section, 0 → 1. */
  progress: MotionValue<number>;
  width: number;
  height: number;
  compact: boolean;
  /** Index within the finished stack, used for the residual peek offset. */
  index: number;
}

const ConvergingCard = ({
  card,
  progress,
  width,
  height,
  compact,
  index,
}: ConvergingCardProps) => {
  const origin = compact ? card.fromMobile : card.from;

  const startX = origin.x * width;
  const startY = origin.y * height;

  // Residual offsets so the merged cards still read as a stack of layers
  // rather than one flat rectangle.
  const restX = (index - 2) * (compact ? 2 : 3);
  const restY = (index - 2) * (compact ? 4 : 6);

  // How far the formed stack travels toward the bottom of the stage.
  const descend = height * (compact ? 0.36 : 0.4);

  const x = useTransform(
    progress,
    [0, DRIFT, CONVERGED, 1],
    [startX, startX + card.drift * 0.4, restX, restX],
  );
  const y = useTransform(
    progress,
    [0, DRIFT, CONVERGED, 1],
    [startY, startY + card.drift, restY, restY + descend],
  );
  const rotate = useTransform(
    progress,
    [0, DRIFT, CONVERGED],
    [origin.rotate, origin.rotate * 0.85, 0],
  );
  const scale = useTransform(progress, [0, CONVERGED, 1], [1, 0.82, 0.78]);
  // Buried layers dim a little as they tuck behind the top card.
  const opacity = useTransform(
    progress,
    [CONVERGED - 0.12, CONVERGED],
    [1, index === CARDS.length - 1 ? 1 : 0.55 + index * 0.1],
  );

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -ml-[84px] -mt-[104px] w-[168px] sm:-ml-[100px] sm:-mt-[124px] sm:w-[200px] lg:-ml-[116px] lg:-mt-[144px] lg:w-[232px]"
      style={{ x, y, rotate, scale, opacity, zIndex: card.z }}
    >
      <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/5 lg:rounded-[28px]">
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <img
            src={card.src}
            alt={card.alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 lg:p-4">
            <p className="text-[11px] font-semibold text-white lg:text-sm">{card.label}</p>
            <p className="text-[9px] text-white/70 lg:text-xs">{card.meta}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/** Reduced-motion fallback: the scattered layout, held still. */
const StaticCard = ({ card }: { card: CardSpec }) => (
  <div
    className="absolute w-[168px] -translate-x-1/2 -translate-y-1/2 lg:w-[232px]"
    style={{
      left: `${50 + card.from.x * 50}%`,
      top: `${50 + card.from.y * 50}%`,
      zIndex: card.z,
    }}
  >
    <div className="overflow-hidden rounded-[22px] bg-white shadow-lg ring-1 ring-black/5">
      <img src={card.src} alt={card.alt} className="aspect-[4/5] w-full object-cover" />
    </div>
  </div>
);

/* ---------------------------------------------------------------- section */

const PaymentsStackSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { width, height } = useStageSize(stageRef);
  const compact = width > 0 && width < 1024;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Spring the raw progress so the whole rig eases instead of snapping to the
  // wheel, while staying scrubbed by scroll position rather than played once.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
    restDelta: 0.0005,
  });

  // The headline hides while the stack sits on top of it, then returns once
  // the stack has moved down and vacated the centre.
  const headingOpacity = useTransform(progress, [0, 0.3, CONVERGED, 0.82], [1, 1, 0.12, 1]);
  const headingScale = useTransform(progress, [0, CONVERGED], [1, 0.96]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[190vh] bg-white"
      aria-label="The whole payments stack, on one platform"
    >
      <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
        {/* Soft brand glows behind everything. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 18% 22%, rgba(46,119,255,0.16) 0%, rgba(46,119,255,0) 70%), radial-gradient(55% 50% at 84% 70%, rgba(255,145,77,0.18) 0%, rgba(255,145,77,0) 70%)",
          }}
        />

        {/* Very subtle curved guide lines. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <g stroke="currentColor" className="text-smebank-500/10">
            <path d="M-80 620C220 430 420 760 720 560s500-380 820-160" strokeWidth="1.25" />
            <path d="M-80 430C260 300 460 610 760 420s520-300 800-110" strokeWidth="1" />
          </g>
          <g stroke="currentColor" className="text-smeorange-500/10">
            <path d="M-60 760C280 640 430 880 760 700s560-240 820-60" strokeWidth="1.25" />
          </g>
        </svg>

        {/* Centred headline. */}
        <motion.div
          className="absolute inset-x-0 top-1/2 z-[5] -translate-y-1/2 px-6 text-center"
          style={reduced ? undefined : { opacity: headingOpacity, scale: headingScale }}
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-smeorange-500">
            One platform
          </p>
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            The whole payments stack,{" "}
            <span className="text-smebank-500">on one platform.</span>
          </h2>
        </motion.div>

        {/* The five travelling cards. */}
        <div className="absolute inset-0">
          {width > 0 &&
            CARDS.map((card, index) =>
              reduced ? (
                <StaticCard key={card.id} card={card} />
              ) : (
                <ConvergingCard
                  // Remounting on resize re-seeds the measured travel distances.
                  key={`${card.id}-${width}x${height}`}
                  card={card}
                  index={index}
                  progress={progress}
                  width={width}
                  height={height}
                  compact={compact}
                />
              ),
            )}
        </div>
      </div>
    </section>
  );
};

export default PaymentsStackSection;
