# Neesh — Curated Packs landing + Newsletter signup

Static pages served from `public/`:

- `public/curatedpacks/` — the Curated Packs landing page (`/curatedpacks`), self-contained HTML with its images in `assets/`.
- `public/newsletter/` — standalone newsletter signup (`/newsletter`). Submits directly to the Supabase table `public.mailing_list_subscribers` (the same list as the main-site capture) via the public REST endpoint with the publishable key.

## Note on this repository

This repository was empty when these pages were added — it does not (yet) contain
the neesh.art React app, which deploys to Vercel from a different source. The
`vercel.json` here makes this repo deployable standalone as a static site
(`outputDirectory: public`, no trailing-slash redirects).

## Integrating into the main Vite app

Copy `public/curatedpacks/` and `public/newsletter/` into the app's `public/`
directory. Vite copies `public/*` into the build output root, and Vercel's
filesystem handling serves static files before any SPA rewrite, so
`/curatedpacks` and `/newsletter` will win over the router. If the app's
`vercel.json` has a catch-all rewrite to `index.html`, no exclusion is needed —
`rewrites` are evaluated after the filesystem check. All asset references in the
pages are absolute (`/curatedpacks/assets/...`), so they work with and without a
trailing slash.
