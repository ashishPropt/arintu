/**
 * Shared hook that polls /api/discount and keeps a live clock ticking.
 * Used by the global DiscountBanner and the per-card DiscountTimer.
 */
import { useEffect, useState } from 'react';
import { discount as discountApi } from '../api';

let cache = null;
let listeners = new Set();

async function fetchOnce() {
  try {
    const r = await discountApi.get();
    cache = r.data;
    listeners.forEach((fn) => fn(cache));
  } catch {}
}

// Module-level interval — polls every 60s regardless of how many components mount.
let polling = false;
function startPolling() {
  if (polling) return;
  polling = true;
  fetchOnce();
  setInterval(fetchOnce, 60_000);
}

export function useDiscount() {
  const [info, setInfo] = useState(cache);
  const [now, setNow]   = useState(Date.now());

  useEffect(() => {
    startPolling();
    listeners.add(setInfo);
    if (cache) setInfo(cache);
    return () => listeners.delete(setInfo);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return { info, now };
}
