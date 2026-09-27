"use client";

import { Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Reveal } from "@/components/motion";

// Muted (browsers only autoplay muted video), chrome-free (controls/kb/fullscreen/annotations/captions/related off),
// inline on iOS, and scriptable via postMessage (enablejsapi) so we can loop and time the reveal ourselves.
// No loop=1: YouTube's loop reloads the player, which replays its startup overlay on every loop.
const YT_ORIGIN = "https://www.youtube-nocookie.com";
// Thumbnail doubles as the poster that hides YouTube's startup overlay.
const THUMBNAIL = "https://i3.ytimg.com/vi/Wp9gK5SMe_c/maxresdefault.jpg";
// Playback seconds before the poster lifts; YouTube's startup overlay has faded by then.
const REVEAL_AT = 3;
// Fallback reveal if the player never reports progress (postMessage blocked), so the poster can't stick forever.
const REVEAL_FALLBACK_MS = 8000;

// Sends a command to the YouTube player inside the iframe (the protocol the official IFrame API uses).
const ytCommand = (frame: HTMLIFrameElement | null, func: string, args: unknown[] = []) =>
  frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), YT_ORIGIN);

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Strict false check: useReducedMotion is null until it reads the media query on the client,
  // so reduce-motion users never load the autoplay iframe, and SSR shows the thumbnail as a poster.
  const autoplay = reduced === false;
  // Handle on the iframe so we can talk to the player and verify message senders.
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Flips once playback is past the startup overlay; the poster fades out on it.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Nothing to listen to when the thumbnail-only (reduced-motion) mode is active.
    if (!autoplay) return;
    // Set once the player answers, so we stop asking it to start reporting.
    let heard = false;

    const onMessage = (e: MessageEvent) => {
      // Trust only our own iframe's player; any other window could post look-alike messages.
      if (e.origin !== YT_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      // The player talks in JSON strings; ignore anything unparseable.
      let data: { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } | number };
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      // First reply means the "listening" handshake worked.
      heard = true;
      // infoDelivery carries playback progress; onStateChange carries a bare state number.
      const info = typeof data.info === "object" ? data.info : undefined;
      // Past the overlay window -> lift the poster.
      if (info?.currentTime !== undefined && info.currentTime >= REVEAL_AT) setRevealed(true);
      // Loop by seeking just before the end, before YouTube can show its end screen or related videos.
      const nearEnd = info?.duration && info.currentTime !== undefined && info.currentTime >= info.duration - 0.6;
      // State 0 (ended) is the backstop if a progress tick skipped the near-end window.
      const ended = data.info === 0 || info?.playerState === 0;
      if (nearEnd || ended) {
        // seekTo keeps the same player alive, so no startup overlay reappears on the loop.
        ytCommand(frameRef.current, "seekTo", [0, true]);
        // After an actual end the player is stopped, so it needs an explicit play.
        ytCommand(frameRef.current, "playVideo");
      }
    };
    window.addEventListener("message", onMessage);

    // The player only reports events after a "listening" handshake; retry until it's ready to hear it.
    const handshake = window.setInterval(() => {
      if (heard) return window.clearInterval(handshake);
      frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT_ORIGIN);
    }, 250);
    // Never leave the poster up forever if the handshake fails.
    const fallback = window.setTimeout(() => setRevealed(true), REVEAL_FALLBACK_MS);

    // Clean up on unmount or when the mode flips, so no listener or timer outlives the iframe.
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(handshake);
      window.clearTimeout(fallback);
    };
  }, [autoplay]);

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
              <>
              <iframe
                ref={frameRef}
                // origin tells the player which page may receive its postMessage events.
                src={`${YT_ORIGIN}/embed/Wp9gK5SMe_c?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                // Screen readers skip it: it is a muted, uninteractive background loop.
                aria-hidden="true"
                // Keeps keyboard focus out of an iframe nobody can operate.
                tabIndex={-1}
                // Required title for iframes; harmless since aria-hidden removes it from the a11y tree.
                title="Aczen demo preview"
                // autoplay must be allowed explicitly or browsers block it inside the iframe.
                allow="autoplay; encrypted-media"
                // Absolute so it can overflow the rounded frame and have its edges cropped by overflow-hidden.
                className="absolute border-0 pointer-events-none"
                style={{
                  // 4% overscan (2% each side) crops the thin black edge lines YouTube leaves around the video.
                  width: "104%",
                  // Centres the overscan horizontally.
                  left: "-2%",
                  // 30% taller than the frame so YouTube's title bar and captions sit outside the visible area;
                  // max() guarantees at least 72px cropped per edge on small phones where 15% is too little.
                  height: "max(130%, calc(100% + 144px))",
                  // Shift up by the same half so the video stays centred in the frame.
                  top: "min(-15%, -72px)",
                }}
              />
              {/* Poster over the iframe hides YouTube's startup overlay (play/pause/next + gradient), then fades away. */}
              <img
                src={THUMBNAIL}
                // Decorative duplicate of the video; the heading below describes it.
                alt=""
                // Fills the frame; pointer-events-none so it never blocks anything once faded.
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700 ${revealed ? "opacity-0" : "opacity-100"}`}
              />
              </>
            ) : (
            <>
            <img
              src={THUMBNAIL}
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
