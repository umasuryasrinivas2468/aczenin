/*
  Layout for everything under /nova-api: the public docs, the developer
  dashboard, AND the admin portal at /nova-api/axe (built separately).

  Deliberately neutral. The site Navbar/Footer are rendered per page in this
  repo (app/layout.tsx renders neither), and the admin portal must not inherit
  public marketing chrome — so chrome lives in each page, not here. Likewise
  no robots rule: the docs page must be indexable, and the dashboard and
  admin set noindex themselves.
*/

// Metadata type for the title template.
import type { Metadata } from "next";

// Titles read "Dashboard | Nova API" inside this section; the root template
// ("%s | Aczen") still applies to this default.
export const metadata: Metadata = {
  title: { default: "Nova API", template: "%s | Nova API" },
};

// A pass-through: exists only to carry the metadata above.
export default function NovaApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
