# Design direction backups

Active: **Bold neo-brutalist** (implemented). Palette unchanged, content/pages unchanged.
All directions swap the SAME leverage points — no page files touched:

- `app/globals.css` → tokens (`--radius`, shadows) + custom utility classes
  (`.shadow-soft`, `.feature-card`, `.glass`, `.premium-card`, `.btn-primary`,
  `.btn-ghost`, `.cta-button*`, `.section-title`, `.display`, `.eyebrow`,
  `.mesh-bg`, `.grid-texture`, `.brand-glow`)
- `src/components/ui/button.tsx` → `buttonVariants` base + variants
- `src/components/ui/card.tsx` → root `Card` className
- `src/components/Navbar.tsx` → header bar + CTA buttons (5 spots)

To switch: revert those files to soft baseline, then apply one plan below.

---

## Plan A — Editorial minimal
Calm magazine feel. Thin hairline borders, no shadows, whitespace, serif display.

- `--radius: 0.25rem`; `--border: 220 14% 88%` (hairline).
- `.shadow-soft` / `.shadow-soft-lg` → `box-shadow: none` (rely on borders + space).
- `.feature-card` / `.premium-card` → `p-8 border border-slate-200 bg-white` (no shadow, no lift; hover `border-slate-400` only).
- `.glass` → `bg-white border border-slate-200` (no blur, no shadow).
- `.display` → serif: `font-family: Georgia, 'Times New Roman', serif; font-weight:600; letter-spacing:-0.01em; line-height:1.1`. (Or add a serif via next/font.)
- `.section-title` → larger, lighter: `text-4xl md:text-5xl font-semibold`.
- `.eyebrow` → no box: `text-xs uppercase tracking-[0.25em] text-slate-500` (no border/bg).
- `.btn-primary` → `bg-slate-900 text-white px-6 py-3 font-medium normal-case` (no shadow, subtle `hover:bg-slate-700`).
- `.btn-ghost` → `border border-slate-300 bg-transparent text-slate-900`.
- `.mesh-bg` → remove blobs; flat `hsl(var(--background))`. Use `<hr class="border-slate-200">` rules between sections.
- Button component: `rounded-sm`, `font-medium`, no border/shadow, `bg-primary hover:bg-primary/90`.
- Card component: `rounded-sm border border-slate-200` (drop shadow).
- Navbar: `bg-white/90 backdrop-blur border-b border-slate-200`; buttons `font-medium normal-case`, no hard shadow.
- REMOVE the global `rounded-* { border-radius:0 }` override (editorial keeps gentle radius).

## Plan B — Dark glass / futuristic
Dark surfaces, neon blue/teal glows, heavy glass, gradient borders.

- Flip base tokens to dark: `--background: 222 47% 6%`, `--foreground: 210 40% 98%`,
  `--card: 222 40% 9%`, `--muted: 217 33% 14%`, `--muted-foreground: 215 20% 65%`,
  `--border: 217 33% 20%`. `--radius: 0.75rem`.
- Body base already `bg-background text-foreground` → whole site goes dark automatically.
- `.shadow-soft` → `box-shadow: 0 0 0 1px rgba(255,255,255,.05), 0 20px 60px -20px rgba(9,103,227,.45)`.
- `.shadow-soft-lg` → stronger teal glow `0 30px 90px -25px rgba(0,208,192,.5)`.
- `.glass` → `background: rgba(255,255,255,.04); backdrop-filter: blur(24px) saturate(160%); border:1px solid rgba(255,255,255,.10)`.
- `.feature-card` / `.premium-card` → use `.glass` + neon hover ring `hover:border-smeteal-500/50`.
- Gradient border helper: wrap in `bg-gradient-to-r from-smebank-500 to-smeteal-500 p-px` → inner `bg-card`.
- `.text-gradient` keep. `.mesh-bg` → dark: `radial-gradient(...rgba(9,103,227,.25))` + teal, over dark bg.
- `.btn-primary` → `bg-gradient-to-r from-smebank-600 to-smeteal-500` + glow shadow; `.btn-ghost` → glass.
- `.eyebrow` → `text-smeteal-400`, no box.
- Button component default → `bg-gradient-to-r from-smebank-600 to-smeteal-500 text-white` glow, `rounded-lg`.
- Card component → `rounded-xl` glass surface.
- Navbar → `bg-slate-950/70 backdrop-blur-xl border-b border-white/10`; text light.
- Watch: text color on light-hardcoded sections (`text-slate-900`, `bg-white`) — grep and flip to light/`bg-card`. Bigger sweep than A/active.
- REMOVE the global `rounded-* { border-radius:0 }` override.

## Plan C — Elevated soft 3D
Rounder, layered pastel cards, big gradient blobs, floating depth.

- `--radius: 1.25rem`. Keep light tokens; `--border: 220 20% 92%`.
- `.shadow-soft` → layered soft: `0 2px 4px rgba(15,40,70,.04), 0 18px 40px -12px rgba(9,103,227,.18)`.
- `.shadow-soft-lg` → `0 8px 16px rgba(15,40,70,.06), 0 50px 90px -30px rgba(9,103,227,.28)`.
- `.feature-card` / `.premium-card` → `rounded-3xl p-7 bg-white/80 backdrop-blur border border-white shadow-soft hover:-translate-y-2 hover:shadow-soft-lg`.
- `.glass` → keep the original glassmorphism (soft baseline).
- `.mesh-bg` → bigger, more saturated blobs (`0.16` alpha), add a 3rd smeorange blob.
- `.btn-primary` → `rounded-full bg-gradient-to-r from-smebank-600 to-smeteal-500 shadow-soft brand-glow hover:-translate-y-1`.
- `.btn-ghost` → `rounded-full bg-white/70 backdrop-blur border border-black/[0.06]`.
- `.eyebrow` → pill: `rounded-full bg-smeteal-50 px-3 py-1 text-smeteal-700` (no hard border).
- `.brand-glow` → colored glow (original).
- Button component → `rounded-full`, gradient default, soft shadow.
- Card component → `rounded-3xl shadow-soft` (no hard border).
- Navbar → `bg-white/70 backdrop-blur-xl rounded-b-3xl border-b border-black/[0.06]`.
- Add floating accent blobs via `.mesh-bg` on more sections.
- REMOVE the global `rounded-* { border-radius:0 }` override.
