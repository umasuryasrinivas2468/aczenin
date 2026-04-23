import type { Metadata } from "next";
import BlogPost from "@/views/BlogPost";
import { getAllPosts, getPostBySlug } from "@/lib/sanityQueries";
import { urlFor, isSanityConfigured } from "@/lib/sanity";

type Params = { slug: string };

export const dynamicParams = false;

export async function generateStaticParams() {
  if (!isSanityConfigured()) return [];
  try {
    const posts = await getAllPosts();
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSanityConfigured()) {
    return { title: "Blog post", description: "Aczen blog post." };
  }
  try {
    const post = await getPostBySlug(slug);
    if (!post) {
      return {
        title: "Post not found",
        description: "The blog post you were looking for could not be found.",
        robots: { index: false, follow: false },
        alternates: { canonical: `/blog/${slug}` },
      };
    }
    const coverUrl = post.coverImage?.asset
      ? urlFor(post.coverImage).width(1200).height(630).url()
      : undefined;
    const title = post.seoTitle || post.title;
    const description =
      post.seoDescription || post.excerpt || `${post.title} — Aczen blog.`;
    return {
      title,
      description,
      keywords: post.seoKeywords?.join(", "),
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        title,
        description,
        type: "article",
        url: `/blog/${post.slug}`,
        images: coverUrl ? [coverUrl] : undefined,
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        authors: post.author?.name ? [post.author.name] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: coverUrl ? [coverUrl] : undefined,
      },
    };
  } catch {
    return { title: "Blog post", description: "Aczen blog post." };
  }
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>> = null;
  if (isSanityConfigured()) {
    try {
      post = await getPostBySlug(slug);
    } catch {
      post = null;
    }
  }
  const coverUrl = post?.coverImage?.asset
    ? urlFor(post.coverImage).width(1200).height(630).url()
    : undefined;
  const jsonLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seoDescription || post.excerpt,
        image: coverUrl,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        author: post.author
          ? { "@type": "Person", name: post.author.name }
          : { "@type": "Organization", name: "Aczen Technologies Pvt Ltd" },
        publisher: {
          "@type": "Organization",
          name: "Aczen",
          logo: {
            "@type": "ImageObject",
            url: "https://aczen.in/images/aczenimg.jpeg",
          },
        },
        mainEntityOfPage: `https://aczen.in/blog/${post.slug}`,
      }
    : null;
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BlogPost />
    </>
  );
}
