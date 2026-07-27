"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AnimatedBorder from "@/components/reactbits/AnimatedBorder";

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* heading column, separated from the frame by a hairline rule */}
        <div className="max-w-2xl border-b border-border pb-8 mb-8">
          <p className="eyebrow">Product tour</p>
          <h2 className="section-title mt-3 text-slate-900">
            See how Aczen works
          </h2>
          <p className="mt-3 text-muted-foreground">
            A two-minute look at the finance workspace transforming banking for
            Indian SMEs.
          </p>
        </div>

        {/* document/viewer panel */}
        <AnimatedBorder>
          {/* toolbar strip */}
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Viewer
            </span>
            <span className="tabular font-mono text-xs text-muted-foreground">
              aczen-product-demo.mp4
            </span>
          </div>

          <div
            className="group relative aspect-video cursor-pointer overflow-hidden bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/10 transition-colors duration-300 group-hover:bg-slate-900/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded border border-border bg-white">
                <Play className="ml-0.5 h-7 w-7 fill-secondary text-secondary" />
              </span>
            </div>
          </div>
        </AnimatedBorder>
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
            className="rounded"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VideoSection;
