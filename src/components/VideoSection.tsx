"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ease = [0.16, 1, 0.3, 1] as const;

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-background via-background to-smebank-50/40">
      {/* soft ambient wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[420px] rounded-full bg-smeteal-100/40 blur-[130px]" />
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-smebank-600 shadow-soft">
            Product tour
          </span>
          <h2 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            See how Aczen works
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            A two-minute look at the finance workspace transforming banking for
            Indian SMEs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease }}
          className="max-w-4xl mx-auto"
        >
          {/* framed player — soft-premium depth + subtle gradient rim */}
          <div className="rounded-[26px] bg-gradient-to-br from-smebank-200/60 via-white to-smeteal-200/50 p-[1.5px] shadow-soft-lg">
            <div className="rounded-[24px] bg-white p-2.5">
              <div
                className="group relative aspect-video cursor-pointer overflow-hidden rounded-2xl bg-slate-900"
                onClick={() => setIsOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="Play Aczen product video"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setIsOpen(true);
                }}
              >
                <img
                  src="https://i3.ytimg.com/vi/Wp9gK5SMe_c/maxresdefault.jpg"
                  alt="Aczen product demo"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* darken on hover for contrast */}
                <div className="absolute inset-0 bg-slate-900/10 transition-colors duration-300 group-hover:bg-slate-900/25" />
                {/* play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="relative flex h-20 w-20 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 animate-ping" />
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-soft-lg transition-transform duration-300 group-hover:scale-110">
                      <Play className="ml-1 h-8 w-8 fill-smebank-600 text-smebank-600" />
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <iframe
            width="100%"
            height="515"
            src={isOpen ? "https://www.youtube.com/embed/Wp9gK5SMe_c?autoplay=1" : ""}
            title="Aczen Demo Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VideoSection;
