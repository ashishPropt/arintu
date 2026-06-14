/**
 * Sticky countdown banner for the discount campaign.
 *
 *   upcoming → BLUE  · "Discount opens in HH:MM:SS"      (negative countdown)
 *   active   → AMBER · "Discount ends in DD:HH:MM:SS"     (countdown to end)
 *   expired  → not rendered
 */
import { useEffect, useState } from 'react';
import { discount as discountApi } from '../api';

function fmt(ms) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const days  = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins  = Math.floor((total % 3600) / 60);
  const secs  = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
    : `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

export default function DiscountBanner() {
  const [info, setInfo] = useState(null);
  const [now,  setNow]  = useState(Date.now());

  useEffect(() => {
    discountApi.get().then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Re-poll every ~60 seconds while the page is open so transitions
  // (upcoming → active → expired) and admin extensions are reflected.
  useEffect(() => {
    const id = setInterval(() => {
      discountApi.get().then((r) => setInfo(r.data)).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!info || !info.starts_at || !info.ends_at || info.status === 'expired' || info.status === 'inactive') {
    return null;
  }

  const startsMs = new Date(info.starts_at).getTime();
  const endsMs   = new Date(info.ends_at).getTime();
  const pct      = Math.round(info.pct);

  if (info.status === 'upcoming' && now < startsMs) {
    const remaining = startsMs - now;
    return (
      <div className="w-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-base">🎁 {pct}% off all classes</span>
          <span className="hidden sm:inline opacity-80">·</span>
          <span className="opacity-95">
            Opens in <span className="font-mono font-bold tabular-nums">{fmt(remaining)}</span>
          </span>
        </div>
      </div>
    );
  }

  if (info.status === 'active' && now < endsMs) {
    const remaining = endsMs - now;
    return (
      <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white animate-pulse-slow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-base">🔥 {pct}% off ALL classes is LIVE</span>
          <span className="hidden sm:inline opacity-80">·</span>
          <span className="opacity-95">
            Ends in <span className="font-mono font-bold tabular-nums">{fmt(remaining)}</span>
          </span>
        </div>
      </div>
    );
  }

  return null;
}
