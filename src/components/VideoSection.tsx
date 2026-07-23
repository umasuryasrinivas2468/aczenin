"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ease = [0.16, 1, 0.3, 1] as const;

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          {/* offset caption panel */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="lg:col-span-4 border-2 border-slate-900 bg-smeteal-400 p-7 shadow-soft"
          >
            <span className="eyebrow">Product tour</span>
            <h2 className="section-title mt-4">See how Aczen works</h2>
            <p className="mt-3 text-lg text-slate-900">
              A two-minute look at the finance workspace transforming banking for
              Indian SMEs.
            </p>
          </motion.div>

          {/* brutalist monitor frame */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="lg:col-span-8 border-2 border-slate-900 bg-white shadow-soft-lg"
          >
            {/* title bar */}
            <div className="flex items-center gap-3 border-b-2 border-slate-900 bg-smebank-500 px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 border-2 border-slate-900 bg-white" />
                <span className="h-3 w-3 border-2 border-slate-900 bg-smeorange-400" />
                <span className="h-3 w-3 border-2 border-slate-900 bg-smeteal-400" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
                aczen-demo.mp4
              </span>
            </div>

            {/* screen / player */}
            <div className="p-2.5">
              <div
                className="group relative aspect-video cursor-pointer overflow-hidden border-2 border-slate-900 bg-slate-900"
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
                <div className="absolute inset-0 bg-slate-900/10 transition-colors duration-300 group-hover:bg-slate-900/25" />
                {/* play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-20 w-20 items-center justify-center border-2 border-slate-900 bg-white shadow-soft-lg transition-transform duration-300 group-hover:scale-110">
                    <Play className="ml-1 h-8 w-8 fill-smebank-500 text-smebank-500" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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
