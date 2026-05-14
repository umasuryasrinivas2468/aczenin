export type SheetRow = {
  row: number;
  title: string;
  brief: string;
  publishDate: string;
  imageUrl: string;
};

function endpoint(): string {
  const url = process.env.BLOG_SHEET_WEBHOOK_URL;
  if (!url) throw new Error("BLOG_SHEET_WEBHOOK_URL is not set");
  return url;
}

function secret(): string {
  const s = process.env.BLOG_SHEET_SECRET;
  if (!s) throw new Error("BLOG_SHEET_SECRET is not set");
  return s;
}

export async function fetchDueRows(): Promise<SheetRow[]> {
  const url = new URL(endpoint());
  url.searchParams.set("action", "due");
  url.searchParams.set("secret", secret());
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`sheet due ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { rows?: SheetRow[] };
  return data.rows ?? [];
}

export async function markRow(
  row: number,
  payload:
    | { status: "published"; sanityId: string; publishedAt: string }
    | { status: "error"; error: string }
): Promise<void> {
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "mark",
      secret: secret(),
      row,
      ...payload,
    }),
  });
  if (!res.ok) {
    throw new Error(`sheet mark ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
