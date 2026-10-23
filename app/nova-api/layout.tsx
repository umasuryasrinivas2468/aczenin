/*
  Layout for everything under /nova-api: the sign-in screen, the developer
  portal in (portal)/, AND the admin portal at /nova-api/axe (built separately).

  WHERE THE SITE CHROME CAME FROM: app/layout.tsx renders no Navbar or Footer —
  the old Nova pages imported them per page, and those imports are gone. What
  the root layout DOES render on every route is <ChatbaseEmbed />, the floating
  support bubble. Its opt-out list lives in src/components/ChatbaseEmbed.tsx,
  which is shared and not owned here, so this layout hides the widget with a
  stylesheet instead (see below).

  No robots rule here: the sign-in page is indexable; the portal and admin
  pages set noindex themselves.
*/

// Metadata type for the title template.
import type { Metadata } from "next";

// Titles read "API keys | Nova API" inside this section; the root template
// ("%s | Aczen") still applies to this default.
export const metadata: Metadata = {
  title: { default: "Nova API", template: "%s | Nova API" },
};

// No Chatbase handling here: "/nova-api" is in ChatbaseEmbed's HIDDEN_ON list,
// which skips loading the widget script on this whole subtree.
export default function NovaApiLayout({ children }: { children: React.ReactNode }) {
  // A pass-through layout: it exists for the title template above.
  return <>{children}</>;
}
