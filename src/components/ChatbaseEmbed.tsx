"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/*
  The Chatbase support widget ("Ania from Aczen"), lifted out of app/layout.tsx
  so it can be suppressed per route.

  Hiding the bubble with CSS would have been shorter, but the widget would still
  download and run — and on a campaign page whose whole job is a single call to
  action, a second floating button competing for the same corner is worse than
  the bytes. Returning null means the third-party script is never requested on a
  direct load of an excluded route.

  That alone is not enough, though. If someone arrives at an excluded route by
  clicking a link from elsewhere on the site, the widget has already booted: its
  own script appended the bubble straight to document.body, outside React's
  tree. Unmounting this component removes the <Script> node and nothing else —
  React has no record of DOM a third party created imperatively. So the second
  half of the job is an explicit teardown.
*/

// Routes that opt out. Kept as a list so adding another campaign page later is
// one string, and so the reason is visible at the top of the file.
const HIDDEN_ON: string[] = [
  // The Finathon campaign page is a single-call-to-action page; a second
  // floating button competing for the same corner works against it.
  "/finathon",
];

// Compared case-insensitively: the canonical route is "/Finathon", and a
// case-sensitive list would silently stop matching if that spelling ever
// changed again.
const isHidden = (pathname: string | null) =>
  Boolean(pathname) && HIDDEN_ON.includes(pathname!.toLowerCase());

/* The ids Chatbase gives its own injected nodes, confirmed by inspecting the
   live page rather than taken from documentation. */
const WIDGET_SELECTOR =
  "#chatbase-bubble-button, #chatbase-message-bubbles, #chatbase-bubble-window";

export default function ChatbaseEmbed() {
  const pathname = usePathname();
  const hidden = isHidden(pathname);

  useEffect(() => {
    if (!hidden) return;

    // A stylesheet rather than setting style.display on the nodes directly:
    // the widget loads asynchronously and may not have injected anything yet,
    // and a rule in the document applies to elements that appear later too.
    // Removing the rule on cleanup restores the widget when navigating away.
    const style = document.createElement("style");
    style.setAttribute("data-chatbase-suppressed", "");
    style.textContent = `${WIDGET_SELECTOR} { display: none !important; }`;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [hidden]);

  if (hidden) {
    return null;
  }

  return (
    <Script id="chatbase-embed" strategy="afterInteractive">
      {`(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="YREz_QoD10_nSG2H8WN6Y";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();`}
    </Script>
  );
}
