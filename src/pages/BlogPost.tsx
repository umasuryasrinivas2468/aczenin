import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { getPostBySlug, getMorePosts, type BlogPost as BlogPostType } from "@/lib/sanityQueries";
import { urlFor, isSanityConfigured } from "@/lib/sanity";

const countWordsInBody = (body: unknown): number => {
  if (!Array.isArray(body)) return 0;
  let text = "";
  for (const block of body as Array<Record<string, unknown>>) {
    if (block?._type === "block" && Array.isArray(block.children)) {
      for (const child of block.children as Array<Record<string, unknown>>) {
        if (typeof child?.text === "string") text += " " + child.text;
      }
    }
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const readingTimeMin = (body: unknown): number => {
  const words = countWordsInBody(body);
  return Math.max(1, Math.round(words / 200));
};

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
    cta: ({ value }) => {
      const label = value?.label as string | undefined;
      const href = value?.href as string | undefined;
      if (!label || !href) return null;
      const variant = (value?.variant as string) || "primary";
      const align = (value?.align as string) || "center";
      const alignCls =
        align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
      const btnCls =
        variant === "secondary"
          ? "inline-block px-7 py-3.5 rounded-lg border-2 border-smebank-600 text-smebank-600 font-semibold hover:bg-smebank-50 transition no-underline"
          : "inline-block px-7 py-3.5 rounded-lg bg-smebank-600 text-white font-semibold hover:bg-smebank-700 transition no-underline";
      const isExternal = /^https?:\/\//i.test(href);
      return (
        <div className={`my-8 not-prose ${alignCls}`}>
          <a
            href={href}
            className={btnCls}
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
          </a>
        </div>
      );
    },
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
  const [morePosts, setMorePosts] = useState<BlogPostType[]>([]);
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (!isSanityConfigured()) {
      setError("Blog not configured. Add VITE_SANITY_PROJECT_ID to .env.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setPost(null);
    setMorePosts([]);
    window.scrollTo({ top: 0 });
    getPostBySlug(slug)
      .then((p) => {
        setPost(p);
        if (p?._id) getMorePosts(p._id, 3).then(setMorePosts).catch(() => {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    let raf = 0;
    const update = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const total = Math.max(1, rect.height - viewportH);
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress((scrolled / total) * 100);
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [post]);

  const minutes = useMemo(() => (post ? readingTimeMin(post.body) : 0), [post]);

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
      <div
        className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-smebank-500 to-smeteal-500 origin-left transition-[width] duration-75 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <Navbar />
      <main className="pt-24 pb-16">
        <article ref={articleRef} className="container mx-auto px-4 max-w-3xl">
          <div className="mb-6 text-sm">
            <Link to="/blog" className="text-smebank-600 hover:underline">
              ← Back to blog
            </Link>
          </div>

          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
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
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {minutes} min read
              </span>
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

        {morePosts.length > 0 && (
          <section className="container mx-auto px-4 max-w-6xl mt-20 border-t border-gray-100 pt-12">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                More from the blog
              </h2>
              <Link to="/blog" className="text-smebank-600 hover:underline text-sm font-medium">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {morePosts.map((p) => (
                <Link
                  key={p._id}
                  to={`/blog/${p.slug}`}
                  className="group rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  {p.coverImage?.asset && (
                    <img
                      src={urlFor(p.coverImage).width(800).height(450).url()}
                      alt={p.coverImage.alt || p.title}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>
                      {p.categories?.[0] && (
                        <>
                          <span>·</span>
                          <span className="text-smebank-600">{p.categories[0].title}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-smebank-600 transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-gray-600 text-sm line-clamp-2">{p.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
