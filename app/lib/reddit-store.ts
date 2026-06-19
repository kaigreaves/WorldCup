'use client';

import type { RedditClientData } from './reddit-client';

const CACHE_KEY = 'reddit_data_v10';
const CACHE_TIME_KEY = 'reddit_data_v10_time';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 25_000;      // 25 s — prevents hung requests blocking forever
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000]; // exponential-ish backoff

type Subscriber = (data: RedditClientData) => void;

let _data: RedditClientData | null = null;
let _loading = false;
let _retryCount = 0;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
const _subscribers = new Set<Subscriber>();

function notify(data: RedditClientData) {
  _data = data;
  _loading = false;
  _retryCount = 0;
  if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
  _subscribers.forEach(cb => cb(data));
}

function readCache(): RedditClientData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const time = sessionStorage.getItem(CACHE_TIME_KEY);
    if (!raw || !time) return null;
    if (Date.now() - parseInt(time) > CACHE_TTL_MS) return null;
    const parsed = JSON.parse(raw) as RedditClientData;
    if (!parsed.matchComments || !parsed.performers) return null;
    return parsed;
  } catch {
    try { sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem(CACHE_TIME_KEY); } catch {}
    return null;
  }
}

function writeCache(data: RedditClientData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch {}
}

function startLoad() {
  if (_loading) return;
  _loading = true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  fetch('/api/reddit-data', { signal: controller.signal })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<RedditClientData>;
    })
    .then(data => {
      clearTimeout(timeout);
      writeCache(data);
      notify(data);
    })
    .catch(err => {
      clearTimeout(timeout);
      _loading = false;
      if (_retryCount < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[_retryCount++];
        console.warn(`[Reddit] fetch failed (attempt ${_retryCount}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delay / 1000}s:`, err?.message ?? err);
        _retryTimer = setTimeout(startLoad, delay);
      } else {
        console.error('[Reddit] all retries exhausted — fan comments unavailable this session');
      }
    });
}

/** Call once at app startup. The fixtures param is ignored — the server fetches its own. */
export function initRedditStore(
  _fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>
) {
  if (_data) return;
  const cached = readCache();
  if (cached) { notify(cached); return; }
  startLoad();
}

export function subscribeReddit(cb: Subscriber): () => void {
  if (_data) {
    cb(_data);
    return () => {};
  }
  _subscribers.add(cb);
  // If nothing is in flight (initial load failed or initRedditStore hasn't fired yet),
  // kick off a load attempt so this subscriber eventually gets data.
  if (!_loading && !_retryTimer) startLoad();
  return () => _subscribers.delete(cb);
}
