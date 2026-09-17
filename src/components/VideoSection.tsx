"use client";

import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Reveal } from "@/components/motion";

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The frame scales up as it travels into view, then settles.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });
  const rawScale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const scale = useSpring(rawScale, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto" ref={sectionRef}>
          <motion.div
            className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video cursor-pointer group"
            style={reduced ? undefined : { scale }}
            onClick={() => setIsOpen(true)}
          >
            <img
              src="https://i3.ytimg.com/vi/Wp9gK5SMe_c/maxresdefault.jpg"
              alt="Video thumbnail"
              className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Ripple halo radiating off the play button */}
                {!reduced && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-white/40"
                    animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.div
                  className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                  whileHover={reduced ? undefined : { scale: 1.12 }}
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                >
                  <Play className="w-8 h-8 text-smeorange-500 ml-1" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <Reveal className="mt-8 text-center" delay={0.1}>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              See How Aczen Works
            </h3>
            <p className="text-gray-600">
              Watch how Aczen is transforming banking for Indian SMEs
            </p>
          </Reveal>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0">
          <iframe
            width="100%"
            height="515"
            src={isOpen ? "https://www.youtube.com/embed/Wp9gK5SMe_c?autoplay=1" : ""}
            title="SMEAczen Demo Video"
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
