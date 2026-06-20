# Aczen — Unified Financial OS

Aczen is India's unified financial operating system for SMEs, CAs, startups,
freelancers, and enterprises. This repository contains the marketing site and
blog for **aczen.in**.

## Tech stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router
- Sanity (headless CMS for the blog)
- react-helmet-async (per-page SEO)

## Local development

Requires Node.js 18+ and npm.

```sh
npm install
npm run dev
```

The site runs at http://localhost:8080.

## Blog (Sanity)

Blog posts are authored in Sanity Studio and fetched at runtime via the
Sanity CDN.

- Studio folder: `studio/` (run `npm run dev` inside to open the dashboard)
- Runtime client: `src/lib/sanity.ts`
- Public routes: `/blog`, `/blog/:slug`

Set the Sanity project ID and dataset in `.env`:

```
VITE_SANITY_PROJECT_ID=your_project_id
VITE_SANITY_DATASET=production
```

## Deployment

The site is deployed on Vercel via `vercel.json`.
