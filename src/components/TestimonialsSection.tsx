"use client";

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Star } from "lucide-react";

type Testimonial = {
  id: number;
  company: string;
  director: string;
  role: string;
  initials: string;
  accent: string;
  quote: string;
  rating: number;
};

const testimonials: Testimonial[] = [
  {
    id: 1,
    company: "Novify",
    director: "Karthik",
    role: "Director, Novify",
    initials: "NV",
    accent: "from-smeteal-500 to-blue-500",
    quote:
      "Aczen changed the way we close our books. What used to take a week now wraps up in a single afternoon — invoicing, GST, reconciliations, all in one flow.",
    rating: 5,
  },
  {
    id: 2,
    company: "Raksha Higine",
    director: "Rishitha",
    role: "Director, Raksha Higine",
    initials: "RH",
    accent: "from-emerald-500 to-teal-500",
    quote:
      "The cash-flow insights surface decisions before I even ask. Aczen is less like accounting software and more like a finance teammate that never sleeps.",
    rating: 5,
  },
  {
    id: 3,
    company: "Employee Galaxy",
    director: "Sandeep",
    role: "Director, Employee Galaxy",
    initials: "EG",
    accent: "from-smeteal-500 to-smebank-500",
    quote:
      "From compliance to vendor payments, Aczen handles the heavy lifting. Our team finally gets to focus on growth instead of paperwork.",
    rating: 5,
  },
];

const SWIPE_THRESHOLD = 80;

const Rating = ({ rating }: { rating: number }) => (
  <span className="inline-flex items-center gap-1 tabular" aria-label={`${rating} out of 5`}>
    {Array.from({ length: 5 }).map((_, idx) => (
      <Star
        key={idx}
        className={`w-3.5 h-3.5 ${
          idx < rating ? "text-secondary fill-secondary" : "text-border"
        }`}
        strokeWidth={1.5}
      />
    ))}
  </span>
);

const TestimonialsSection = () => {
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);

  const paginate = (dir: number) => {
    setState(([i]) => [
      (i + dir + testimonials.length) % testimonials.length,
      dir,
    ]);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -SWIPE_THRESHOLD || velocity < -500) paginate(1);
    else if (offset > SWIPE_THRESHOLD || velocity > 500) paginate(-1);
  };

  const t = testimonials[index];
  const secondary = testimonials.filter((_, i) => i !== index);

  return (
    <section
      id="testimonials"
      className="py-24 md:py-28 bg-white border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 border-b border-border pb-8">
          <p className="eyebrow">Real teams. Real results.</p>
          <h2 className="section-title mt-3 text-slate-900">
            Hear from the founders running their businesses on Aczen.
          </h2>
        </div>

        <div className="grid gap-0 lg:grid-cols-3 lg:divide-x lg:divide-border select-none">
          {/* Featured quote register */}
          <div className="lg:col-span-2 lg:pr-12">
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.figure
                key={t.id}
                custom={direction}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={onDragEnd}
                initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="cursor-grab active:cursor-grabbing motion-reduce:transform-none"
              >
                <blockquote className="display text-2xl md:text-3xl leading-snug text-slate-900">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <figcaption className="rule mt-8 flex items-center gap-4 border-t border-border pt-5">
                  <div
                    className={`w-12 h-12 rounded bg-gradient-to-br ${t.accent} flex items-center justify-center text-white text-sm font-semibold tabular border border-border shrink-0`}
                  >
                    {t.initials}
                  </div>
                  <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <div className="min-w-0">
                      <span className="tabular text-sm font-semibold text-slate-900">
                        {t.director}
                      </span>
                      <span className="tabular block text-sm text-muted-foreground">
                        {t.role}
                      </span>
                    </div>
                    <Rating rating={t.rating} />
                  </div>
                </figcaption>
              </motion.figure>
            </AnimatePresence>

            <p className="tabular mt-6 text-xs text-muted-foreground">
              Swipe to see more
            </p>
          </div>

          {/* Secondary quote ledger */}
          <div className="mt-10 lg:mt-0 lg:pl-12 divide-y divide-border border-t border-border lg:border-t-0">
            {secondary.map((s) => (
              <div key={s.id} className="py-6 first:pt-0 lg:first:pt-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded bg-gradient-to-br ${s.accent} flex items-center justify-center text-white text-xs font-semibold tabular border border-border shrink-0`}
                  >
                    {s.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="tabular block text-sm font-semibold text-slate-900 truncate">
                      {s.director}
                    </span>
                    <span className="tabular block text-xs text-muted-foreground truncate">
                      {s.role}
                    </span>
                  </div>
                  <Rating rating={s.rating} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{s.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
