"""
Markdown -> styled HTML -> PDF, for the Nova API reference.
Called by build.mjs:  python pdf.py <input.md> <output.pdf>

Why headless Edge/Chrome: both ship on this machine and print CSS exactly
(fonts, tables, page breaks), so no PDF library or new dependency is needed.
Needs the `markdown` package (pip install markdown) — already installed here.
"""

# argv for the two paths; subprocess drives the browser; tempfile holds the HTML.
import sys, subprocess, tempfile, pathlib, shutil

# Python-Markdown: tables + fenced code are the two extensions the doc uses.
import markdown

# Input .md and output .pdf, both absolute from build.mjs.
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])

# Tables for the reference, fenced_code for snippets, toc gives headings ids.
body = markdown.markdown(src.read_text(encoding="utf8"), extensions=["tables", "fenced_code", "toc"])

# Print stylesheet: Inter for text, JetBrains Mono for code, Aczen orange accents.
CSS = """
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
:root { --ink:#16181d; --muted:#5b6170; --line:#e4e6eb; --accent:#c2410c; --code:#f5f6f8; }
* { box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; color: var(--ink); font-size: 10.2pt; line-height: 1.55; }
h1 { font-size: 30pt; letter-spacing: -0.02em; margin: 0 0 6pt; padding-top: 40mm; }
h1 + p { color: var(--muted); border-bottom: 3px solid var(--accent); padding-bottom: 10pt; }
h2 { font-size: 17pt; letter-spacing: -0.01em; margin: 0 0 8pt; padding-bottom: 5pt; border-bottom: 1px solid var(--line); break-before: page; }
h3 { font-size: 12.5pt; margin: 20pt 0 6pt; color: var(--accent); break-after: avoid; }
p, li { margin: 0 0 6pt; }
a { color: var(--accent); text-decoration: none; }
code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 8.6pt; background: var(--code); padding: 1pt 3.5pt; border-radius: 3pt; word-break: break-word; }
pre { background: #111318; color: #e8eaef; padding: 10pt 12pt; border-radius: 6pt; font-size: 8.3pt; line-height: 1.5; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 8.8pt; break-inside: auto; }
th { text-align: left; background: #fafafa; font-weight: 600; }
th, td { border: 1px solid var(--line); padding: 4pt 6pt; vertical-align: top; }
tr { break-inside: avoid; }
blockquote { margin: 8pt 0; padding: 8pt 12pt; border-left: 3px solid var(--accent); background: #fff7ed; }
blockquote p { margin: 0; }
hr { display: none; }
"""

# Full HTML document; Google Fonts load over the network, with system fallbacks if offline.
html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Nova API Reference</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap">
<style>{CSS}</style></head><body>{body}</body></html>"""

# Temp HTML in the OS temp dir, never the repo.
with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf8") as f:
    # Written then closed so the browser can open it.
    f.write(html)

# First browser found wins; both print identically (same engine).
CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    shutil.which("chromium") or "",
]
# Fail loudly if neither exists, rather than writing no PDF silently.
browser = next((b for b in CANDIDATES if b and pathlib.Path(b).exists()), None)
if browser is None:
    sys.exit("pdf.py: no Edge/Chrome found to print the PDF")

# Headless print; virtual-time budget gives the web fonts time to load before printing.
subprocess.run(
    [browser, "--headless", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
     f"--print-to-pdf={out}", pathlib.Path(f.name).as_uri()],
    check=True, capture_output=True,
)
# Remove the temp HTML now the PDF exists.
pathlib.Path(f.name).unlink()
# Size in the log, so an empty PDF is obvious.
print(f"wrote {out.name} - {out.stat().st_size // 1024} KB")
