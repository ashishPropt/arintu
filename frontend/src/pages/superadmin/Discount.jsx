import { useEffect, useState } from 'react';
import { discount as discountApi } from '../../api';

function fmtLocal(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtPST(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  // California summer = PDT (UTC-7)
  const pdt = new Date(d.getTime() - 7 * 3600 * 1000);
  const date = `${pdt.getUTCMonth()+1}/${pdt.getUTCDate()}/${pdt.getUTCFullYear()}`;
  const h = pdt.getUTCHours(), m = pdt.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${date} ${h12}:${String(m).padStart(2,'0')} ${ampm} PDT`;
}

export default function DiscountAdmin() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newEnd, setNewEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () =>
    discountApi.get().then((r) => setInfo(r.data)).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const extend = async (e) => {
    e.preventDefault();
    if (!newEnd) return;
    setSaving(true); setMsg('');
    try {
      // newEnd is from datetime-local (browser-local); convert to UTC ISO
      const iso = new Date(newEnd).toISOString();
      const r = await discountApi.extend(iso);
      setInfo(r.data);
      setNewEnd('');
      setMsg('Extended ✓');
      setTimeout(() => setMsg(''), 2500);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to extend');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-gray-400 text-center py-12">Loading…</div>;
  if (!info)   return <div className="text-gray-400 text-center py-12">No discount configured.</div>;

  const statusColor = {
    upcoming: 'bg-blue-50 text-blue-700 border-blue-100',
    active:   'bg-orange-50 text-orange-700 border-orange-100',
    expired:  'bg-gray-50 text-gray-600 border-gray-100',
    inactive: 'bg-gray-50 text-gray-400 border-gray-100',
  }[info.status] || 'bg-gray-50 text-gray-600 border-gray-100';

  const canExtend = info.status === 'upcoming' || info.status === 'active';

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Discount Campaign</h1>
      <p className="text-sm text-gray-500 mb-6">
        Live status of the time-limited discount applied to all class prices.
      </p>

      <div className="card p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${statusColor}`}>{info.status.toUpperCase()}</span>
          <span className="text-xl font-bold text-gray-900">{info.pct}% off</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-500">Starts (PDT)</p>
            <p className="font-medium text-gray-900">{fmtPST(info.starts_at)}</p>
            <p className="text-[11px] text-gray-400">Your local: {fmtLocal(info.starts_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ends (PDT)</p>
            <p className="font-medium text-gray-900">{fmtPST(info.ends_at)}</p>
            <p className="text-[11px] text-gray-400">Your local: {fmtLocal(info.ends_at)}</p>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="font-semibold text-gray-900 mb-2">Extend the end time</h2>
        <p className="text-xs text-gray-500 mb-4">
          You can extend the deadline only while the discount is still upcoming or active.
          Once it expires, you must create a new campaign.
        </p>
        {!canExtend ? (
          <p className="text-sm text-gray-500 italic">
            The discount has ended. Extension is no longer allowed.
          </p>
        ) : (
          <form onSubmit={extend} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New end time (your local time)</label>
              <input
                type="datetime-local"
                className="input max-w-sm"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Must be later than current end: <strong>{fmtLocal(info.ends_at)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving || !newEnd} className="btn-primary">
                {saving ? 'Saving…' : 'Extend'}
              </button>
              {msg && (
                <span className={`text-sm ${msg === 'Extended ✓' ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
