/*
  Renders every Finathon confirmation-email design with sample data, so they can
  be compared before choosing one for FINATHON_MAIL_TEMPLATE.

    node scripts/preview-finathon-mail.mjs [outDir]

  Writes one <name>.html per design into outDir (default: .mail-preview/).
  Needs Node 22.18+ for built-in TypeScript type stripping.
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { MAIL_TEMPLATE_NAMES, renderMailHtml } from "../src/lib/finathon/mailTemplates.ts";

// Sample team, plainly fictional.
const SAMPLE = {
  teamName: "Ledger Lions",
  publicId: "3f6c2a91-8b4e-4d17-a0c5-9e21b7d4f803",
  amount: "₹499",
  utr: "426791358024",
  lead: { fullName: "Aarav Sharma", rollNumber: "23R21A6601", college: "MLR Institute of Technology" },
  members: [
    { fullName: "Priya Reddy", rollNumber: "23R21A6614", college: "MLR Institute of Technology" },
    { fullName: "Kiran Rao", rollNumber: "23R21A6632", college: "MLR Institute of Technology" },
    { fullName: "Sneha Varma", rollNumber: "23R21A6647", college: "MLR Institute of Technology" },
  ],
};

const outDir = process.argv[2] ?? ".mail-preview";
mkdirSync(outDir, { recursive: true });

for (const name of MAIL_TEMPLATE_NAMES) {
  const file = join(outDir, `${name}.html`);
  writeFileSync(file, renderMailHtml(name, SAMPLE));
  console.log(`wrote ${file}`);
}
