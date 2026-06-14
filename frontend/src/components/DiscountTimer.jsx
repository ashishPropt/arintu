/**
 * Compact one-line discount timer for use inside class cards.
 *
 *   upcoming → blue  "🎁 30% off opens in HH:MM:SS"
 *   active   → red   "🔥 30% off ends in DD:HH:MM:SS"
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

export default function DiscountTimer() {
  const { info, now } = useDiscount();
  if (!info || !info.starts_at || !info.ends_at) return null;
  if (info.status === 'expired' || info.status === 'inactive') return null;

  const pct      = Math.round(info.pct);
  const startsMs = new Date(info.starts_at).getTime();
  const endsMs   = new Date(info.ends_at).getTime();

  if (info.status === 'upcoming' && now < startsMs) {
    return (
      <div className="mt-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded inline-flex items-center gap-1">
        <span>🎁 {pct}% off opens in</span>
        <span className="font-mono font-bold tabular-nums">{fmt(startsMs - now)}</span>
      </div>
    );
  }

  if (info.status === 'active' && now < endsMs) {
    return (
      <div className="mt-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded inline-flex items-center gap-1">
        <span>🔥 {pct}% off ends in</span>
        <span className="font-mono font-bold tabular-nums">{fmt(endsMs - now)}</span>
      </div>
    );
  }

  return null;
}
