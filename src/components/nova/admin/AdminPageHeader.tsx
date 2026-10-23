/*
  The heading block at the top of each admin route.

  Shared by Overview, Allowlist and API keys so the three pages open with the
  same title size and spacing; the panels below then drop their own card
  titles instead of repeating the page name. Server-safe: no state, no hooks.
*/

export default function AdminPageHeader({ title, description }: { title: string; description: string }) {
  return (
    // One h1 per route, so each page has its own landmark heading for screen readers.
    <header className="mb-6 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {/* Muted: context for the page, not a call to action. */}
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  );
}
