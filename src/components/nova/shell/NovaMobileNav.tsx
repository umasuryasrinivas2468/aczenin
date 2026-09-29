"use client";

/*
  The below-lg frame: a 56px top bar with a hamburger that opens the sidebar
  as a left-hand sheet. A client island only for the sheet's open state.
*/

// Open/close state for the sheet.
import { useState, type MouseEvent } from "react";
// Hamburger glyph.
import { Menu } from "lucide-react";

// House primitives: Radix dialog under the hood gives focus trapping, Esc to
// close and scroll locking for free.
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NovaMobileNavProps = {
  // The logo lock-up for the top bar.
  brand: React.ReactNode;
  // Names the sheet for screen readers.
  product: string;
  // The same sidebar the desktop <aside> shows.
  children: React.ReactNode;
};

export default function NovaMobileNav({ brand, product, children }: NovaMobileNavProps) {
  // Controlled so a link click can close the sheet.
  const [open, setOpen] = useState(false);

  // Closes on ANY link click inside the sheet (event delegation), including a
  // click on the page already open, where a pathname-change effect would
  // never fire and the sheet would just sit there.
  function closeOnLinkClick(event: MouseEvent<HTMLDivElement>) {
    // closest() also catches clicks on the icon or label inside the <a>.
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  }

  return (
    // lg:hidden: the fixed <aside> takes over from 1024px.
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {/* 40px target: comfortably above the 24px minimum for touch. */}
          <Button type="button" variant="ghost" size="icon" aria-label="Open navigation">
            <Menu aria-hidden className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        {/* w-64 matches the desktop sidebar; p-0 because the sidebar brings
            its own padding; bg-sidebar so both frames look identical. */}
        {/* aria-describedby={undefined}: the sheet is pure navigation with a
            title and no descriptive text, and this tells Radix so rather than
            letting it warn "Missing Description" on every open. */}
        <SheetContent side="left" aria-describedby={undefined} className="w-64 bg-sidebar p-0 sm:max-w-none">
          {/* Radix requires a title for the dialog's accessible name. */}
          <SheetTitle className="sr-only">{product} navigation</SheetTitle>
          <div className="h-full" onClick={closeOnLinkClick}>
            {children}
          </div>
        </SheetContent>
      </Sheet>
      {brand}
    </header>
  );
}
