import { Helmet } from "react-helmet-async";

const SITE_URL = "https://aczen.in";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/aczenimg.jpeg`;

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

const SEO = ({
  title,
  description,
  keywords,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noIndex = false,
  publishedAt,
  updatedAt,
  author,
  structuredData,
}: SEOProps) => {
  const canonical = `${SITE_URL}${path}`;
  const fullTitle = title.includes("Aczen") ? title : `${title} | Aczen`;
  const ld = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}
      />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Aczen" />
      <meta property="og:locale" content="en_IN" />
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {updatedAt && <meta property="article:modified_time" content={updatedAt} />}
      {author && <meta property="article:author" content={author} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@aczen" />

      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
