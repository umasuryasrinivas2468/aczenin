import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { getPostBySlug, type BlogPost as BlogPostType } from "@/lib/sanityQueries";
import { urlFor, isSanityConfigured } from "@/lib/sanity";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const ptComponents: PortableTextComponents = {
  types: {
    image: ({ value }) =>
      value?.asset ? (
        <img
          src={urlFor(value).width(1200).url()}
          alt={value.alt || ""}
          className="rounded-lg my-6 w-full"
          loading="lazy"
        />
      ) : null,
  },
  marks: {
    link: ({ value, children }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-smebank-600 underline"
      >
        {children}
      </a>
    ),
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (!isSanityConfigured()) {
      setError("Blog not configured. Add VITE_SANITY_PROJECT_ID to .env.");
      setLoading(false);
      return;
    }
    getPostBySlug(slug)
      .then(setPost)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4">
          <p className="text-center text-gray-500">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen">
        <SEO
          title="Post not found"
          description="The blog post you were looking for could not be found."
          path={`/blog/${slug || ""}`}
          noIndex
        />
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <p className="text-gray-600 mb-6">{error || "This post doesn't exist or was removed."}</p>
          <Link to="/blog" className="text-smebank-600 underline">
            ← Back to blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const coverUrl = post.coverImage?.asset
    ? urlFor(post.coverImage).width(1200).height(630).url()
    : undefined;

  return (
    <div className="min-h-screen">
      <SEO
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt || `${post.title} — Aczen blog.`}
        keywords={post.seoKeywords?.join(", ")}
        path={`/blog/${post.slug}`}
        image={coverUrl}
        type="article"
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        author={post.author?.name}
        structuredData={{
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
        }}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <article className="container mx-auto px-4 max-w-3xl">
          <div className="mb-6 text-sm">
            <Link to="/blog" className="text-smebank-600 hover:underline">
              ← Back to blog
            </Link>
          </div>

          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              {post.author && (
                <>
                  <span>·</span>
                  <span>{post.author.name}</span>
                </>
              )}
              {post.categories?.[0] && (
                <>
                  <span>·</span>
                  <span className="text-smebank-600">{post.categories[0].title}</span>
                </>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              {post.title}
            </h1>
            {post.excerpt && <p className="text-lg text-gray-600">{post.excerpt}</p>}
          </header>

          {coverUrl && (
            <img
              src={coverUrl}
              alt={post.coverImage?.alt || post.title}
              className="rounded-xl w-full mb-10"
            />
          )}

          <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-smebank-600">
            {post.body ? (
              <PortableText value={post.body as never} components={ptComponents} />
            ) : (
              <p className="text-gray-500">This post has no content yet.</p>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
