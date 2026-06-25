import type { Metadata } from "next";
import SecurityCaseReport from "@/views/SecurityCaseReport";

export const metadata: Metadata = {
  title: "Case ACZ-SEC-2026-0625-48192 — Security & Trust Investigation | Aczen",
  description:
    "Public disclosure of Aczen Technologies security investigation case ACZ-SEC-2026-0625-48192: identity attribution and deployment authorization anomaly.",
  alternates: { canonical: "/secuirty/case/ACZ-SEC-2026-0625-48192/india/public" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Case ACZ-SEC-2026-0625-48192 — Security & Trust Investigation",
    description:
      "Identity attribution and deployment authorization anomaly investigation — public disclosure.",
    url: "/secuirty/case/ACZ-SEC-2026-0625-48192/india/public",
  },
};

export default function Page() {
  return <SecurityCaseReport />;
}
