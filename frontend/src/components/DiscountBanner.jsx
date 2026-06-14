/**
 * Sticky countdown banner at the top of every page.
 *
 *   upcoming → BLUE  · "Discount opens in HH:MM:SS"
 *   active   → AMBER · "Discount ends in DD:HH:MM:SS"
 *   expired  → null
 */
import { useDiscount } from '../hooks/useDiscount';

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
  const { info, now } = useDiscount();
  if (!info || !info.starts_at || !info.ends_at) return null;
  if (info.status === 'expired' || info.status === 'inactive') return null;

  const pct      = Math.round(info.pct);
  const startsMs = new Date(info.starts_at).getTime();
  const endsMs   = new Date(info.ends_at).getTime();

  if (info.status === 'upcoming' && now < startsMs) {
    return (
      <div className="w-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-base">🎁 {pct}% off all classes</span>
          <span className="hidden sm:inline opacity-80">·</span>
          <span className="opacity-95">
            Opens in <span className="font-mono font-bold tabular-nums">{fmt(startsMs - now)}</span>
          </span>
        </div>
      </div>
    );
  }

  if (info.status === 'active' && now < endsMs) {
    return (
      <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-base">🔥 {pct}% off ALL classes is LIVE</span>
          <span className="hidden sm:inline opacity-80">·</span>
          <span className="opacity-95">
            Ends in <span className="font-mono font-bold tabular-nums">{fmt(endsMs - now)}</span>
          </span>
        </div>
      </div>
    );
  }

  return null;
}
