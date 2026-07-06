"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { loadGoogleAnalytics } from "@/lib/analytics";

const STORAGE_KEY = "aczen-cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  // Read stored choice only after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted") {
        // Consent was granted on a previous visit — load analytics now.
        loadGoogleAnalytics();
      } else if (!stored) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }

    // Allow the footer's "Cookie Preferences" link to re-open the banner.
    const reopen = () => setVisible(true);
    window.addEventListener("open-cookie-consent", reopen);
    return () => window.removeEventListener("open-cookie-consent", reopen);
  }, []);

  const decide = (choice: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
    if (choice === "accepted") {
      // Fire up Google Analytics only once the user has opted in.
      loadGoogleAnalytics();
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-x-3 bottom-3 z-[60] md:inset-x-auto md:left-6 md:bottom-6 md:max-w-md"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="relative rounded-2xl border border-purple-100 bg-white/95 backdrop-blur p-5 shadow-[0_18px_50px_-18px_rgba(88,60,180,0.4)]">
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => decide("declined")}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <Cookie className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">We value your privacy</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  We use cookies to improve your experience, analyse traffic and personalise
                  content. See our{" "}
                  <Link href="/cookies" className="text-purple-600 hover:underline">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="flex-1 rounded-lg bg-gradient-to-r from-smebank-700 to-smeteal-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => decide("declined")}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
