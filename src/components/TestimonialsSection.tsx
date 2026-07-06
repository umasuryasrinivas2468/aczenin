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
    accent: "from-indigo-500 to-blue-500",
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
    accent: "from-fuchsia-500 to-purple-500",
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

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -SWIPE_THRESHOLD || velocity < -500) paginate(1);
    else if (offset > SWIPE_THRESHOLD || velocity > 500) paginate(-1);
  };

  const t = testimonials[index];

  return (
    <section
      id="testimonials"
      className="relative py-24 md:py-28 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden"
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Real teams.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Real results.
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Hear from the founders running their businesses on Aczen.
          </p>
        </motion.div>

        <div className="relative max-w-3xl mx-auto select-none">
          <div className="relative h-[360px] md:h-[320px]">
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.div
                key={t.id}
                custom={direction}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={onDragEnd}
                initial={{ x: direction >= 0 ? 320 : -320, opacity: 0, scale: 0.96 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: direction >= 0 ? -320 : 320, opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                <div className="relative h-full bg-white border border-gray-100 rounded-2xl p-7 md:p-10 shadow-md">
                  <Quote
                    className="absolute top-6 right-6 w-10 h-10 text-gray-100"
                    strokeWidth={1.5}
                  />

                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${t.accent} flex items-center justify-center text-white text-lg font-bold shrink-0`}
                    >
                      {t.initials}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-md flex items-center justify-center shadow-sm">
                        <Building2 className="w-3 h-3 text-gray-700" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {t.director}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{t.role}</p>
                    </div>
                  </div>

                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-4 h-4 ${
                          idx < t.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Swipe to see more
          </p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
