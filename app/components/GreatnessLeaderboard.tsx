'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { subscribeReddit } from '../lib/reddit-store';
import type { LegacyEntry } from '../lib/api';
import type { PerformerEntry } from '../lib/reddit-client';
import type { PlayerMatchStat } from '../api/player/[playerId]/route';
import PlayerCard from './PlayerCard';
import { getFollowed, getSeenRanks, saveSeenRanks, FOLLOW_CHANGE_EVENT } from '../lib/follow';

// ── Position label ────────────────────────────────────────────────────────────

function posLabel(pos: string): string {
  if (pos === 'G') return 'GK';
  if (pos === 'D') return 'DEF';
  if (pos === 'M') return 'MID';
  return 'FWD';
}

// ── Top 2 contributing stats (by estimated legacy pts) ────────────────────────

function getTopStats(entry: LegacyEntry): string[] {
  const items: { label: string; pts: number }[] = [];
  const W = 0.65; // avg OQS × stage weight for estimates

  if (entry.position === 'G') {
    if (entry.penaltiesSaved > 0) items.push({ label: `${entry.penaltiesSaved} PKS`, pts: entry.penaltiesSaved * 10 * W });
    if (entry.cleanSheets > 0)   items.push({ label: `${entry.cleanSheets} CS`,  pts: entry.cleanSheets * 8 * W });
  } else if (entry.position === 'D') {
    if (entry.cleanSheets > 0) items.push({ label: `${entry.cleanSheets} CS`,  pts: entry.cleanSheets * 5 * W });
    if (entry.goals > 0)       items.push({ label: `${entry.goals} G`,       pts: entry.goals * 10 * W });
    if (entry.assists > 0)     items.push({ label: `${entry.assists} A`,      pts: entry.assists * 6 * W });
  } else {
    // Separate goal bonus pts from goal base pts so they can rank independently
    if (entry.hatTricks > 0)         items.push({ label: `${entry.hatTricks} HTK`, pts: entry.hatTricks * 15 + entry.hatTricks * 3 * 10 * W });
    if (entry.gameWinningGoals > 0)  items.push({ label: `${entry.gameWinningGoals} GW`,  pts: entry.gameWinningGoals * (10 + 8) * W });
    if (entry.equalizerGoals > 0)    items.push({ label: `${entry.equalizerGoals} EQ`,  pts: entry.equalizerGoals * (10 + 6) * W });
    const otherGoals = Math.max(0, entry.goals - entry.gameWinningGoals - entry.equalizerGoals - (entry.hatTricks * 3));
    if (otherGoals > 0)              items.push({ label: `${entry.goals} G`,   pts: entry.goals * 10 * W });
    else if (entry.goals > 0 && !entry.hatTricks) items.push({ label: `${entry.goals} G`, pts: entry.goals * 10 * W });
    if (entry.assists > 0)           items.push({ label: `${entry.assists} A`, pts: entry.assists * 6 * W });
  }

  return items
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 2)
    .map(i => i.label);
}

// ── Buzz modifier — bonus pts based on Tournament Favourites ranking ──────────
// Rank 1=+5, 2=+4.5, 3=+4, 4=+3.5, 5=+3, 6=+2.5, 7=+2, 8=+1.5, 9=+1, 10=+0.5
// Uses tournamentFavourites (sorted by buzzScore) — same order as the UI section

function applyBuzzModifier(
  entries: LegacyEntry[],
  favourites: PerformerEntry[],
): { ranked: LegacyEntry[]; bonuses: Map<number, number> } {
  if (!favourites.length) return { ranked: entries, bonuses: new Map() };

  function buzzBonus(name: string): number {
    const lower = name.toLowerCase();
    const lastName = lower.split(' ').pop() ?? lower;
    const idx = favourites.slice(0, 10).findIndex(p => {
      const pLower = p.name.toLowerCase();
      const pLast = pLower.split(' ').pop() ?? pLower;
      return pLower === lower || pLast === lastName || lower.includes(pLast) || pLower.includes(lastName);
    });
    if (idx === -1) return 0;
    // rank = idx+1; bonus = 5.5 - rank*0.5
    return Math.round((5.5 - (idx + 1) * 0.5) * 10) / 10;
  }

  const bonuses = new Map<number, number>();
  const boosted = entries.map(e => {
    const bonus = buzzBonus(e.name);
    if (bonus > 0) bonuses.set(e.playerId, bonus);
    return bonus > 0
      ? { ...e, legacyScore: Math.round((e.legacyScore + bonus) * 10) / 10 }
      : e;
  });

  boosted.sort((a, b) =>
    b.legacyScore - a.legacyScore ||
    a.playerId - b.playerId,
  );
  return { ranked: boosted.map((e, i) => ({ ...e, rank: i + 1 })), bonuses };
}

// ── Component ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Leaderboard climb notifications ──────────────────────────────────────────

const RANK_STORE_KEY = 'legacy_ranks_v1';

// ── Daily rank delta — snapshot at start of each day ─────────────────────────

function todayKey(): string { return new Date().toISOString().slice(0, 10); }
function yesterdayKey(): string {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
}
function loadDailySnapshot(dateKey: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(`legacy_snap_${dateKey}`) ?? '{}'); } catch { return {}; }
}
function saveDailySnapshot(ranked: LegacyEntry[]) {
  try {
    const map: Record<string, number> = {};
    ranked.forEach(e => { map[e.name] = e.rank; });
    localStorage.setItem(`legacy_snap_${todayKey()}`, JSON.stringify(map));
    // Clean up snapshots older than 7 days
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('legacy_snap_') && k.slice(12) < cutoff.toISOString().slice(0, 10)) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

function loadStoredRanks(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RANK_STORE_KEY) ?? '{}'); } catch { return {}; }
}

function saveRanks(ranked: LegacyEntry[]) {
  try {
    const map: Record<string, number> = {};
    ranked.forEach(e => { map[e.name] = e.rank; });
    localStorage.setItem(RANK_STORE_KEY, JSON.stringify(map));
  } catch {}
}

async function notifyClimbs(ranked: LegacyEntry[], prev: Record<string, number>) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  for (const entry of ranked) {
    const prevRank = prev[entry.name];
    if (!prevRank || prevRank <= entry.rank) continue;
    const gained = prevRank - entry.rank;
    new Notification(`📈 ${entry.name} climbed ${gained} spot${gained > 1 ? 's' : ''}`, {
      body: `Now #${entry.rank} on the Legacy Leaderboard · ${entry.legacyScore} pts`,
      icon: '/icon-192.png',
      tag: `climb-${entry.name}`,
      silent: false,
    });
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FollowView { name: string; rank: number; delta: number | null; isNew: boolean; }

export default function GreatnessLeaderboard({
  entries,
  compact = false,
  computedAt,
  degraded = false,
}: {
  entries: LegacyEntry[];
  compact?: boolean;
  computedAt?: string;
  degraded?: boolean;
}) {
  const [ranked, setRanked] = useState<LegacyEntry[]>(entries);
  const [buzzBonuses, setBuzzBonuses] = useState<Map<number, number>>(new Map());
  const [dailyDeltas, setDailyDeltas] = useState<Map<number, number>>(new Map());
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<LegacyEntry | null>(null);
  const [followView, setFollowView] = useState<FollowView[]>([]);
  // Snapshot of last-seen ranks captured once at mount, so the "since your last
  // visit" deltas stay stable through this session's buzz updates instead of
  // flattening to zero the moment we persist the new ranks.
  const seenAtMount = useRef<Record<string, number> | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const historyCache = useRef<Map<number, PlayerMatchStat[]>>(new Map());
  const inflight = useRef<Set<number>>(new Set());
  // True after the first Reddit data load — prevents spurious notifications
  // on page load when stored ranks differ from buzz-adjusted order.
  const sessionReady = useRef(false);

  const prefetchPlayer = useCallback((playerId: number) => {
    if (historyCache.current.has(playerId) || inflight.current.has(playerId)) return;
    inflight.current.add(playerId);
    fetch(`/api/player/${playerId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { matchHistory: PlayerMatchStat[] } | null) => {
        if (data) historyCache.current.set(playerId, data.matchHistory);
      })
      .catch(() => {})
      .finally(() => inflight.current.delete(playerId));
  }, []);

  useEffect(() => {
    const yesterday = loadDailySnapshot(yesterdayKey());
    return subscribeReddit(data => {
      const { ranked: newRanked, bonuses } = applyBuzzModifier(entries, data.tournamentFavourites);

      // Daily deltas: compare to yesterday's snapshot, show only climbers (▲N)
      const deltas = new Map<number, number>();
      newRanked.forEach(e => {
        const prevRank = yesterday[e.name];
        if (prevRank && prevRank > e.rank) deltas.set(e.playerId, prevRank - e.rank);
      });
      setDailyDeltas(deltas);
      saveDailySnapshot(newRanked);

      if (sessionReady.current) {
        const prev = loadStoredRanks();
        notifyClimbs(newRanked, prev);
      }
      sessionReady.current = true;
      saveRanks(newRanked);
      setRanked(newRanked);
      setBuzzBonuses(bonuses);
    });
  }, [entries]);

  useEffect(() => {
    if (compact) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-100px 0px 0px 0px' }
    );
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, [compact]);

  // ── Followed-player return trigger ────────────────────────────────────────
  // Show each followed player's movement since the user's last visit, then
  // persist the current ranks so next session compares against today.
  useEffect(() => {
    if (compact) return;
    if (seenAtMount.current === null) seenAtMount.current = getSeenRanks();

    function recompute() {
      const followed = getFollowed();
      if (followed.length === 0) { setFollowView([]); return; }
      const seen = seenAtMount.current!;
      const rows: FollowView[] = followed
        .map(f => {
          const e = ranked.find(r => r.playerId === f.playerId);
          if (!e) return null;
          const prev = seen[e.name];
          return { name: e.name, rank: e.rank, delta: prev ? prev - e.rank : null, isNew: !prev };
        })
        .filter((r): r is FollowView => r !== null);
      setFollowView(rows);
      // Persist latest ranks for the next session (without touching the mount
      // snapshot that drives this session's deltas).
      const next = { ...getSeenRanks() };
      rows.forEach(r => { next[r.name] = r.rank; });
      saveSeenRanks(next);
    }

    recompute();
    window.addEventListener(FOLLOW_CHANGE_EVENT, recompute);
    return () => window.removeEventListener(FOLLOW_CHANGE_EVENT, recompute);
  }, [ranked, compact]);

  return (
    <section>
      {/* Collapsed title shown in nav bar area when scrolled past */}
      {!compact && collapsed && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0, right: 0,
          zIndex: 95,
          height: 'calc(56px + env(safe-area-inset-top))',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: '10px',
          paddingTop: 'env(safe-area-inset-top)',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em',
            color: 'var(--white)',
          }}>
            Legacy Leaderboard
          </span>
        </div>
      )}

      <div ref={titleRef} style={{ marginBottom: compact ? '20px' : '32px' }}>
        <p className="section-eyebrow" style={{ marginBottom: '8px' }}>The Hierarchy</p>
        <h2 className="section-large-title" style={{
          fontSize: compact ? '1.3rem' : undefined,
          fontWeight: compact ? 500 : undefined,
          transition: 'opacity 0.25s ease',
          opacity: collapsed ? 0.2 : 1,
        }}>
          Legacy Leaderboard
        </h2>
        <div className="gold-line" style={{ marginTop: '16px', opacity: 0.5 }} />
      </div>

      {/* Followed-player return trigger — "since your last visit" */}
      {!compact && followView.length > 0 && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '14px',
          background: 'rgba(201,168,76,0.05)', border: '0.5px solid rgba(201,168,76,0.18)',
        }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.85, fontWeight: 600, marginBottom: '10px' }}>
            Your Players · Since Last Visit
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {followView.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>{r.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {r.isNew ? (
                    <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.04em' }}>now tracking</span>
                  ) : r.delta! > 0 ? (
                    <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>▲{r.delta}</span>
                  ) : r.delta! < 0 ? (
                    <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>▼{Math.abs(r.delta!)}</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>—</span>
                  )}
                  <span style={{ fontSize: '13px', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>#{r.rank}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Degraded data signal — keep the promise: tell the user when scores are estimated */}
      {!compact && degraded && ranked.length > 0 && (
        <div style={{
          marginBottom: '16px', padding: '9px 13px', borderRadius: '10px',
          background: 'rgba(245,166,35,0.07)', border: '0.5px solid rgba(245,166,35,0.22)',
          display: 'flex', alignItems: 'center', gap: '9px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f5a623', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,200,120,0.92)', lineHeight: 1.4 }}>
            Live feed catching up — some scores are estimated and will refine shortly.
          </span>
        </div>
      )}

      {ranked.length === 0 ? (
        <div style={{ padding: '32px 0' }}>
          {/* Distinguish: genuine pre-tournament empty vs API failure.
              If computedAt exists and is recent, data was fetched but the
              tournament hasn't produced scorers yet — expected state.
              If computedAt is missing or very stale, something went wrong. */}
          {computedAt && (Date.now() - new Date(computedAt).getTime()) < 10 * 60 * 1000 ? (
            <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '13px', margin: 0 }}>
              Awaiting tournament data · updated {timeAgo(computedAt)}
            </p>
          ) : (
            <div>
              <p style={{ color: 'rgba(255,100,100,0.7)', fontSize: '13px', margin: '0 0 6px 0' }}>
                Leaderboard data unavailable
              </p>
              <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '11px', margin: 0 }}>
                {computedAt
                  ? `Last successful fetch ${timeAgo(computedAt)} · will retry automatically`
                  : 'Connecting to data source…'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.038)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderRadius: compact ? 'var(--radius-card-sm)' : 'var(--radius-card)',
          overflow: 'hidden',
          border: '0.5px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 4px 24px rgba(0,0,0,0.2)',
        }}>
          {ranked.map((entry, i) => (
            <div
              key={entry.playerId}
              onPointerDown={() => prefetchPlayer(entry.playerId)}
              onClick={() => { try { navigator.vibrate?.(8); } catch {} requestNotificationPermission(); setSelectedPlayer(entry); }}
              className={`animate-row${i < 12 ? ` stagger-${i + 1}` : ''}`}
              style={{
                borderBottom: i < ranked.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              <LeaderboardRow entry={entry} highlight={i < 3} compact={compact} buzzBonus={buzzBonuses.get(entry.playerId) ?? 0} dailyDelta={dailyDeltas.get(entry.playerId) ?? 0} />
            </div>
          ))}
          {computedAt && !compact && (
            <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '9px', color: 'var(--muted-2)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>
                Updated {timeAgo(computedAt)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rendered outside overflow:hidden container — iOS WebKit clips fixed
          descendants when a parent has overflow:hidden + border-radius */}
      {selectedPlayer && (
        <PlayerCard
          entry={selectedPlayer}
          preloadedHistory={historyCache.current.get(selectedPlayer.playerId) ?? null}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </section>
  );
}

// ── Birth years for age-based badges ─────────────────────────────────────────
// As of June 2026: <26 = Rising Star, ≥26 = Star
// Special cases override age entirely.

const PLAYER_BIRTH_YEARS: Record<string, number> = {
  'messi': 1987, 'mbappe': 1998, 'yamal': 2007,
  'david': 2000, 'ayari': 2004, 'larin': 1995,
  'just': 2002, 'hwang': 1996, 'baturina': 2000,
  'havertz': 1999, 'undav': 1996, 'isak': 1999,
  'rashford': 1997, 'vinicius': 2000, 'nakamura': 1997,
  'balogun': 2001, 'saliba': 2001, 'manzambi': 2003,
  'diallo': 2001, 'fayzullaev': 2004, 'romo': 1999,
};

function playerAge(name: string): number | null {
  const lower = name.toLowerCase();
  for (const [key, year] of Object.entries(PLAYER_BIRTH_YEARS)) {
    if (lower.includes(key)) return 2026 - year;
  }
  return null;
}

function legacyBadge(name: string, rank: number): { label: string; color: string; border: string } | null {
  if (rank > 10) return null;
  const lower = name.toLowerCase();

  // Named special cases
  if (lower.includes('messi'))  return { label: 'GOAT', color: 'var(--gold)', border: 'rgba(201,168,76,0.5)' };
  if (lower.includes('mbappe')) return { label: 'Rising Legend', color: 'rgba(201,168,76,0.85)', border: 'rgba(201,168,76,0.32)' };
  if (lower.includes('yamal'))  return { label: 'Generational Talent', color: '#a78bfa', border: 'rgba(167,139,250,0.35)' };

  // Age-based for rest of top 10
  const age = playerAge(name);
  if (age !== null && age < 26) return { label: 'Rising Star', color: 'rgba(147,197,253,0.9)', border: 'rgba(147,197,253,0.28)' };
  return { label: 'Star', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.18)' };
}

function LeaderboardRow({
  entry,
  highlight,
  compact,
  buzzBonus,
  dailyDelta,
}: {
  entry: LegacyEntry;
  highlight: boolean;
  compact: boolean;
  buzzBonus: number;
  dailyDelta: number;
}) {
  const topStats = getTopStats(entry);
  const pos = posLabel(entry.position);
  const badge = !compact ? legacyBadge(entry.name, entry.rank) : null;

  return (
    <div className="lb-row" style={{
      display: 'grid',
      gridTemplateColumns: compact ? '24px 1fr auto' : '52px 1fr auto',
      alignItems: 'center',
      gap: compact ? '8px' : '16px',
      padding: compact ? '9px 10px' : highlight ? '20px 20px' : '15px 20px',
      background: highlight ? 'rgba(201,168,76,0.06)' : 'transparent',
      borderLeft: `2px solid ${highlight ? 'var(--gold)' : 'transparent'}`,
    }}>

      {/* Rank */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <span style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: compact ? '0.85rem' : '2.4rem',
          fontWeight: 200,
          color: 'var(--gold)',
          opacity: highlight ? 0.7 : 0.3,
          lineHeight: 1,
          display: 'block',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {entry.rank}
        </span>
        {!compact && dailyDelta > 0 && (
          <span style={{
            fontSize: '8px', fontWeight: 700, color: '#4ade80',
            letterSpacing: '0.02em', lineHeight: 1,
          }}>
            ▲{dailyDelta}
          </span>
        )}
      </div>

      {/* Player info */}
      <div style={{ minWidth: 0 }}>
        {/* Name row: flag + name + position badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', marginBottom: '4px' }}>
          {entry.teamLogo && (
            <Image
              src={entry.teamLogo}
              alt={entry.teamName}
              width={compact ? 13 : 16}
              height={compact ? 13 : 16}
              style={{ objectFit: 'contain', flexShrink: 0, opacity: 0.9 }}
            />
          )}
          <span style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
            fontSize: compact ? '0.88rem' : '1.05rem',
            fontWeight: highlight ? 600 : 400,
            color: highlight ? 'var(--white)' : 'rgba(255,255,255,0.72)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}>
            {entry.name}
          </span>
          {/* Position badge */}
          <span style={{
            fontSize: '7.5px',
            letterSpacing: '0.12em',
            color: entry.position === 'G' ? '#4ade80' : entry.position === 'D' ? '#93c5fd' : 'rgba(255,255,255,0.38)',
            border: `0.5px solid ${entry.position === 'G' ? 'rgba(74,222,128,0.28)' : entry.position === 'D' ? 'rgba(147,197,253,0.28)' : 'rgba(255,255,255,0.15)'}`,
            padding: '1px 5px',
            borderRadius: '999px',
            flexShrink: 0,
            lineHeight: 1.5,
          }}>
            {pos}
          </span>
        </div>

        {/* Stats + legacy badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          {topStats.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
              {topStats.map((s, i) => (
                <span key={s} style={{
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  color: i === 0 ? 'var(--gold)' : 'var(--muted)',
                  fontWeight: i === 0 ? 600 : 400,
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {badge && (
            <span className="player-badge" style={{
              color: badge.color,
              borderColor: badge.border,
              background: `${badge.border.replace(')', ', 0.06)')}`,
            }}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
          fontSize: compact ? '1rem' : '1.35rem',
          fontWeight: highlight ? 300 : 200,
          color: highlight ? 'var(--gold-bright, var(--gold))' : 'rgba(201,168,76,0.65)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>
          {entry.legacyScore}
        </div>
        {!compact && (
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>pts</div>
        )}
        {buzzBonus > 0 && (
          <div style={{
            fontSize: '8px',
            color: 'rgba(255,140,0,0.9)',
            letterSpacing: '0.04em',
            fontWeight: 600,
            marginTop: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '2px',
          }}>
            🔥 +{buzzBonus}
          </div>
        )}
      </div>
    </div>
  );
}
