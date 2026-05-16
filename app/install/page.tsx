import type { Metadata } from "next";
import Install from "@/views/Install";

export const metadata: Metadata = {
  title: "Install Aczen — One-line PowerShell installer (install.ps1)",
  description:
    "Step-by-step guide to install the Aczen app on Windows with a single PowerShell command. What install.ps1 does, prerequisites, manual setup, and troubleshooting.",
  keywords:
    "Aczen install, install.ps1, Aczen PowerShell installer, Aczen Windows setup, Aczen dev setup, irm iex",
  alternates: { canonical: "/install" },
  openGraph: {
    title: "Install Aczen — install.ps1 guide",
    description:
      "Install the Aczen app on Windows with one PowerShell command. Full guide with prerequisites and troubleshooting.",
    url: "/install",
  },
};

export default function Page() {
  return <Install />;
}
