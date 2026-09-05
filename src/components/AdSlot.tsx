/* AdSense-ready placeholder container.
   Each slot renders a real HTML comment marker inside the DOM —
   drop your <ins class="adsbygoogle"> layout script where the
   comment indicates. The dashed frame is purely a dev guide and
   can be deleted once the ad script is live. */

interface AdSlotProps {
  id: "ad-slot-top" | "ad-slot-results" | "ad-slot-sticky";
  label: string;
  note?: string;
  className?: string;
}

export default function AdSlot({ id, label, note, className = "" }: AdSlotProps) {
  return (
    <div
      id={id}
      data-adsense-slot
      className={`relative flex items-center justify-center overflow-hidden rounded-md border border-dashed border-line-2 bg-panel/70 px-4 ${className}`}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: `<!-- ═══ ADSENSE :: ${label} ═══ Paste your <ins class="adsbygoogle"> layout script inside this container ═══ -->`,
        }}
      />
      <div className="pointer-events-none select-none py-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-faint">Advertisement</p>
        <p className="mt-1 text-[11px] leading-tight text-mute/80">
          {label}
          {note ? <span className="text-faint"> · {note}</span> : null}
        </p>
      </div>
    </div>
  );
}
