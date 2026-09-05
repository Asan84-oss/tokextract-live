/* ════════════════════════════════════════════════════════════════
   TokExtract · extraction client
   Credentials are pulled from environment variables only —
   nothing is hardcoded. Vite exposes env vars to the browser via
   import.meta.env (the browser-safe equivalent of process.env),
   so we accept both VITE_-prefixed and plain names in case your
   dashboard injects them under either convention.
   ════════════════════════════════════════════════════════════════ */

export interface ExtractResult {
  title: string;
  cover: string;
  videoUrl: string;
  audioUrl: string;
  duration?: number;
  demo: boolean;
  sourceUrl: string;
}

const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const RAPIDAPI_KEY: string = env.VITE_RAPIDAPI_KEY || env.RAPIDAPI_KEY || "";
export const RAPIDAPI_HOST: string = env.VITE_RAPIDAPI_HOST || env.RAPIDAPI_HOST || "";
export const hasCredentials: boolean = RAPIDAPI_KEY.length > 0 && RAPIDAPI_HOST.length > 0;

/* ── input validation ─────────────────────────────────────────── */

const TIKTOK_HOST = /(^|\.)tiktok\.com$|(^|\.)tiktokv\.com$|(^|\.)musically\.com$/i;

export function validateTikTokUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Paste a TikTok link first — it should start with https://";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "That string isn't a valid URL. Check for typos or a missing https://";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http(s) links are supported.";
  }
  if (!TIKTOK_HOST.test(parsed.hostname)) {
    return "Only TikTok links work here — tiktok.com, vm.tiktok.com or vt.tiktok.com.";
  }
  return null;
}

/* ── demo fallback (used only when credentials are absent) ────── */

const DEMO_RESULT = {
  title: "Neon Nights — studio session cut (demo media)",
  cover: "/images/demo-cover.svg",
  videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  audioUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
  duration: 34,
  demo: true,
} as const;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── extraction via RapidAPI ──────────────────────────────────── */

export async function extractTikTok(url: string): Promise<ExtractResult> {
  if (!hasCredentials) {
    // No env credentials configured → run the full pipeline on bundled
    // sample media so the product stays demonstrable end-to-end.
    await delay(1400);
    return { ...DEMO_RESULT, sourceUrl: url.trim() };
  }

  const endpoint = `https://${RAPIDAPI_HOST}/check?url=${encodeURIComponent(url.trim())}`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });
  } catch {
    throw new Error("Network fault — the extraction service could not be reached. Check your connection and retry.");
  }

  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? "The RapidAPI key was rejected (HTTP " + res.status + "). Verify VITE_RAPIDAPI_KEY in your environment."
        : `The extraction service responded with HTTP ${res.status}. Try again in a moment.`,
    );
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("The service returned an unreadable payload. Try again.");
  }

  if (json?.status && json.status !== "success") {
    throw new Error(
      typeof json.message === "string" && json.message.length > 0
        ? json.message
        : "That link could not be parsed. Make sure it is a public TikTok video.",
    );
  }

  const d = json?.data ?? json ?? {};
  const videoUrl: string = d.hdplay || d.play || d.hd_play || d.video || d.url || "";
  const audioUrl: string = d.music || d.mp3 || d.audio || d.music_info?.play || d.music_info?.url || "";
  const cover: string = d.cover || d.origin_cover || d.thumbnail || d.music_info?.cover || "";
  const title: string = d.title || d.desc || d.music_info?.title || "Untitled TikTok video";

  if (!videoUrl) {
    throw new Error("No downloadable source was found for that link. The video may be private or region-locked.");
  }

  return {
    title,
    cover,
    videoUrl,
    audioUrl,
    duration: typeof d.duration === "number" ? d.duration : undefined,
    demo: false,
    sourceUrl: url.trim(),
  };
}

/* ── direct-save download (the watermark-tab-redirect bug fix) ──
   Instead of letting the browser navigate away to the CDN URL,
   we fetch the media into a Blob, mint a local object URL and
   programmatically click a hidden <a download> — guaranteeing an
   in-browser file save.                                          */

export async function downloadMedia(
  url: string,
  filename: string,
  onProgress?: (progress: number | null) => void,
): Promise<void> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`The media source responded with HTTP ${response.status}.`);

  const total = Number(response.headers.get("content-length")) || null;
  let blob: Blob;

  if (response.body && total) {
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress?.(Math.min(1, received / total));
      }
    }
    blob = new Blob(chunks, { type: response.headers.get("content-type") ?? undefined });
  } else {
    onProgress?.(null);
    blob = await response.blob();
  }

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

/* ── small helpers ────────────────────────────────────────────── */

export function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "tokextract";
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
