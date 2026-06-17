'use client';

import type { RedditClientData } from './reddit-client';

const CACHE_KEY = 'reddit_data_v10';
const CACHE_TIME_KEY = 'reddit_data_v10_time';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type Subscriber = (data: RedditClientData) => void;

let _data: RedditClientData | null = null;
let _loading = false;
const _subscribers = new Set<Subscriber>();

function notify(data: RedditClientData) {
  _data = data;
  _loading = false;
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

  fetch('/api/reddit-data')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<RedditClientData>;
    })
    .then(data => {
      writeCache(data);
      notify(data);
    })
    .catch(err => {
      console.warn('[Reddit] fetch failed, will retry on next subscribe:', err);
      _loading = false;
    });
}

/** Call once at app startup. The fixtures param is now ignored — the server fetches its own. */
export function initRedditStore(
  _fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>
) {
  if (_data) return;

  const cached = readCache();
  if (cached) {
    notify(cached);
    return;
  }

  startLoad();
}

export function subscribeReddit(cb: Subscriber): () => void {
  if (_data) {
    cb(_data);
    return () => {};
  }
  _subscribers.add(cb);
  return () => _subscribers.delete(cb);
}
