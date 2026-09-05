/* AdSense live unit container.
   Each slot renders the standard responsive <ins class="adsbygoogle">
   structure wired to the publisher ID ca-pub-4086555246252982.
   React never executes <script> tags injected through innerHTML, so
   the `(adsbygoogle || []).push({})` call runs programmatically in
   useEffect once the unit is mounted — one push per slot, exactly
   like the inline snippet AdSense ships. Until units are approved
   the slot renders empty with a quiet placeholder label. */

import { useEffect } from "react";

const AD_CLIENT = "ca-pub-4086555246252982";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  id: "ad-slot-top" | "ad-slot-results" | "ad-slot-sticky";
  label: string;
  note?: string;
  className?: string;
}

export default function AdSlot({ id, label, note, className = "" }: AdSlotProps) {
  /* Equivalent of AdSense's inline <script>(adsbygoogle = window.adsbygoogle || []).push({});</script> */
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      /* pre-approval pushes can throw "No slot size" — non-fatal */
      console.info(`[TokExtract] adsense push pending for ${id}:`, err);
    }
  }, [id]);

  return (
    <div
      id={id}
      data-adsense-slot
      className={`relative overflow-hidden rounded-md border border-dashed border-line-2 bg-panel/70 ${className}`}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: `<!-- ═══ ADSENSE :: ${label} ═══ responsive unit · ${AD_CLIENT} ═══ -->`,
        }}
      />
      {/* quiet placeholder — covered automatically once a real ad fills the unit */}
      <div className="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-faint">
          Advertisement
          {note ? <span className="ml-2 font-medium normal-case tracking-normal text-mute/60">{note}</span> : null}
        </p>
      </div>
      <ins
        className="adsbygoogle relative z-10 block h-full w-full"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot="default"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
