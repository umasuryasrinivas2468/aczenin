/*
  NovaShell — the app frame shared by the Nova developer portal and the Nova
  admin portal: fixed left sidebar on laptops, a top bar + slide-over sheet on
  phones and tablets, and an independently scrolling main column.

  WHY THIS FILE HAS NO "use client" (the contract said it would): a sections
  array holding lucide icon COMPONENTS cannot cross the server → client prop
  boundary — React throws "Functions cannot be passed directly to Client
  Components". Both portals build their nav in a Server Component layout, so a
  client NovaShell would break the moment either one passed an icon. Left
  directive-free, this module runs as a Server Component when a server layout
  renders it (icons become plain SVG before crossing), and as a Client
  Component when a client file imports it. Only the two pieces that truly need
  the browser — the active-link check and the sheet's open state — are client
  islands (NovaNavLink, NovaMobileNav). The exported types and props are
  exactly the agreed contract.
*/

// The icon type is part of the public nav contract.
import type { LucideIcon } from "lucide-react";
// Sign-out glyph, so the button reads at a glance in a dense footer.
import { LogOut } from "lucide-react";

// House button, so the sign-out control matches every other button in the app.
import { Button } from "@/components/ui/button";
// Client island: holds the sheet state below lg.
import NovaMobileNav from "./NovaMobileNav";
// Client island: reads usePathname to highlight the current page.
import NovaNavLink from "./NovaNavLink";

// One link in the sidebar. icon is optional so text-only doc links stay terse.
export type NovaNavItem = { href: string; label: string; icon?: LucideIcon };
// A titled group of links ("Workspace", "Documentation", …).
export type NovaNavSection = { title: string; items: NovaNavItem[] };

// Props exactly as agreed with the docs and admin agents.
type NovaShellProps = {
  // Shown next to the logo, e.g. "Nova API" or "Nova admin".
  product: string;
  // The whole nav, top to bottom.
  sections: NovaNavSection[];
  // Who is signed in; omitted by portals that have no per-user identity.
  userLabel?: string;
  // A Server Action; posted by a plain <form>, so sign-out works before hydration.
  signOutAction?: () => Promise<void>;
  // The page.
  children: React.ReactNode;
};

// Brand lock-up: the Aczen mark (public/icon.svg, the same mark the favicon
// and dashboard.aczen.in use) plus "Aczen / <product>", mirroring the
// "Aczen / API" breadcrumb-style wordmark on the product docs.
function NovaBrand({ product }: { product: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {/* A plain <img>: an 1 KB SVG gains nothing from next/image's pipeline,
          and the site Navbar already uses <img> for its logo. Decorative, since
          the adjacent text names the product. */}
      <img src="/icon.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md" />
      {/* truncate so a long product name never widens a 256px sidebar. */}
      <p className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-foreground">
        Aczen <span className="font-normal text-muted-foreground">/</span> {product}
      </p>
    </div>
  );
}

// The sidebar's full contents. Rendered twice — once in the fixed <aside>,
// once inside the mobile sheet — rather than moved between them, because only
// one is ever visible (CSS decides) and duplicating static markup is far
// simpler than portalling a single tree.
function SidebarBody({ product, sections, userLabel, signOutAction }: Omit<NovaShellProps, "children">) {
  // Every href in the nav, so each link can tell whether some other link sits
  // underneath it (see matchPrefix below).
  const allHrefs = sections.flatMap((section) => section.items.map((item) => item.href));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* --- Brand -------------------------------------------------------
          Same 56px height as the mobile top bar, so the two frames line up. */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <NovaBrand product={product} />
      </div>

      {/* --- Sections ----------------------------------------------------
          The only scrolling part of the sidebar, so brand and sign-out stay
          pinned even with 14+ links on a 768px-tall laptop. */}
      <nav aria-label={`${product} navigation`} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          // Section key is its title: titles are unique by construction.
          <div key={section.title} className="mb-4 last:mb-0">
            {/* Small mono uppercase label, matching the eyebrow labels on
                dashboard.aczen.in ("BASE URL", "WHAT YOU CAN REACH"). */}
            <p className="mb-1.5 px-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                // Prefix matching only for leaf links: "Introduction" at
                // /nova-api/docs must NOT light up on /nova-api/docs/errors,
                // but "Invoices" should stay lit on /nova-api/docs/invoices/…
                const matchPrefix = !allHrefs.some((other) => other !== item.href && other.startsWith(`${item.href}/`));
                // Rendered here, on whichever side this module runs, so only an
                // element (never the icon function) crosses into the client link.
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <NovaNavLink href={item.href} matchPrefix={matchPrefix}>
                      {/* Fixed-size slot even without an icon keeps labels aligned. */}
                      {Icon ? <Icon aria-hidden className="h-4 w-4 shrink-0" /> : <span aria-hidden className="w-4 shrink-0" />}
                      {/* truncate: long resource names never wrap the row height. */}
                      <span className="min-w-0 truncate">{item.label}</span>
                    </NovaNavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* --- Account -----------------------------------------------------
          One 52px row (email + icon button), not two stacked rows: on a
          1366×768 laptop the saved height is what lets all 15 links fit
          without the nav scrolling. Only rendered when there is something to show. */}
      {userLabel || signOutAction ? (
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-sidebar-border pl-5 pr-3">
          {/* truncate + title: the full email is still one hover away. */}
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={userLabel}>
            {userLabel}
          </p>
          {/* A form POST, not a link: sign-out changes state, so a prefetch
              must never be able to trigger it. */}
          {signOutAction ? (
            <form action={signOutAction}>
              {/* Icon-only, so aria-label and title carry the name. */}
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out" className="h-8 w-8 text-muted-foreground">
                <LogOut aria-hidden className="h-4 w-4" />
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function NovaShell({ product, sections, userLabel, signOutAction, children }: NovaShellProps): JSX.Element {
  // The sidebar is built once and handed to both frames.
  const sidebar = (
    <SidebarBody product={product} sections={sections} userLabel={userLabel} signOutAction={signOutAction} />
  );

  return (
    // h-dvh + overflow-hidden: the WINDOW never scrolls; the main column does.
    // That keeps the sidebar fixed without position:fixed maths, and dvh (not
    // vh) keeps the bottom visible under mobile browser toolbars.
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {/* Keyboard users skip 14+ nav links straight to the page. */}
      <a
        href="#nova-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      {/* --- Desktop sidebar (lg and up) -----------------------------------
          256px (w-64) fixed column; shrink-0 so a wide table in main can never
          squeeze it. */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">{sidebar}</aside>

      {/* --- Main column ---------------------------------------------------
          min-w-0 is what stops a wide child (the key table, a long curl line)
          from pushing this flex item — and so the page — wider than the
          viewport; those children scroll inside their own wrappers instead. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Below lg: top bar with the hamburger; the sheet reuses the sidebar. */}
        <NovaMobileNav brand={<NovaBrand product={product} />} product={product}>
          {sidebar}
        </NovaMobileNav>

        {/* The one scroll container. tabIndex -1 lets the skip link move focus here. */}
        <main id="nova-main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
          {/* max-w-5xl per the brief; padding steps up with width so 390px
              phones keep their content area and laptops get breathing room. */}
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
