"use client";

import { Play, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Reveal } from "@/components/motion";

// Muted (browsers only autoplay muted video), looping (loop needs playlist=<same id>), chrome-free
// (controls/kb/fullscreen/annotations/captions/related off), inline on iOS; nocookie avoids tracking cookies.
const AUTOPLAY_SRC =
  "https://www.youtube-nocookie.com/embed/Wp9gK5SMe_c?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&rel=0&playsinline=1&loop=1&playlist=Wp9gK5SMe_c";

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Strict false check: useReducedMotion is null until it reads the media query on the client,
  // so reduce-motion users never load the autoplay iframe, and SSR shows the thumbnail as a poster.
  const autoplay = reduced === false;

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
            // Pointer + hover styles only make sense when the frame itself is the click target (thumbnail mode).
            className={`relative rounded-2xl overflow-hidden bg-gray-900 aspect-video ${autoplay ? "" : "cursor-pointer group"}`}
            style={reduced ? undefined : { scale }}
            // In autoplay mode the frame is decorative; the "Watch with sound" link opens the popup instead.
            onClick={autoplay ? undefined : () => setIsOpen(true)}
          >
            {autoplay ? (
              <iframe
                src={AUTOPLAY_SRC}
                // Screen readers skip it: it is a muted, uninteractive background loop.
                aria-hidden="true"
                // Keeps keyboard focus out of an iframe nobody can operate.
                tabIndex={-1}
                // Required title for iframes; harmless since aria-hidden removes it from the a11y tree.
                title="Aczen demo preview"
                // autoplay must be allowed explicitly or browsers block it inside the iframe.
                allow="autoplay; encrypted-media"
                // Absolute so it can overflow the rounded frame and have its edges cropped by overflow-hidden.
                className="absolute left-0 w-full border-0 pointer-events-none"
                style={{
                  // 30% taller than the frame so YouTube's title bar and captions sit outside the visible area;
                  // max() guarantees at least 72px cropped per edge on small phones where 15% is too little.
                  height: "max(130%, calc(100% + 144px))",
                  // Shift up by the same half so the video stays centred in the frame.
                  top: "min(-15%, -72px)",
                }}
              />
            ) : (
            <>
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
            </>
            )}
          </motion.div>

          {/* Autoplay is muted by browser policy, so offer an explicit way to hear it. */}
          {autoplay && (
            <div className="mt-4 text-center">
              <button
                // type="button" so it never submits a surrounding form.
                type="button"
                // Reuses the existing popup, which plays the video with sound.
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-smeorange-500 hover:text-smeorange-600 underline-offset-4 hover:underline"
              >
                {/* Speaker icon signals "sound" at a glance; decorative, so hidden from screen readers. */}
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                Watch with sound
              </button>
            </div>
          )}

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
