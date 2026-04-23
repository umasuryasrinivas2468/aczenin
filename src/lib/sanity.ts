import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const RAW_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const CONFIGURED = Boolean(RAW_PROJECT_ID && RAW_PROJECT_ID.trim());

export const SANITY_PROJECT_ID = CONFIGURED ? RAW_PROJECT_ID! : "placeholder";
export const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const SANITY_API_VERSION = "2024-10-01";

export const sanityClient: SanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: true,
  perspective: "published",
});

const builder = imageUrlBuilder(sanityClient);
export const urlFor = (source: SanityImageSource) => builder.image(source);

export const isSanityConfigured = () => CONFIGURED;
