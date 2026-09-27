import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StudioErrorScreen, { ERROR_COPY } from "@/components/ai-studio/StudioErrorScreen";

/*
  Addressable error pages (/ai-studio/errors/401 … /503) for redirects and for
  linking from API error documentation. Unknown codes are a plain 404.
*/

export const metadata: Metadata = { title: "Error" };

export default async function ErrorCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!Object.prototype.hasOwnProperty.call(ERROR_COPY, code)) notFound();
  return <StudioErrorScreen code={code} />;
}
