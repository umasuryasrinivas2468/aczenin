# Aczen Blog — Sanity Studio

This is the content dashboard for the Aczen blog. It's a separate mini-app that
connects to your Sanity project and lets anyone on your team write, edit, and
publish posts that appear on the main site at `/blog`.

## One-time setup

1. Create a Sanity project at https://www.sanity.io/manage (you've already
   done this).
2. Copy your **Project ID** and **Dataset name** (usually `production`) from
   the Sanity dashboard.
3. Create a `.env` file in this `studio/` folder:

   ```
   SANITY_STUDIO_PROJECT_ID=your_project_id_here
   SANITY_STUDIO_DATASET=production
   ```

4. Also create a `.env` file at the **project root** (one level up) with:

   ```
   VITE_SANITY_PROJECT_ID=your_project_id_here
   VITE_SANITY_DATASET=production
   ```

   (The same values — one for the Studio, one for the website.)

5. Install dependencies and start the Studio:

   ```
   cd studio
   npm install
   npm run dev
   ```

   Open http://localhost:3333. Log in with the same Sanity account.

## Writing a post

1. Click **Blog Post → Create new**.
2. Fill in Title, Slug (auto-generated), Cover image, Excerpt, Body, and
   optionally SEO fields (SEO title, SEO description, SEO keywords).
3. Click **Publish** (top right). The post appears on the live site at
   `https://aczen.in/blog/<slug>` within seconds.

## Deploy the Studio to the web

So your team can write from any browser without running it locally:

```
cd studio
npx sanity login
npm run deploy
```

Pick a hostname like `aczen` and your Studio will be live at
`https://aczen.sanity.studio`.

## Inviting teammates

In the Sanity dashboard (sanity.io/manage) → **Members** → **Invite member**.
Free tier allows up to 3 seats.
