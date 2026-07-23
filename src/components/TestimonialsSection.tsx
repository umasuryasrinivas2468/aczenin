"use client";

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Quote, Star, Building2 } from "lucide-react";

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

const TestimonialsSection = () => {
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);

  const paginate = (dir: number) => {
    setState(([i]) => [
      (i + dir + testimonials.length) % testimonials.length,
      dir,
    ]);
  };

  const goTo = (target: number) => {
    setState(([i]) => [target, target > i ? 1 : -1]);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -SWIPE_THRESHOLD || velocity < -500) paginate(1);
    else if (offset > SWIPE_THRESHOLD || velocity > 500) paginate(-1);
  };

  const t = testimonials[index];
  const others = testimonials.filter((_, i) => i !== index);

  return (
    <section id="testimonials" className="py-24 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-14">
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 bg-smeteal-400" />
            Loved by founders
          </span>
          <h2 className="section-title mt-4">
            Real teams. Real results.
          </h2>
          <p className="mt-4 text-lg text-slate-900 max-w-2xl">
            Hear from the founders running their businesses on Aczen.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5 items-start select-none">
          {/* Featured quote */}
          <div className="md:col-span-3">
            <div className="relative h-full min-h-[360px] md:min-h-[420px]">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={t.id}
                  custom={direction}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={onDragEnd}
                  initial={{ x: direction >= 0 ? 320 : -320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction >= 0 ? -320 : 320, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                >
                  <div className="relative h-full flex flex-col border-2 border-slate-900 bg-smebank-500 text-white shadow-soft-lg p-8 md:p-10">
                    <Quote
                      className="w-16 h-16 md:w-20 md:h-20 text-smeteal-400 shrink-0"
                      strokeWidth={1.5}
                    />

                    <p className="mt-4 text-xl md:text-2xl leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>

                    <div className="mt-auto pt-8 flex items-center gap-4">
                      <div className="relative w-14 h-14 border-2 border-slate-900 bg-white text-slate-900 flex items-center justify-center text-lg font-bold shrink-0">
                        {t.initials}
                        <span className="absolute -bottom-2 -right-2 w-6 h-6 border-2 border-slate-900 bg-smeteal-400 flex items-center justify-center">
                          <Building2 className="w-3 h-3 text-slate-900" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate">
                          {t.director}
                        </h3>
                        <p className="text-sm text-white/80 truncate">{t.role}</p>
                        <div className="mt-1 flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-4 h-4 ${
                                idx < t.rating
                                  ? "text-smeteal-400 fill-smeteal-400"
                                  : "text-white/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Staggered smaller cards */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {others.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onClick={() => goTo(testimonials.indexOf(o))}
                className={`text-left border-2 border-slate-900 bg-white text-slate-900 shadow-soft p-6 transition-transform hover:-translate-y-1 ${
                  i === 1 ? "md:mt-8" : ""
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 border-2 border-slate-900 bg-smebank-50 flex items-center justify-center text-sm font-bold shrink-0">
                    {o.initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{o.director}</h3>
                    <p className="text-sm text-slate-900/70 truncate">{o.role}</p>
                  </div>
                </div>
                <p className="text-base leading-relaxed">&ldquo;{o.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${
                        idx < o.rating
                          ? "text-smeteal-400 fill-smeteal-400"
                          : "text-slate-900/20"
                      }`}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-900/70 mt-6">
          Swipe to see more
        </p>
      </div>
    </section>
  );
};

export default TestimonialsSection;
