import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import AdSlot from "./components/AdSlot";
import {
  IconAlert,
  IconBolt,
  IconCheck,
  IconChevron,
  IconClipboard,
  IconDownload,
  IconHeart,
  IconInfo,
  IconLink,
  IconMusic,
  IconPlay,
  IconShield,
  IconSpinner,
  IconX,
  LogoMark,
} from "./components/icons";
import {
  downloadMedia,
  extractTikTok,
  formatDuration,
  hasCredentials,
  RAPIDAPI_HOST,
  slugify,
  validateTikTokUrl,
  type ExtractResult,
} from "./lib/api";

/* ────────────────────────────────────────────────────────────── */

type Phase = "idle" | "loading" | "success" | "error";

interface Banner {
  kind: "error" | "warn";
  title: string;
  detail?: string;
  link?: string;
}

interface HistoryItem {
  url: string;
  title: string;
  cover: string;
  videoUrl: string;
  audioUrl: string;
  duration?: number;
  ts: number;
}

const HISTORY_KEY = "tokextract.history.v1";

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as HistoryItem[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function useRevealOnScroll() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── static content ───────────────────────────────────────────── */

const TICKER = [
  "tiktok.com/@creator/video/…",
  "vm.tiktok.com shortcuts",
  "vt.tiktok.com shortcuts",
  "no watermark",
  "HD 1080p",
  "MP3 audio rip",
  "no signup",
  "unlimited extractions",
];

const TRUST = [
  { icon: IconShield, text: "Links are never stored on a server" },
  { icon: IconBolt, text: "≈3s average parse time" },
  { icon: IconDownload, text: "Direct Blob-to-disk save" },
];

const STEPS = [
  {
    icon: IconLink,
    title: "Paste the share link",
    body: "Copy any TikTok share URL from the app or the web — full profile links, vm.tiktok and vt.tiktok shortcuts all resolve the same way.",
  },
  {
    icon: IconBolt,
    title: "Server-side parse",
    body: "The request routes straight through the RapidAPI pipeline, which lifts the raw CDN sources behind the post: HD video, cover frame and the original audio track.",
  },
  {
    icon: IconDownload,
    title: "Direct-to-disk save",
    body: "Media is pulled into your browser as a Blob and written straight to your downloads folder. No tab redirects, no watermarks, no middlemen.",
  },
];

const FAQ = [
  {
    q: "Is TokExtract really free?",
    a: "Yes — extraction is unlimited and there is no account, paywall or daily quota. The project is supported by the ad slots you see on the page.",
  },
  {
    q: "Why is the downloaded video watermark-free?",
    a: "TikTok burns the watermark into a separate render of each video. TokExtract asks the API for the raw CDN source that exists before that overlay is applied, so you get the clean master file.",
  },
  {
    q: "Can I grab just the sound as an MP3?",
    a: "Yes. Every successful parse exposes a second trigger that rips the original audio track and saves it as an MP3 file — handy for sounds, remixes and voiceovers.",
  },
  {
    q: "Do you log the links I paste?",
    a: "No. Extraction runs from your browser directly to the API, and your recent history is kept only in this browser's local storage. Clear it any time with the button above the strip.",
  },
  {
    q: "Is it legal to download TikToks?",
    a: "Downloading for personal, offline use is generally fine in most regions. Re-uploading someone else's content without permission is not — always credit creators and respect their rights.",
  },
];

/* ── ambient background ───────────────────────────────────────── */

function Ambient() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="bg-grid-faint absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_78%)]" />
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(0,242,254,0.09),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(254,9,121,0.08),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
      <IconPlay className="animate-floaty absolute left-[7%] top-[24%] h-8 w-8 text-cyan opacity-[0.08]" style={{ "--rot": "-12deg" } as CSSProperties} />
      <IconMusic className="animate-floaty absolute right-[9%] top-[18%] h-9 w-9 text-mag opacity-[0.09]" style={{ animationDelay: "1.2s", "--rot": "10deg" } as CSSProperties} />
      <IconHeart className="animate-floaty absolute left-[12%] bottom-[22%] h-7 w-7 text-mag opacity-[0.08]" style={{ animationDelay: "2.1s" } as CSSProperties} />
      <IconBolt className="animate-floaty absolute right-[13%] bottom-[30%] h-8 w-8 text-cyan opacity-[0.08]" style={{ animationDelay: "0.6s", "--rot": "8deg" } as CSSProperties} />
    </div>
  );
}

/* ── download trigger with live progress ──────────────────────── */

interface DownloadButtonProps {
  accent: "cyan" | "mag";
  icon: ReactNode;
  label: string;
  sub: string;
  disabled?: boolean;
  resolve: () => { url: string; filename: string };
  onFail: (message: string, directUrl: string) => void;
}

function DownloadButton({ accent, icon, label, sub, disabled, resolve, onFail }: DownloadButtonProps) {
  const [state, setState] = useState<
    { s: "idle" } | { s: "busy"; p: number | null } | { s: "done" } | { s: "error" }
  >({ s: "idle" });
  const busy = state.s === "busy";

  const run = async () => {
    if (busy || disabled) return;
    const { url, filename } = resolve();
    setState({ s: "busy", p: 0 });
    try {
      await downloadMedia(url, filename, (p) => setState({ s: "busy", p }));
      setState({ s: "done" });
    } catch (e) {
      setState({ s: "error" });
      onFail(e instanceof Error ? e.message : "The download could not be completed.", url);
    } finally {
      window.setTimeout(() => setState({ s: "idle" }), 3200);
    }
  };

  const statusText =
    state.s === "busy"
      ? state.p == null
        ? "Fetching media…"
        : `Fetching media… ${Math.round(state.p * 100)}%`
      : state.s === "done"
        ? "Saved — check your downloads"
        : state.s === "error"
          ? "Failed — see notice above"
          : sub;

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || busy}
      className={cx(
        "group/dl relative overflow-hidden rounded-md p-3.5 text-left transition-all duration-200",
        accent === "cyan"
          ? "btn-sheen bg-cyan text-canvas shadow-[0_12px_32px_-14px_rgba(0,242,254,0.55)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(0,242,254,0.65)] active:translate-y-0"
          : "border border-mag/70 bg-mag/5 text-mag hover:-translate-y-0.5 hover:bg-mag/15 hover:shadow-[0_14px_36px_-16px_rgba(254,9,121,0.5)] active:translate-y-0",
        disabled && "cursor-not-allowed opacity-40 hover:translate-y-0 hover:shadow-none",
      )}
    >
      {state.s === "busy" && state.p != null && (
        <span
          className={cx("absolute inset-y-0 left-0", accent === "cyan" ? "bg-canvas/15" : "bg-mag/20")}
          style={{ width: `${Math.round(state.p * 100)}%` }}
        />
      )}
      {state.s === "busy" && state.p == null && <span className="progress-stripes absolute inset-0 opacity-50" />}
      <span className="relative flex items-center gap-3">
        <span
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            accent === "cyan" ? "bg-canvas/15" : "bg-mag/15",
          )}
        >
          {state.s === "busy" ? (
            <IconSpinner className="h-4.5 w-4.5" />
          ) : state.s === "done" ? (
            <IconCheck className="h-5 w-5" />
          ) : state.s === "error" ? (
            <IconAlert className="h-5 w-5" />
          ) : (
            icon
          )}
        </span>
        <span className="min-w-0">
          <span className="font-display block text-[11px] font-bold uppercase tracking-[0.14em]">{label}</span>
          <span className={cx("mt-0.5 block truncate text-[11px]", accent === "cyan" ? "text-canvas/70" : "text-mag/70")}>
            {statusText}
          </span>
        </span>
      </span>
    </button>
  );
}

/* ── result thumbnail ─────────────────────────────────────────── */

function Thumb({ cover, title, duration }: { cover: string; title: string; duration?: number }) {
  const [failed, setFailed] = useState(false);
  const dur = formatDuration(duration);
  return (
    <div className="relative aspect-[9/16] w-full shrink-0 overflow-hidden bg-panel-2 sm:aspect-auto sm:h-auto sm:w-52">
      {!failed && cover ? (
        <img src={cover} alt={title} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full min-h-64 w-full items-center justify-center bg-[radial-gradient(80%_60%_at_50%_30%,rgba(0,242,254,0.14),transparent),radial-gradient(80%_60%_at_50%_78%,rgba(254,9,121,0.14),transparent)]">
          <LogoMark className="h-14 w-14 opacity-60" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-canvas/75 via-transparent to-transparent" />
      <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full border border-ink/25 bg-canvas/55 backdrop-blur-sm transition-transform duration-300 hover:scale-110">
        <IconPlay className="h-5 w-5 translate-x-[1px] text-ink" />
      </span>
      {dur && (
        <span className="absolute bottom-2 left-2 rounded-sm bg-canvas/80 px-1.5 py-0.5 font-display text-[10px] font-bold text-ink">
          {dur}
        </span>
      )}
    </div>
  );
}

/* ── main app ─────────────────────────────────────────────────── */

export default function App() {
  useRevealOnScroll();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [stickyOpen, setStickyOpen] = useState(true);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  /* "/" focuses the URL field from anywhere */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (phase === "success") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [phase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (phase === "loading") return;
    const id = ++reqId.current;
    setBanner(null);

    const invalid = validateTikTokUrl(url);
    if (invalid) {
      setFieldError(invalid);
      return;
    }
    setFieldError(null);
    setPhase("loading");

    try {
      const res = await extractTikTok(url);
      if (id !== reqId.current) return;
      setResult(res);
      setPhase("success");
      const item: HistoryItem = {
        url: res.sourceUrl,
        title: res.title,
        cover: res.cover,
        videoUrl: res.videoUrl,
        audioUrl: res.audioUrl,
        duration: res.duration,
        ts: Date.now(),
      };
      setHistory((prev) => {
        const next = [item, ...prev.filter((p) => p.url !== item.url)].slice(0, 6);
        saveHistory(next);
        return next;
      });
    } catch (err) {
      if (id !== reqId.current) return;
      setPhase((prev) => (prev === "success" ? "success" : "error"));
      setBanner({
        kind: "error",
        title: "Extraction failed",
        detail: err instanceof Error ? err.message : "Unexpected error while parsing that link.",
      });
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setFieldError(null);
        inputRef.current?.focus();
      } else {
        setFieldError("Clipboard is empty — copy a TikTok link first.");
      }
    } catch {
      setFieldError("Clipboard access was blocked — paste manually with Ctrl+V.");
    }
  };

  const restoreFromHistory = (item: HistoryItem) => {
    reqId.current++;
    setBanner(null);
    setFieldError(null);
    setUrl(item.url);
    setResult({
      title: item.title,
      cover: item.cover,
      videoUrl: item.videoUrl,
      audioUrl: item.audioUrl,
      duration: item.duration,
      sourceUrl: item.url,
    });
    setPhase("success");
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const onDownloadFail = (message: string, directUrl: string) => {
    setBanner({
      kind: "warn",
      title: "Direct save was blocked by the CDN",
      detail: `${message} Use the raw source link below — right-click it and choose “Save link as…” to grab the file.`,
      link: directUrl,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loading = phase === "loading";

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Ambient />

      {/* ── header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#top" className="group flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6" />
            <span className="font-display text-base font-bold tracking-tight">
              Tok<span className="text-cyan">Extract</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-[12px] font-medium uppercase tracking-[0.16em] text-mute md:flex">
            <a href="#extractor" className="transition-colors hover:text-cyan">Extractor</a>
            <a href="#how" className="transition-colors hover:text-cyan">Pipeline</a>
            <a href="#faq" className="transition-colors hover:text-cyan">FAQ</a>
          </nav>
          <span
            className={cx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]",
              hasCredentials ? "border-cyan/40 text-cyan" : "border-danger/40 text-danger",
            )}
            title={
              hasCredentials
                ? `Live — queries routed to https://${RAPIDAPI_HOST}`
                : "VITE_RAPIDAPI_KEY is missing from the build environment. Set it in .env and rebuild to go live."
            }
          >
            <span
              className={cx("dot-live h-1.5 w-1.5 rounded-full", hasCredentials ? "bg-cyan" : "bg-danger")}
              style={hasCredentials ? undefined : { animationName: "none" }}
            />
            {hasCredentials ? "API Live" : "Config Error"}
          </span>
        </div>
      </header>

      {/* ── ticker ─────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden border-b border-line bg-panel/60">
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap py-2.5 pr-8">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-mute">
              {t}
              <svg viewBox="0 0 8 8" className={cx("h-1.5 w-1.5", i % 2 ? "text-mag" : "text-cyan")} aria-hidden="true">
                <path d="M4 0 8 4 4 8 0 4z" fill="currentColor" />
              </svg>
            </span>
          ))}
        </div>
      </div>

      <main id="top" className="relative z-10">
        {/* ── extractor console ────────────────────────────── */}
        <section id="extractor" className="mx-auto max-w-5xl px-5 pt-14 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan">
                <span className="text-mag">//</span> short-form media extractor
              </p>
              <h1 className="font-display mt-4 text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
                Paste a link.
                <br />
                Get <span className="text-cyan">clean</span> <span className="text-mag">files</span>.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-mute sm:text-base">
                TokExtract strips the watermark off any TikTok and hands you the raw HD video plus an MP3 of the
                original sound — saved straight to your device.
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <div className="flex h-6 items-end justify-end gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={cx("eq-bar w-1 rounded-full", i % 2 ? "bg-mag/70" : "bg-cyan/80")}
                    style={{ height: "100%", animationDelay: `${i * 0.13}s` }}
                  />
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
                <li className="flex items-center justify-end gap-2">
                  HD 1080p video <span className="inline-block h-1.5 w-1.5 bg-cyan" />
                </li>
                <li className="flex items-center justify-end gap-2">
                  MP3 audio rip <span className="inline-block h-1.5 w-1.5 bg-mag" />
                </li>
                <li className="flex items-center justify-end gap-2">
                  Zero watermarks <span className="inline-block h-1.5 w-1.5 bg-cyan" />
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            {TRUST.map(({ icon: Icon, text }) => (
              <span key={text} className="group flex items-center gap-2 text-[12px] text-mute transition-colors hover:text-ink">
                <Icon className="h-4 w-4 text-faint transition-colors group-hover:text-cyan" />
                {text}
              </span>
            ))}
          </div>

          {/* ═══ AD SLOT 01 · above the form entry ═══ */}
          <div className="mx-auto mt-10 max-w-3xl">
            <AdSlot id="ad-slot-top" label="Slot 01 · above form · 728×90" note="adsbygoogle" className="h-24 sm:h-[90px]" />
          </div>

          {/* ── URL form ───────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className={cx(
              "relative mx-auto mt-6 flex max-w-3xl flex-col gap-2 rounded-lg border bg-panel p-2.5 transition-all duration-300 sm:flex-row sm:items-center",
              focused
                ? "border-cyan/60 shadow-[0_0_0_4px_rgba(0,242,254,0.07),0_18px_50px_-20px_rgba(0,242,254,0.35)]"
                : "border-line shadow-[0_18px_50px_-30px_rgba(0,0,0,0.8)] hover:border-line-2",
            )}
          >
            <div className="flex flex-1 items-center gap-3 pl-2.5">
              <IconLink className={cx("h-5 w-5 shrink-0 transition-colors", focused ? "text-cyan" : "text-faint")} />
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="https://www.tiktok.com/@creator/video/73…"
                spellCheck={false}
                autoComplete="off"
                aria-label="TikTok video URL"
                className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-faint sm:text-[15px]"
              />
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mute transition-all hover:border-cyan/50 hover:text-cyan active:scale-95"
              >
                <IconClipboard className="h-3.5 w-3.5" />
                Paste
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-sheen font-display flex w-full items-center justify-center gap-2.5 rounded-md bg-cyan px-9 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-canvas transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-10px_rgba(0,242,254,0.55)] active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto sm:min-w-[190px]"
            >
              {loading ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  Parsing…
                </>
              ) : (
                <>
                  <IconBolt className="h-4 w-4" />
                  Extract
                </>
              )}
            </button>
          </form>

          <div className="mx-auto mt-3 flex max-w-3xl flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-faint">
              Press <kbd className="rounded-sm border border-line bg-panel px-1.5 py-0.5 font-body text-[10px] text-mute">/</kbd> to
              focus · <kbd className="rounded-sm border border-line bg-panel px-1.5 py-0.5 font-body text-[10px] text-mute">Enter</kbd> to extract
            </p>
            {!hasCredentials && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
                <IconInfo className="h-3.5 w-3.5 shrink-0" />
                RapidAPI credentials missing — set VITE_RAPIDAPI_KEY + VITE_RAPIDAPI_HOST in .env and rebuild.
              </p>
            )}
          </div>

          {fieldError && (
            <p className="animate-banner-in mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
              <IconAlert className="h-4 w-4 shrink-0" />
              {fieldError}
            </p>
          )}

          {banner && (
            <div
              role="alert"
              className={cx(
                "animate-banner-in mx-auto mt-4 max-w-3xl rounded-md border px-4 py-3.5",
                banner.kind === "error" ? "border-danger/45 bg-danger/10" : "border-warn/45 bg-warn/10",
              )}
            >
              <div className="flex items-start gap-3">
                <IconAlert className={cx("mt-0.5 h-5 w-5 shrink-0", banner.kind === "error" ? "text-danger" : "text-warn")} />
                <div className="min-w-0 flex-1">
                  <p className={cx("font-display text-[12px] font-bold uppercase tracking-[0.12em]", banner.kind === "error" ? "text-danger" : "text-warn")}>
                    {banner.title}
                  </p>
                  {banner.detail && <p className="mt-1.5 text-[13px] leading-relaxed text-ink/85">{banner.detail}</p>}
                  {banner.link && (
                    <a
                      href={banner.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-[12px] text-cyan underline decoration-cyan/40 underline-offset-4 transition-colors hover:text-ink"
                    >
                      {banner.link}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setBanner(null)}
                  aria-label="Dismiss notice"
                  className="rounded-md p-1 text-mute transition-colors hover:bg-canvas/40 hover:text-ink"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── dynamic result card (hidden until success) ── */}
          <div ref={resultRef} className="mx-auto mt-8 max-w-3xl">
            {loading && (
              <div className="overflow-hidden rounded-lg border border-line bg-panel">
                <div className="flex flex-col sm:flex-row">
                  <div className="skeleton aspect-[9/16] w-full sm:aspect-auto sm:h-auto sm:w-52 sm:min-h-72" />
                  <div className="flex-1 space-y-4 p-6">
                    <div className="flex gap-2">
                      <div className="skeleton h-5 w-24 rounded-sm" />
                      <div className="skeleton h-5 w-14 rounded-sm" />
                      <div className="skeleton h-5 w-14 rounded-sm" />
                    </div>
                    <div className="skeleton h-5 w-11/12 rounded-sm" />
                    <div className="skeleton h-5 w-2/3 rounded-sm" />
                    <div className="skeleton h-4 w-1/2 rounded-sm" />
                    <div className="grid gap-3 pt-2 sm:grid-cols-2">
                      <div className="skeleton h-16 rounded-md" />
                      <div className="skeleton h-16 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && phase === "success" && result && (
              <article key={result.sourceUrl + result.title} className="animate-card-in overflow-hidden rounded-lg border border-line bg-panel shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
                <div className="flex flex-col sm:flex-row">
                  <Thumb cover={result.cover} title={result.title} duration={result.duration} />
                  <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-sm bg-cyan/12 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan ring-1 ring-cyan/30">
                        No watermark
                      </span>
                      <span className="rounded-sm bg-ink/8 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-ink/80 ring-1 ring-line-2">
                        HD · MP4
                      </span>
                      {result.audioUrl && (
                        <span className="rounded-sm bg-mag/12 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-mag ring-1 ring-mag/30">
                          MP3 ready
                        </span>
                      )}
                    </div>

                    <h2 className="font-display mt-3.5 text-base font-bold leading-snug sm:text-lg" title={result.title}>
                      <span className="line-clamp-3">{result.title}</span>
                    </h2>
                    <p className="mt-2 break-all text-[11px] leading-relaxed text-faint">{result.sourceUrl}</p>

                    <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
                      <DownloadButton
                        accent="cyan"
                        icon={<IconDownload className="h-4.5 w-4.5" />}
                        label="Download Video"
                        sub="No watermark · MP4"
                        resolve={() => ({
                          url: result.videoUrl,
                          filename: `${slugify(result.title)}_no_watermark.mp4`,
                        })}
                        onFail={onDownloadFail}
                      />
                      <DownloadButton
                        accent="mag"
                        icon={<IconMusic className="h-4.5 w-4.5" />}
                        label="Download Audio"
                        sub={result.audioUrl ? "MP3 · original sound" : "Unavailable for this video"}
                        disabled={!result.audioUrl}
                        resolve={() => ({
                          url: result.audioUrl,
                          filename: `${slugify(result.title)}.mp3`,
                        })}
                        onFail={onDownloadFail}
                      />
                    </div>

                    {/* ═══ AD SLOT 02 · directly below the download triggers ═══ */}
                    <div className="mt-5">
                      <AdSlot id="ad-slot-results" label="Slot 02 · below triggers · 468×60" note="adsbygoogle" className="h-20" />
                    </div>
                  </div>
                </div>
              </article>
            )}

            {!loading && phase === "idle" && !result && (
              <div className="rounded-lg border border-dashed border-line bg-panel/40 px-6 py-12 text-center transition-colors hover:border-line-2">
                <IconPlay className="mx-auto h-7 w-7 text-faint" />
                <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mute">
                  Your parsed video lands here — thumbnail, title, and both download triggers appear the moment the
                  fetch completes.
                </p>
              </div>
            )}

            {!loading && phase === "error" && !result && (
              <div className="rounded-lg border border-dashed border-danger/40 bg-danger/5 px-6 py-12 text-center">
                <IconAlert className="mx-auto h-7 w-7 text-danger" />
                <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mute">
                  That one didn't parse. The notice above explains why — fix the link and hit{" "}
                  <span className="font-medium text-ink">Extract</span> again.
                </p>
              </div>
            )}
          </div>

          {/* ── recent extractions ─────────────────────────── */}
          {history.length > 0 && (
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-mute">
                  Recent extractions
                </h3>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-mute transition-all hover:border-danger/50 hover:text-danger active:scale-95"
                >
                  <IconX className="h-3 w-3" />
                  Clear
                </button>
              </div>
              <div className="mt-4 flex gap-3.5 overflow-x-auto pb-3">
                {history.map((item) => (
                  <button
                    key={item.url + item.ts}
                    type="button"
                    onClick={() => restoreFromHistory(item)}
                    className="group w-44 shrink-0 overflow-hidden rounded-md border border-line bg-panel text-left transition-all duration-200 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_14px_34px_-16px_rgba(0,242,254,0.4)]"
                  >
                    <div className="relative h-24 w-full overflow-hidden bg-panel-2">
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                        />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-canvas/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <IconPlay className="h-5 w-5 text-ink" />
                      </span>

                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-[12px] font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-faint">{timeAgo(item.ts)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── pipeline / how it works ─────────────────────── */}
        <section id="how" className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
          <div data-reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-mag">
              <span className="text-cyan">//</span> the pipeline
            </p>
            <h2 className="font-display mt-4 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              From share link to saved file in three moves
            </h2>
          </div>

          <ol className="relative mt-12 space-y-12 border-l border-line pl-8 sm:ml-4 sm:space-y-14 sm:pl-12">
            <span
              className="absolute -left-px top-2 h-32 w-px bg-gradient-to-b from-cyan to-transparent"
              aria-hidden="true"
            />
            {STEPS.map((step, i) => (
              <li key={step.title} data-reveal className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-10">
                <span
                  className="font-display pointer-events-none absolute -left-8 top-1 h-3 w-3 -translate-x-1/2 rounded-full sm:-left-12"
                  aria-hidden="true"
                >
                  <span className={cx("absolute inset-0 rounded-full", i === 1 ? "bg-mag" : "bg-cyan")} />
                  <span className={cx("absolute inset-0 animate-ping rounded-full opacity-30", i === 1 ? "bg-mag" : "bg-cyan")} />
                </span>
                <span className="font-display text-outline w-24 shrink-0 text-6xl font-black leading-none sm:text-7xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="max-w-xl">
                  <h3 className="font-display flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.14em]">
                    <step.icon className={cx("h-4.5 w-4.5", i === 1 ? "text-mag" : "text-cyan")} />
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-mute sm:text-[15px]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-3xl px-5 pb-24">
          <div data-reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan">
              <span className="text-mag">//</span> good to know
            </p>
            <h2 className="font-display mt-4 text-3xl font-black tracking-tight sm:text-4xl">Questions, answered</h2>
          </div>

          <div data-reveal className="mt-10 overflow-hidden rounded-lg border border-line bg-panel/70">
            {FAQ.map((item, i) => {
              const open = faqOpen === i;
              return (
                <div key={item.q} className={cx(i > 0 && "border-t border-line")}>
                  <button
                    type="button"
                    onClick={() => setFaqOpen(open ? null : i)}
                    aria-expanded={open}
                    className="group flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left transition-colors hover:bg-panel-2/60 sm:px-6"
                  >
                    <span className={cx("text-[15px] font-medium transition-colors", open ? "text-cyan" : "text-ink group-hover:text-cyan")}>
                      {item.q}
                    </span>
                    <IconChevron className={cx("h-4 w-4 shrink-0 text-mute transition-transform duration-300", open && "rotate-180 text-cyan")} />
                  </button>
                  <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-mute sm:px-6">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── footer ─────────────────────────────────────────── */}
      <footer className={cx("relative z-10 border-t border-line transition-all", stickyOpen ? "pb-36 sm:pb-32" : "pb-10")}>
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 pt-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <span className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="font-display text-sm font-bold">
                Tok<span className="text-cyan">Extract</span>
              </span>
            </span>
            <p className="mt-4 text-[12px] leading-relaxed text-faint">
              Built for creators, researchers and archivists who want clean source files. Downloaded media belongs to
              its original creators — use it for personal purposes and always credit the source.
            </p>
          </div>
          <div className="flex gap-14 text-[12px]">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-mute">Product</p>
              <ul className="mt-3 space-y-2 text-faint">
                <li><a href="#extractor" className="transition-colors hover:text-cyan">Extractor</a></li>
                <li><a href="#how" className="transition-colors hover:text-cyan">Pipeline</a></li>
                <li><a href="#faq" className="transition-colors hover:text-cyan">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-mute">Legal</p>
              <ul className="mt-3 space-y-2 text-faint">
                <li>Not affiliated with TikTok</li>
                <li>No files touch our servers</li>
                <li>© {new Date().getFullYear()} TokExtract</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ AD SLOT 03 · sticky bottom rail ═══ */}
      {stickyOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-canvas/95 shadow-[0_-14px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <AdSlot id="ad-slot-sticky" label="Slot 03 · sticky rail · 728×90" note="adsbygoogle" className="h-[54px] md:h-[64px]" />
            </div>
            <button
              type="button"
              onClick={() => setStickyOpen(false)}
              aria-label="Dismiss ad rail"
              title="Dismiss ad rail"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-mute transition-all hover:border-mag/50 hover:text-mag active:scale-90"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
