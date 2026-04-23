import type { Metadata } from "next";
import AczenIDE from "@/views/products/AczenIDE";

export const metadata: Metadata = {
  title: "Aczen IDE — Integrated Development Environment for Modern Teams",
  description:
    "Aczen IDE is a cloud-native IDE with AI code completion, debugging, version control and real-time collaboration.",
  keywords:
    "Aczen IDE, online IDE, AI code editor, cloud IDE, Aczen developer tools, collaborative coding",
  alternates: { canonical: "/products/aczen-ide" },
  openGraph: {
    title: "Aczen IDE — Integrated Development Environment for Modern Teams",
    description:
      "Aczen IDE is a cloud-native IDE with AI code completion, debugging, version control and real-time collaboration.",
    url: "/products/aczen-ide",
  },
};

export default function Page() {
  return <AczenIDE />;
}
