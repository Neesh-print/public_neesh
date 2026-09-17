# Neesh design system

The visual language of neesh.art, extracted from the code that ships:

- `public_neesh/app/globals.css` (site v2: Ink / Paper / Accent, Archivo display, Manrope body, IBM Plex Mono eyebrows, one breakpoint at 900px, no shadows)
- `neesh-print-hub/src/index.css` and `tailwind.config.ts` (app: the same palette as shadcn HSL tokens, plus status pairs, three soft shadows and a dark theme)
- the components in `neesh-print-hub/src/components/neesh` and `src/components/ui`

Both codebases resolve to one palette and one type system, so this is a single design system with a "site" and an "app" register.

## What is here

| Path | What |
|---|---|
| `tokens.css` | Every token as a CSS custom property, hex resolved, with the app's dark theme under `.dark` |
| `tokens.json` | The same tokens in W3C design-tokens shape, with the HSL triplets the app's Tailwind config consumes |
| `ds.css` | Component styles under the site's own class names (`.btn`, `.eyebrow`, `.d1`, `.field`, `.t-card`, `.chip`, `.mk-header`, `.site-footer`, sections) plus the app recipes as plain CSS (`.app-btn`, `.status-badge`, `.input-neesh`, `.card-neesh`, `.mag-card`, `.app-table`, `.modal`) |
| `preview.css` | Layout helpers used only by the preview pages |
| `previews/**` | One fragment per card. First line is the `@dsCard` marker the Claude Design pane indexes |
| `assets/` | Wordmark SVG, five site photos and five sample covers the previews use |
| `build.mjs` | Compiles fragments into standalone pages in `bundle/` |
| `bundle/` | The sync-ready output. This is what gets uploaded |

## Cards

**Foundations**: Colors, Typography, Spacing and layout, Logo.

**Components**: Buttons, Forms, Chips and badges, Cards, Navigation, Footer and minimal header, Data table, Modal, Feedback and state.

**Sections**: Hero, Two-door fork, Manifesto, Feature bands and newsletter strip, Closing CTA, FAQ rows.

## Rebuild

```bash
node design-system/build.mjs
```

Zero dependencies. Every page in `bundle/` inlines `tokens.css`, `ds.css` and `preview.css`, links the Google Fonts stylesheet, and keeps its `@dsCard` marker as the first line. `bundle/manifest.json` lists every card with its group, name, subtitle and viewport.

## Push to Claude Design

The upload needs a claude.ai login with design-system scope, which only an interactive Claude Code session can grant. From a terminal on your own machine:

```bash
cd path/to/public_neesh
claude
› /design-login        # once
› /design-sync         # point it at design-system/bundle when asked for the directory
```

`/design-sync` reads the `@dsCard` markers, diffs against the remote project and writes only what changed. Pick an existing design-system project or let it create "Neesh".

## Keeping it honest

The previews are hand-written HTML, not rendered from the React components, so they can drift. When a component changes in either codebase, update the matching rule in `ds.css` and the fragment in `previews/`, rebuild, and re-run `/design-sync`. Class names were kept identical to the site's stylesheet so a diff against `globals.css` stays readable.
