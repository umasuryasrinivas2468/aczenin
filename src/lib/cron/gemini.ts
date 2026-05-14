const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export type StructuredSection = {
  heading: string;
  paragraphs: string[];
};

export type StructuredPost = {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  imagePrompt: string;
  sections: StructuredSection[];
};

const POST_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    seoKeywords: { type: "array", items: { type: "string" } },
    imagePrompt: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "paragraphs"],
      },
    },
  },
  required: [
    "title",
    "excerpt",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "imagePrompt",
    "sections",
  ],
};

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

export async function generateStructuredPost(input: {
  title: string;
  brief: string;
}): Promise<StructuredPost> {
  const prompt = `You are a senior writer for Aczen — an India-focused unified financial OS for SMEs, CAs, startups, freelancers, and enterprises.

Write a complete, publish-ready blog post for the Aczen blog based on:
Title: ${input.title}
Brief: ${input.brief || "(no brief — infer from the title)"}

Constraints:
- Tone: practical, confident, founder-friendly. India-specific examples where relevant (GST, TDS, MSME, RBI, INR).
- Length: 700–1100 words across 4–7 sections.
- "title" should be a polished version of the input title (<= 90 chars).
- "excerpt" is a single-sentence hook (<= 200 chars).
- "seoTitle" <= 65 chars. "seoDescription" <= 155 chars.
- "seoKeywords": 4–8 lowercase keyword phrases.
- "imagePrompt" is a 1–2 sentence description for an editorial cover image (no text on image, photographic or minimalist illustration).
- Each section has a short H2 heading and 1–3 paragraphs. No markdown, no bullet syntax, no asterisks — only plain prose.
- Do not include the title as a section heading.
- Avoid hallucinated statistics; only mention numbers that are common knowledge.`;

  const res = await fetch(
    `${GEMINI_BASE}/${TEXT_MODEL}:generateContent?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: POST_SCHEMA,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini text ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini text response had no candidates");
  return JSON.parse(text) as StructuredPost;
}

export async function generateCoverImage(
  imagePrompt: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const res = await fetch(
    `${GEMINI_BASE}/${IMAGE_MODEL}:generateContent?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Editorial cover image for an Indian fintech blog post. ${imagePrompt} 16:9 framing, clean, modern, no text or watermarks.`,
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini image ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
      };
    }>;
  };
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data) {
      return {
        buffer: Buffer.from(inline.data, "base64"),
        mimeType: inline.mimeType || "image/png",
      };
    }
  }
  return null;
}
