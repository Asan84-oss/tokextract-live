/* ════════════════════════════════════════════════════════════════
   TokExtract · LIVE extraction client — RapidAPI (TikWM mirror)
   Credentials are injected at build time from environment
   variables only (Vite exposes them via import.meta.env, the
   browser-safe equivalent of process.env). Both VITE_-prefixed
   and plain names are accepted. No demo mode, no mock data —
   every query is routed to the production endpoint:
   https://tikwm-api.p.rapidapi.com/video/?url=…&hd=1
   ════════════════════════════════════════════════════════════════ */

export interface ExtractResult {
  title: string;
  cover: string;
  videoUrl: string; // direct CDN source — watermark-free (hdplay preferred, play fallback)
  audioUrl: string; // direct CDN source — MP3 rip
  duration?: number;
  sourceUrl: string;
}

const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const RAPIDAPI_KEY: string = env.VITE_RAPIDAPI_KEY || env.RAPIDAPI_KEY || "";
export const RAPIDAPI_HOST: string = env.VITE_RAPIDAPI_HOST || env.RAPIDAPI_HOST || "tikwm-api.p.rapidapi.com";
export const hasCredentials: boolean = RAPIDAPI_KEY.length > 0 && RAPIDAPI_HOST.length > 0;

const API_ORIGIN = `https://${RAPIDAPI_HOST}`;

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

/* ── payload normalization ──────────────────────────────────────
   The RapidAPI mirror of TikWM usually answers with the envelope
   { code, msg, data: {…} } — but some of its proxy layouts wrap
   the media object inside an array: a top-level array, a
   `data: [ … ]` collection, or a nested `videos` / `items` /
   `list` key. unwrapPayload descends through every one of those
   shapes until it reaches a plain object carrying media fields,
   preferring whichever element actually exposes a usable source. */

const MEDIA_KEYS = ["hdplay", "play", "hd_play", "video", "url", "video_url", "music"] as const;

function isRecord(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function unwrapPayload(json: any): Record<string, any> {
  if (json == null) return {};
  let node: any = json;
  for (let depth = 0; depth < 6; depth++) {
    if (Array.isArray(node)) {
      const objects = node.filter(isRecord);
      if (objects.length === 0) return {};
      const withMedia = objects.find((o) =>
        MEDIA_KEYS.some((k) => typeof o[k] === "string" && o[k].length > 0),
      );
      node = withMedia ?? objects[0];
      continue;
    }
    if (!isRecord(node)) return {};
    if (MEDIA_KEYS.some((k) => typeof node[k] === "string" && node[k].length > 0)) return node;
    const nested = node.data ?? node.videos ?? node.items ?? node.list ?? node.result;
    if (nested === node || nested === undefined) return node;
    node = nested;
  }
  return isRecord(node) ? node : {};
}

/* ── live extraction via RapidAPI ─────────────────────────────── */

export async function extractTikTok(url: string): Promise<ExtractResult> {
  if (!hasCredentials) {
    throw new Error(
      "No RapidAPI credentials in this build. Set VITE_RAPIDAPI_KEY and VITE_RAPIDAPI_HOST in the .env file and rebuild.",
    );
  }

  const endpoint = `${API_ORIGIN}/video/?url=${encodeURIComponent(url.trim())}&hd=1`;

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

  if (res.status === 401 || res.status === 403) {
    throw new Error("The RapidAPI key was rejected (HTTP " + res.status + "). Verify VITE_RAPIDAPI_KEY and your API subscription.");
  }
  if (res.status === 429) {
    throw new Error("Rate limit reached (HTTP 429). Your RapidAPI quota needs a moment to reset — try again shortly.");
  }
  if (!res.ok) {
    throw new Error(`The extraction service responded with HTTP ${res.status}. Try again in a moment.`);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error("The service returned an unreadable (non-JSON) payload. Try again.");
  }

  // TikWM envelope: { code, msg, processed_time, data } — code !== 0 means failure.
  if (
    json &&
    typeof json === "object" &&
    !Array.isArray(json) &&
    "code" in json &&
    Number(json.code) !== 0
  ) {
    throw new Error(
      typeof json.msg === "string" && json.msg.length > 0
        ? `The service could not process that link: ${json.msg}`
        : `The service could not process that link (error code ${json.code}).`,
    );
  }
  // Legacy envelope kept as a safety net: { status: "fail", message }
  if (json?.status && json.status !== "success") {
    throw new Error(
      typeof json.message === "string" && json.message.length > 0
        ? json.message
        : "That link could not be parsed. Make sure it is a public TikTok video.",
    );
  }

  // Normalize {code,msg,data} envelopes, array-wrapped payloads and
  // nested videos/items/list collections into a single media object.
  const d = unwrapPayload(json);
  // hdplay = HD no-watermark render, play = SD no-watermark render.
  // wmplay is deliberately NEVER used — it carries the watermark.
  const videoUrl: string = d.hdplay || d.play || d.hd_play || d.video || d.url || "";
  const audioUrl: string = d.music || d.mp3 || d.audio || d.music_info?.play || d.music_info?.url || "";
  const cover: string = d.cover || d.origin_cover || d.thumbnail || d.music_info?.cover || d.author?.avatar || "";
  const title: string = d.title || d.desc || d.music_info?.title || "Untitled TikTok video";

  if (!videoUrl) {
    throw new Error("No downloadable source was returned. The video may be private, deleted or region-locked.");
  }

  const duration =
    typeof d.duration === "number" && d.duration > 0
      ? d.duration
      : typeof d.music_info?.duration === "number"
        ? d.music_info.duration
        : undefined;

  return { title, cover, videoUrl, audioUrl, duration, sourceUrl: url.trim() };
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
