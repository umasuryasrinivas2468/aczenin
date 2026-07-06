// Google Analytics (gtag.js) loader — only invoked AFTER the user grants
// cookie consent. See src/components/CookieConsent.tsx.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let loaded = false;

/**
 * Inject the gtag.js script and initialise Google Analytics.
 * Safe to call multiple times — it only loads once.
 * No-ops when running server-side or when no measurement ID is configured.
 */
export function loadGoogleAnalytics(): void {
  if (typeof window === "undefined" || loaded) return;

  const id = GA_MEASUREMENT_ID;
  if (!id) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[analytics] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set — Google Analytics was not loaded."
      );
    }
    return;
  }

  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag pushes the raw `arguments` object, per Google's snippet.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
}
