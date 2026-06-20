"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { getAllPosts, type BlogPost } from "@/lib/sanityQueries";
import { urlFor, isSanityConfigured } from "@/lib/sanity";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSanityConfigured()) {
      setError(
        "Blog is not configured yet. Add NEXT_PUBLIC_SANITY_PROJECT_ID to your .env file."
      );
      setLoading(false);
      return;
    }
    getAllPosts()
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <SEO
        title="Aczen Blog — Insights on Accounting, GST, Fintech & SME Growth"
        description="The Aczen blog: practical guides on GST invoicing, TDS, B2B payments, accounting automation, and growth tips for Indian SMEs, startups and CAs."
        keywords="Aczen blog, accounting blog India, GST guide, fintech blog, SME growth, startup accounting tips, CA resources"
        path="/blog"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Aczen Blog",
          url: "https://aczen.in/blog",
          publisher: {
            "@type": "Organization",
            name: "Aczen Technologies Pvt Ltd",
            logo: "https://aczen.in/images/aczenimg.jpeg",
          },
        }}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Aczen{" "}
              <span className="bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text">
                Blog
              </span>
            </h1>
            <p className="text-lg text-gray-600">
              Practical guides on accounting, GST, payments and growth for Indian businesses.
            </p>
          </div>

          {loading && <p className="text-center text-gray-500">Loading posts…</p>}

          {error && (
            <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
              <p className="font-medium mb-2">Blog setup pending</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <p className="text-center text-gray-500">No posts yet — check back soon.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post._id}
                href={`/blog/${post.slug}`}
                className="group rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
              >
                {post.coverImage?.asset && (
                  <img
                    src={urlFor(post.coverImage).width(800).height(450).url()}
                    alt={post.coverImage.alt || post.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    {post.categories?.[0] && (
                      <>
                        <span>·</span>
                        <span className="text-smebank-600">{post.categories[0].title}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-smebank-600 transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 text-sm line-clamp-3">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
