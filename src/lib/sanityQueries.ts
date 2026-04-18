import { sanityClient } from "./sanity";

export type BlogAuthor = {
  _id: string;
  name: string;
  slug: string;
  image?: { asset: { _ref: string } };
  bio?: string;
};

export type BlogCategory = {
  _id: string;
  title: string;
  slug: string;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: { asset: { _ref: string }; alt?: string };
  body?: unknown;
  publishedAt: string;
  updatedAt?: string;
  author?: BlogAuthor;
  categories?: BlogCategory[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
};

const POST_PROJECTION = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  coverImage{asset, alt},
  publishedAt,
  "updatedAt": _updatedAt,
  seoTitle,
  seoDescription,
  seoKeywords,
  author->{_id, name, "slug": slug.current, image, bio},
  categories[]->{_id, title, "slug": slug.current}
`;

export async function getAllPosts(): Promise<BlogPost[]> {
  return sanityClient.fetch(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
      ${POST_PROJECTION}
    }`
  );
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return sanityClient.fetch(
    `*[_type == "post" && slug.current == $slug][0]{
      ${POST_PROJECTION},
      body
    }`,
    { slug }
  );
}

export async function getRecentPosts(limit = 3): Promise<BlogPost[]> {
  return sanityClient.fetch(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...$limit]{
      ${POST_PROJECTION}
    }`,
    { limit }
  );
}
