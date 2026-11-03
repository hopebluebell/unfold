# UNFOLD

A bilingual, responsive art website based on the UNFOLD Figma design. English and Russian pages share a collection saved in the visitor's browser.

## Features

- Eight original page types, plus individual pages for all 24 works, six curated exhibitions and four artists.
- English / Russian navigation with the current work, exhibition and filters preserved.
- Light and dark themes with a persistent header toggle.
- Animated hover underlines, a desktop cursor and content entering from both sides.
- Floating back-to-top button after 600 px, with reduced-motion preferences respected.
- Search across both languages, artist and medium filters, sorting and incremental loading.
- Persistent browser-local favourites; the initial collection contains two selected works.
- Responsive layouts, keyboard-accessible navigation, labelled controls and reduced-motion support.
- Local fonts and images, with artwork credits, source links and licenses on each work page.

UNFOLD is an independent student curatorial project. The selections are not official exhibitions or artist collaborations. Descriptive display titles are distinguished from source captions. Source publication dates are not represented as creation dates.

## Preview

Serve this directory using any static web server. There is no package installation or build step:

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173/`. Russian is the initial language; use EN in the header to switch. Hash routes work on GitHub Pages without server rewrites.

## GitHub Pages

The published repository contains the contents of `dist` at its root. In Settings → Pages, use **Deploy from a branch**, **main**, **/(root)**. The expected project URL is `https://hopebluebell.github.io/unfold/`.

## Sources and licenses

Artwork metadata is in `assets/works.json`, with source URL, license URL, original caption and date provenance for every work. `ARTWORK-CREDITS.md` records the original downloads and credits. Web delivery copies are proportionally resized WebP files; originals remain in the project's asset archive. Crops and decorative assets were exported from the user's Figma file. Font license texts are included alongside their files.

## Editing

`data.js` contains translations, artists and exhibition selections. `app.js` contains routes and interaction logic; `styles.css` contains layout and responsive rules. No backend, registration, analytics or third-party scripts are used. Collections are local to the browser and do not sync across devices.
