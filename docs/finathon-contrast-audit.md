# Finathon colour contrast audit — WCAG 2.2

**Date:** 2026-09-22
**Scope:** every colour token in `app/Finathon/finathon.css` and every hardcoded
hex in `src/components/finathon/*.tsx`, evaluated on the foreground/background
pairs that actually occur in the rendered markup.
**Status:** report only. The CSS is owned by another worker; nothing in this
document has been applied.

---

## Method

Ratios were computed, not estimated and not taken from the CSS comments.

Relative luminance per WCAG 2.x: each sRGB channel is normalised to 0–1, then
linearised as `c/12.92` where `c <= 0.04045` and `((c+0.055)/1.055)^2.4`
otherwise, then weighted `0.2126 R + 0.7152 G + 0.0722 B`. Contrast is
`(L_lighter + 0.05) / (L_darker + 0.05)`.

The implementation was self-tested against values published in WCAG's own
*Understanding* documents before being trusted:

| Check | Expected | Computed |
|---|---|---|
| `#767676` on `#ffffff` | 4.54:1 | **4.54:1** |
| `#000000` on `#ffffff` | 21:1 | **21.00:1** |

Thresholds applied:

- **4.5:1** — body text below 24px / below 18.66px bold (WCAG 1.4.3 AA).
- **3:1** — large text, and non-text UI boundaries that are the only thing
  identifying a control or its state (WCAG 1.4.11).
- Disabled and inactive controls are **exempt** from both (1.4.3 and 1.4.11
  both carve them out). That exemption is load-bearing once below.

---

## Token inventory

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#f7f8f5` | page background |
| `--band` | `#edf0ea` | alternating ledger row background (`Timeline.tsx:55`) |
| `--accent-wash` | `#e6eefb` | benefit-card background (`src/views/Finathon.tsx:553`) |
| `--ink` | `#0b1f33` | body text on light; background of `.fin-card`, `.fin-cta`, sticky bar |
| `--ink-soft` | `#51606e` | secondary text |
| `--ink-faint` | `#5a6874` | labels, timestamps, field hints |
| `--ink-on-dark` | `#a8b4bf` | secondary text on `--ink` |
| `--rule` | `#c9d1c9` | hairline dividers |
| `--rule-strong` | `#0b1f33` | structural rules, input underlines |
| `--accent-ink` | `#0552c7` | accent text on light |
| `--accent-fill` | `#0967e3` | primary button fill; also `--focus` |
| `--accent-on-dark` | `#6aa8ff` | accent text on `--ink` |
| `#b3261e` | hardcoded ×2 | error text **and** invalid input border (`RegistrationForm.tsx:251, 337`) |
| `#fff` | hardcoded ×1 | sticky-bar button label (`StickyRegisterBar.tsx:68`) |

---

## Every occurring pair

| Foreground | Background | Role | Ratio | Floor | Verdict |
|---|---|---|---|---|---|
| `--ink` `#0b1f33` | `--paper` | text | 15.66:1 | 4.5 | PASS |
| `--ink` `#0b1f33` | `--band` | text | 14.51:1 | 4.5 | PASS |
| `--ink` `#0b1f33` | `--accent-wash` | text | 14.30:1 | 4.5 | PASS |
| `--ink-soft` `#51606e` | `--paper` | text | 6.07:1 | 4.5 | PASS |
| `--ink-soft` `#51606e` | `--band` | text | 5.62:1 | 4.5 | PASS |
| `--ink-soft` `#51606e` | `--accent-wash` | text | 5.54:1 | 4.5 | PASS |
| `--ink-faint` `#5a6874` | `--paper` | text | **5.37:1** | 4.5 | PASS |
| `--ink-faint` `#5a6874` | `--band` | text | **4.98:1** | 4.5 | PASS |
| `--accent-ink` `#0552c7` | `--paper` | text | 6.48:1 | 4.5 | PASS |
| `--accent-ink` `#0552c7` | `--band` | text | 6.01:1 | 4.5 | PASS |
| `--accent-ink` `#0552c7` | `--accent-wash` | text | 5.92:1 | 4.5 | PASS |
| `--paper` `#f7f8f5` | `--ink` (card, CTA) | text | 15.66:1 | 4.5 | PASS |
| `--ink-on-dark` `#a8b4bf` | `--ink` | text | 7.91:1 | 4.5 | PASS |
| `--accent-on-dark` `#6aa8ff` | `--ink` | text | 6.88:1 | 4.5 | PASS |
| `#fff` | `--accent-fill` `#0967e3` | text | 5.17:1 | 4.5 | PASS |
| `--paper` | `--accent-fill` (`.fin-cta:hover`) | text | 4.85:1 | 4.5 | PASS |
| `--rule-strong` `#0b1f33` | `--paper` | input underline | 15.66:1 | 3 | PASS |
| `--accent-fill` `#0967e3` | `--paper` | button edge | 4.85:1 | 3 | PASS |
| `--focus` `#0967e3` | `--paper` | focus ring | 4.85:1 | 3 | PASS |
| `--focus` `#0967e3` | `--ink` (dark card) | focus ring | **3.23:1** | 3 | PASS, thin |
| `--rule` `#c9d1c9` | `--paper` | hairline | **1.47:1** | 3 | see §3 |
| `--rule` `#c9d1c9` | `--band` | hairline | **1.36:1** | 3 | see §3 |
| `#b3261e` | `--paper` | error text | **6.13:1** | 4.5 | PASS |
| `#b3261e` | `--band` | error text | **5.68:1** | 4.5 | PASS |
| `#b3261e` | `--paper` | invalid input border | **6.13:1** | 3 | PASS |
| `#b3261e` | `--band` | invalid input border | **5.68:1** | 3 | PASS |

**No pair carrying text fails.** The two findings below are about a comment that
is wrong and a token that is exempt rather than compliant.

---

## 1. The asserted ratios in `finathon.css` — verified

The file annotates several tokens with a measured ratio. Each was recomputed.

| Asserted in CSS | Line | Claim | Computed | Verdict |
|---|---|---|---|---|
| `--ink-faint` on `--band` | 26 | 4.95:1 | **4.98:1** | Right (+0.03) |
| `--ink-faint` on `--paper` | 26 | 5.34:1 | **5.37:1** | Right (+0.03) |
| `--ink-on-dark` on `--ink` | 30 | 7.8:1 | **7.91:1** | Right |
| `--accent-ink` on `--paper` | 40 | 6.4:1 | **6.48:1** | Right |
| `#fff` on `--accent-fill` | 43 | 5.1:1 | **5.17:1** | Right |
| `--accent-on-dark` on `--ink` | 47 | 6.8:1 | **6.88:1** | Right |
| **rejected** `#8794a0` on `--band` | 22 | 2.91:1 | **2.69:1** | **Wrong** |
| **rejected** `#64727f` on `--band` | 22 | 3.38:1 | **4.29:1** | **Wrong, by 27%** |

**The instruction survives; two of its supporting numbers do not.**

`--ink-faint: #5a6874` is correct and the "do not lighten" instruction is
right — 4.98:1 on the band leaves only 0.48 of headroom above the 4.5:1 floor,
so any lightening at all fails. Keep it.

But the two numbers quoted for the *rejected* candidates are both wrong, and one
is badly wrong. `#64727f` is claimed at 3.38:1 and actually measures **4.29:1** —
still a fail, so the conclusion holds, but the comment overstates how bad it was
by 27%. `#8794a0` is claimed at 2.91:1 and measures **2.69:1**, i.e. worse than
recorded.

Two errors in opposite directions rule out a systematic cause such as a
different rounding rule or a different background; they read as values typed
from memory rather than copied from a tool. The practical consequence: the
*rationale* in that comment cannot be used as evidence for a future decision,
even though the *decision* it defends is correct. Anyone re-opening this should
recompute rather than reason from the recorded figures.

---

## 2. `#b3261e` — the hardcoded error red (specifically requested)

Used in two different roles from two different call sites:

- `RegistrationForm.tsx:251` — `style={{ color: "#b3261e" }}` on the
  `role="alert"` paragraph. **Text**, so the floor is 4.5:1.
- `RegistrationForm.tsx:337` — `borderColor: invalid ? "#b3261e" : ...` on the
  input underline. A **non-text UI boundary** conveying validation state, so the
  floor is 3:1.

| Role | Background | Ratio | Floor | Verdict |
|---|---|---|---|---|
| Error text | `--paper` `#f7f8f5` | **6.13:1** | 4.5:1 | **PASS**, 1.63 of headroom |
| Error text | `--band` `#edf0ea` | **5.68:1** | 4.5:1 | **PASS**, 1.18 of headroom |
| Input border | `--paper` | **6.13:1** | 3:1 | **PASS**, comfortably |
| Input border | `--band` | **5.68:1** | 3:1 | **PASS**, comfortably |

**No change required. The colour is fine in both roles on both surfaces.**

Three things are worth recording anyway, because the colour passing is not the
same as the code being right:

1. **It should be a token, not a literal.** The same hex is typed twice in one
   file, and the two occurrences are the *only* colours in the Finathon subtree
   that do not come from `finathon.css`. Proposed: `--error-ink: #b3261e` in the
   `.fin` block, with both call sites reading `var(--error-ink)`. This is a
   naming/ownership point, not a contrast one — but it is the reason the value
   was invisible to review until now.

2. **It would fail on the dark panel, and nothing currently stops it going
   there.** `#b3261e` on `--ink` `#0b1f33` measures **2.55:1** — a fail against
   both the 4.5:1 text floor and the 3:1 boundary floor. No error text renders
   on `.fin-card` or the sticky bar today, so this is latent, not live. If a
   `--error-ink` token is introduced it needs a dark-panel sibling the way
   `--ink`/`--ink-on-dark` and `--accent-ink`/`--accent-on-dark` already do.
   Computed candidate: **`--error-on-dark: #ff8a80` → 7.31:1 on `--ink`.**

3. **Colour is not the only signal, which is correct.** `RegistrationForm.tsx`
   already sets `aria-invalid` alongside the border colour and puts the error
   text in a `role="alert"` region, so WCAG 1.4.1 (use of colour) is satisfied.
   Worth stating explicitly so nobody "fixes" it by removing the redundancy.

---

## 3. `--rule: #c9d1c9` — 1.47:1, and why that is not a failure

The lowest ratio anywhere in the palette: **1.47:1 on `--paper`, 1.36:1 on
`--band`**. It is nonetheless not a 1.4.11 violation, and the reasoning is worth
writing down because a scanner will flag it and someone will be tempted to
darken it.

1.4.11 applies to visual boundaries **required to identify a control or its
state**. Every use of `--rule` is decorative structure:

- `.fin-row` / `.fin-statgrid` / `Timeline.tsx:51` — dividers between static
  content. No control involved.
- `src/views/Finathon.tsx:545, 561` — the background behind a `gap-px` grid, so
  the colour shows only through 1px seams.
- `.fin-cta[aria-disabled="true"]` — a control border, **but a disabled one**,
  and 1.4.11 explicitly exempts inactive components. (Its label,
  `--ink-soft` on `--paper`, is 6.07:1 regardless.)

**Recommendation: leave it.** Darkening `--rule` to reach 3:1 would need roughly
`#8f998f` or darker, which still only reaches 2.77:1 on paper — the target is
genuinely unreachable for a hairline on near-white without abandoning the
hairline. The whole layout is built from these rules; making them dark enough to
"pass" a rule that does not apply would turn a ruled document into a grid of
boxes and lose the design.

What *should* be checked instead: no interactive control may ever be identified
by a `--rule` border alone while enabled. Currently none is.

---

## 4. Focus ring on the dark card — passes, with no margin

`--focus: #0967e3` against `--ink` `#0b1f33` is **3.23:1**, against a 3:1 floor.
It passes. It also has 0.23 of headroom, on the one element type where a
keyboard user has no alternative signal.

`.fin a:focus-visible` is written once, globally, for the whole `.fin` subtree,
so it applies inside `.fin-card` — and there are two dark cards, one holding the
deadline in the hero and one closing the page.

**Proposed fix (one rule, no token change):**

```css
/* The focus ring lifts on dark panels for the same reason --accent-ink lifts
   to --accent-on-dark: an ink-weight blue on navy is 3.23:1, which passes
   1.4.11 by 0.23 on the one signal a keyboard user cannot do without. */
.fin-card a:focus-visible,
.fin-card button:focus-visible,
.fin-card [tabindex]:focus-visible {
  outline-color: var(--accent-on-dark); /* #6aa8ff — 6.88:1 on --ink */
}
```

Computed: `#6aa8ff` on `#0b1f33` = **6.88:1**. The token already exists and is
already used for accent text on dark, so this introduces no new colour.

---

## 5. `.fin-cta:hover` — noted, no action

`.fin-cta` keeps `color: var(--paper)` and swaps its background to
`--accent-fill` on hover, giving **4.85:1** — a pass, but 0.32 below the 5.17:1
that the sticky bar gets from using `#fff` on the same fill. Two buttons with
the same blue and slightly different label contrast. Not worth a change on its
own; worth knowing if the blue is ever darkened, because the hover state will
cross 4.5:1 before the resting state does.

---

## Summary

| # | Finding | Severity | Owner action |
|---|---|---|---|
| 1 | Two ratios asserted in `finathon.css:22` are wrong (`#64727f` 3.38 → **4.29**, `#8794a0` 2.91 → **2.69**); conclusions still hold | Low, but the comment is now untrustworthy as evidence | Correct the two numbers in the comment |
| 2 | `#b3261e` **passes** both roles on both surfaces (6.13:1 / 5.68:1) | None | No colour change; consider promoting to `--error-ink` |
| 3 | `#b3261e` is 2.55:1 on `--ink` — latent, nothing renders there yet | Latent | Add `--error-on-dark: #ff8a80` (7.31:1) if/when a token lands |
| 4 | Focus ring is 3.23:1 on dark cards | Low, keyboard-only | Scope `outline-color: var(--accent-on-dark)` inside `.fin-card` |
| 5 | `--rule` is 1.47:1 | None — 1.4.11 exempt | Leave; do not darken |
| 6 | `--ink-faint` has 0.48 of headroom on `--band` | Informational | The existing "do not lighten" instruction is correct — keep it |

No text/background pair in the Finathon subtree fails WCAG 2.2 AA today.
