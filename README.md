# TokExtract — TikTok No-Watermark Downloader

Premium dark-mode web app that parses any TikTok share link through RapidAPI and saves the
clean HD video (no watermark) plus an MP3 rip of the original sound **directly to the device**.

## Stack

- React 18 + TypeScript, Vite 6, Tailwind CSS v4
- Display face: **Unbounded** · Body face: **Space Grotesk**

## Credentials (never hardcoded)

The client reads keys from environment variables only — see `src/lib/api.ts`:

```bash
VITE_RAPIDAPI_KEY=***    # your RapidAPI key
VITE_RAPIDAPI_HOST=***   # e.g. tiktok-download-without-watermark.p.rapidapi.com
```

> Vite exposes env vars to the browser via `import.meta.env` (the browser-safe equivalent of
> `process.env`), and only variables prefixed with `VITE_` reach the client bundle. The code
> also checks the unprefixed `RAPIDAPI_KEY` / `RAPIDAPI_HOST` names in case your dashboard
> injects them under that convention. Copy `.env.example` to `.env` and fill in the values.
> If no credentials are present the app runs in a clearly-labeled **demo mode** on bundled
> sample media so the full pipeline (parse → result card → blob download) stays testable.

## AdSense integration points

Three placeholder containers ship with the layout, each containing an HTML comment marker
where you drop your `<ins class="adsbygoogle">` script:

| Container         | Location                              | Suggested size |
| ----------------- | ------------------------------------- | -------------- |
| `#ad-slot-top`    | above the URL form entry              | 728×90         |
| `#ad-slot-results`| directly below the download triggers  | 468×60         |
| `#ad-slot-sticky` | sticky container on the bottom rail   | 728×90         |

## Download bug fix

Download triggers never navigate the browser to the CDN URL. `downloadMedia()` in
`src/lib/api.ts` fetches the source into a `Blob`, mints a local object URL and
programmatically clicks a hidden `<a download>` — guaranteeing an in-browser file save.
Progress is reported live from the response stream. If a CDN refuses cross-origin reads,
the app surfaces a warning banner with the raw link instead of silently redirecting.

## Scripts

```bash
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
```

## Disclaimer

TokExtract is not affiliated with TikTok. Downloaded media belongs to its original creators;
use the tool for personal purposes and respect copyright.
