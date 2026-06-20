import { NextResponse, type NextRequest } from "next/server";
import { fetchDueRows, markRow, type SheetRow } from "@/lib/cron/sheets";
import { generateCoverImage, generateStructuredPost } from "@/lib/cron/gemini";
import { sectionsToBlocks } from "@/lib/cron/portableText";
import {
  createPost,
  uniqueSlug,
  uploadImageFromBuffer,
  uploadImageFromUrl,
} from "@/lib/cron/sanityWrite";
import { isSanityConfigured } from "@/lib/sanity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RowResult =
  | { row: number; title: string; status: "published"; sanityId: string }
  | { row: number; title: string; status: "error"; error: string };

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${expected}`) return true;
  return req.nextUrl.searchParams.get("secret") === expected;
}

async function processRow(row: SheetRow): Promise<RowResult> {
  try {
    if (!row.title?.trim()) throw new Error("missing title");

    const generated = await generateStructuredPost({
      title: row.title,
      brief: row.brief || "",
    });

    let coverImageAssetId: string | undefined;
    let coverImageAlt = generated.title;
    if (row.imageUrl?.trim()) {
      coverImageAssetId = await uploadImageFromUrl(
        row.imageUrl.trim(),
        `cover-${Date.now()}.jpg`
      );
    } else {
      const image = await generateCoverImage(generated.imagePrompt);
      if (image) {
        const ext = image.mimeType.includes("jpeg") ? "jpg" : "png";
        coverImageAssetId = await uploadImageFromBuffer(
          image.buffer,
          `cover-${Date.now()}.${ext}`,
          image.mimeType
        );
        coverImageAlt = generated.imagePrompt.slice(0, 120);
      }
    }

    const slug = await uniqueSlug(generated.title);
    const publishedAt = new Date().toISOString();
    const id = await createPost({
      title: generated.title,
      slug,
      excerpt: generated.excerpt,
      body: sectionsToBlocks(generated.sections),
      publishedAt,
      coverImageAssetId,
      coverImageAlt,
      seoTitle: generated.seoTitle,
      seoDescription: generated.seoDescription,
      seoKeywords: generated.seoKeywords,
    });

    await markRow(row.row, { status: "published", sanityId: id, publishedAt });
    return { row: row.row, title: generated.title, status: "published", sanityId: id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await markRow(row.row, { status: "error", error: message });
    } catch {
      // sheet update failure is non-fatal for the cron — the row will be retried tomorrow
    }
    return { row: row.row, title: row.title, status: "error", error: message };
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSanityConfigured()) {
    return NextResponse.json({ error: "Sanity not configured" }, { status: 500 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const rows = await fetchDueRows();
  if (dryRun) {
    return NextResponse.json({ dryRun: true, due: rows.length, rows });
  }

  const results: RowResult[] = [];
  for (const row of rows) {
    results.push(await processRow(row));
  }

  return NextResponse.json({
    processed: results.length,
    published: results.filter((r) => r.status === "published").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
