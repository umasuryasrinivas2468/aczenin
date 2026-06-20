import { createClient, type SanityClient } from "@sanity/client";
import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from "@/lib/sanity";

let cached: SanityClient | null = null;

export function writeClient(): SanityClient {
  if (cached) return cached;
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_WRITE_TOKEN is not set");
  cached = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
  });
  return cached;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "post";
  const existing = await writeClient().fetch<string[]>(
    `*[_type == "post" && slug.current match $pattern].slug.current`,
    { pattern: `${base}*` }
  );
  if (!existing.includes(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.includes(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function uploadImageFromUrl(
  url: string,
  filename: string
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch ${res.status} for ${url}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return uploadImageFromBuffer(buffer, filename, contentType);
}

export async function uploadImageFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const asset = await writeClient().assets.upload("image", buffer, {
    filename,
    contentType,
  });
  return asset._id;
}

export type CreatePostInput = {
  title: string;
  slug: string;
  excerpt: string;
  body: unknown[];
  publishedAt: string;
  coverImageAssetId?: string;
  coverImageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
};

export async function createPost(input: CreatePostInput): Promise<string> {
  const doc = {
    _type: "post" as const,
    title: input.title,
    slug: { _type: "slug", current: input.slug },
    excerpt: input.excerpt,
    body: input.body,
    publishedAt: input.publishedAt,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    seoKeywords: input.seoKeywords,
    ...(input.coverImageAssetId
      ? {
          coverImage: {
            _type: "image",
            asset: { _type: "reference", _ref: input.coverImageAssetId },
            alt: input.coverImageAlt,
          },
        }
      : {}),
  };
  const created = await writeClient().create(doc);
  return created._id;
}
