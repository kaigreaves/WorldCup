'use client';

// Module-level singleton — persists across React mounts/unmounts in the same browser session.
// This replaces the custom event bus pattern, which had two failure modes:
//   1. Event fires before listener is registered → data silently lost
//   2. fetch() rejects → no event fires, components wait forever

import { fetchRedditData } from './reddit-client';
import type { RedditClientData } from './reddit-client';

const CACHE_KEY = 'reddit_data_v8';
const CACHE_TIME_KEY = 'reddit_data_v8_time';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type Subscriber = (data: RedditClientData) => void;

let _data: RedditClientData | null = null;
let _loading = false;
let _fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }> = [];
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
    // Basic validity check
    if (!parsed.matchComments || !parsed.performers) return null;
    return parsed;
  } catch {
    // Corrupt cache — clear it
    try { sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem(CACHE_TIME_KEY); } catch {}
    return null;
  }
}

function writeCache(data: RedditClientData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  } catch {
    // QuotaExceededError or similar — silently skip caching
  }
}

function startLoad() {
  if (_loading) return;
  _loading = true;

  fetchRedditData(_fixtures)
    .then(data => {
      writeCache(data);
      notify(data);
    })
    .catch(err => {
      console.warn('[Reddit] fetch failed, will retry on next subscribe:', err);
      _loading = false; // allow retry
    });
}

/** Call once at app startup with the fixture list. Idempotent. */
export function initRedditStore(
  fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>
) {
  if (_fixtures.length === 0) _fixtures = fixtures;

  // If already loaded, nothing to do
  if (_data) return;

  // Try memory-missed but sessionStorage-hit (e.g. after HMR)
  const cached = readCache();
  if (cached) {
    _data = cached;
    return;
  }

  startLoad();
}

/**
 * Subscribe to Reddit data. Returns an unsubscribe function.
 * If data is already available, `cb` is called synchronously before returning.
 * NOTE: does NOT start a load — only initRedditStore() does, because it has the
 * fixture list. This prevents components that mount early (e.g. the sidebar
 * leaderboard) from triggering a fetch with an empty fixture list.
 */
export function subscribeReddit(cb: Subscriber): () => void {
  if (_data) {
    cb(_data);
    return () => {};
  }
  _subscribers.add(cb);
  return () => _subscribers.delete(cb);
}
