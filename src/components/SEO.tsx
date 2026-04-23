type SEOProps = {
  title: string;
  description: string;
  keywords?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

// Metadata is now emitted by Next.js generateMetadata/metadata exports in app/*.
// This component is a no-op kept so legacy pages can compile without edits.
const SEO = (_props: SEOProps) => null;

export default SEO;
