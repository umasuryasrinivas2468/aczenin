/*
  The chart palette for /axe, as CSS custom properties on one scoped class.

  WHY CUSTOM PROPERTIES RATHER THAN HEX IN EACH CHART:
  every chart below references a ROLE (--axe-series-1) instead of a colour, so
  light and dark swap in this one file and a chart cannot end up half-themed.
  Recharts passes fill/stroke straight through to SVG attributes, and SVG
  honours var(), so this works without any JavaScript theme plumbing.

  WHY THESE SPECIFIC HEXES:
  they are the validated reference palette, not a hand-picked set. Run against
  the project's actual card surfaces:

    light (#ffffff): lightness band PASS, chroma floor PASS,
                     worst adjacent CVD deltaE 9.1 PASS, normal-vision 22.9 PASS,
                     contrast WARN on aqua (2.82) and yellow (2.17)
    dark  (#020817): all five checks PASS

  The light-mode contrast WARN is not dismissable — it obliges visible relief.
  That is why every categorical chart in this dashboard carries a direct value
  label beside each bar, and why top pages additionally ships a table view.
  Identity is never carried by colour alone here.
*/

export default function AxeVizTheme() {
  return (
    <style>{`
      /*
        Light mode. Slots are assigned in FIXED ORDER and never cycled: a chart
        with fewer series simply uses fewer slots, so filtering a series out can
        never repaint the ones that remain.
      */
      .axe-viz {
        --axe-series-1: #2a78d6;  /* blue   — primary series (pageviews) */
        --axe-series-2: #eb6834;  /* orange — secondary series (unique visitors) */
        --axe-series-3: #1baf7a;  /* aqua   — third categorical slot */
        --axe-series-4: #eda100;  /* yellow — fourth categorical slot */
        /* Single hue for MAGNITUDE charts (top pages, referrers, cities), where
           every bar is the same kind of thing and colour carries no identity.
           Using categorical hues there would imply a distinction that does not
           exist. */
        --axe-magnitude: #2a78d6;
        /* Recessive grid and axis ink, deliberately far weaker than the marks:
           the data should be the only thing with visual weight. */
        --axe-grid: #e6e8eb;
        --axe-axis: #6b7280;
      }

      /*
        Dark mode. These are the SAME EIGHT HUES re-stepped for a dark surface,
        not an automatic inversion — an inverted light palette lands outside the
        dark lightness band and loses contrast against the card.
        The .dark class is what this project's Tailwind config toggles on.
      */
      .dark .axe-viz {
        --axe-series-1: #3987e5;
        --axe-series-2: #d95926;
        --axe-series-3: #199e70;
        --axe-series-4: #c98500;
        --axe-magnitude: #3987e5;
        --axe-grid: #1e293b;
        --axe-axis: #94a3b8;
      }
    `}</style>
  );
}
