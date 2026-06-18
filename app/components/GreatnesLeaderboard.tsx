'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { subscribeReddit } from '../lib/reddit-store';
import type { LegacyEntry } from '../lib/api';
import type { PerformerEntry } from '../lib/reddit-client';
import PlayerCard from './PlayerCard';

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

// ── Buzz modifier (max 3 spots up) ───────────────────────────────────────────

function applyBuzzModifier(entries: LegacyEntry[], performers: PerformerEntry[]): LegacyEntry[] {
  if (!performers.length) return entries;

  function buzzBoost(name: string): number {
    const lower = name.toLowerCase();
    const lastName = lower.split(' ').pop() ?? lower;
    const idx = performers.findIndex(p => {
      const pLower = p.name.toLowerCase();
      const pLast = pLower.split(' ').pop() ?? pLower;
      return pLower === lower || pLast === lastName || lower.includes(pLast) || pLower.includes(lastName);
    });
    if (idx === -1) return 0;
    if (idx === 0) return 3;
    if (idx <= 2) return 2;
    if (idx <= 6) return 1;
    return 0;
  }

  const withBoost = entries.map((e, i) => ({
    entry: e,
    adjustedIdx: Math.max(0, i - buzzBoost(e.name)),
  }));
  withBoost.sort((a, b) => a.adjustedIdx - b.adjustedIdx || b.entry.legacyScore - a.entry.legacyScore);
  return withBoost.map((w, i) => ({ ...w.entry, rank: i + 1 }));
}

// ── Component ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function GreatnessLeaderboard({
  entries,
  compact = false,
  computedAt,
}: {
  entries: LegacyEntry[];
  compact?: boolean;
  computedAt?: string;
}) {
  const [ranked, setRanked] = useState<LegacyEntry[]>(entries);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<LegacyEntry | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeReddit(data => {
      setRanked(applyBuzzModifier(entries, data.performers));
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

      <div ref={titleRef} style={{ marginBottom: compact ? '20px' : '28px' }}>
        <p className="label" style={{ marginBottom: '6px' }}>The Hierarchy</p>
        <h2 style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: compact ? '1.3rem' : '34px',
          fontWeight: compact ? 500 : 700,
          letterSpacing: '-0.02em',
          color: 'var(--white)',
          margin: 0,
          lineHeight: 1.1,
          transition: 'opacity 0.2s ease',
          opacity: collapsed ? 0.3 : 1,
        }}>
          Legacy Leaderboard
        </h2>
        <div className="gold-line" style={{ marginTop: '14px' }} />
      </div>

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
          background: 'rgba(255,255,255,0.04)',
          borderRadius: compact ? '12px' : '16px',
          overflow: 'hidden',
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}>
          {ranked.map((entry, i) => (
            <div
              key={entry.playerId}
              onClick={() => setSelectedPlayer(entry)}
              style={{
                borderBottom: i < ranked.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              <LeaderboardRow entry={entry} highlight={i < 3} compact={compact} />
            </div>
          ))}
          {computedAt && !compact && (
            <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '9px', color: 'var(--muted-2)', letterSpacing: '0.08em' }}>
                Updated {timeAgo(computedAt)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rendered outside overflow:hidden container — iOS WebKit clips fixed
          descendants when a parent has overflow:hidden + border-radius */}
      {selectedPlayer && (
        <PlayerCard entry={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </section>
  );
}

function LeaderboardRow({
  entry,
  highlight,
  compact,
}: {
  entry: LegacyEntry;
  highlight: boolean;
  compact: boolean;
}) {
  const topStats = getTopStats(entry);
  const pos = posLabel(entry.position);

  return (
    <div className="lb-row" style={{
      display: 'grid',
      gridTemplateColumns: compact ? '24px 1fr auto' : '52px 1fr auto',
      alignItems: 'center',
      gap: compact ? '8px' : '16px',
      padding: compact ? '9px 10px' : '16px 16px',
      background: highlight ? 'rgba(201,168,76,0.05)' : 'transparent',
      borderLeft: highlight ? '2px solid var(--gold)' : '2px solid transparent',
    }}>

      {/* Rank */}
      <span style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: compact ? '0.85rem' : '2.4rem',
        fontWeight: 200,
        color: 'var(--gold)',
        opacity: highlight ? 0.7 : 0.3,
        lineHeight: 1,
        textAlign: 'center',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {entry.rank}
      </span>

      {/* Player info */}
      <div style={{ minWidth: 0 }}>
        {/* Name row: flag + name + position badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap', marginBottom: '3px' }}>
          {entry.teamLogo && (
            <Image
              src={entry.teamLogo}
              alt={entry.teamName}
              width={compact ? 13 : 15}
              height={compact ? 13 : 15}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <span style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: compact ? '0.88rem' : '1.1rem',
            fontWeight: highlight ? 500 : 400,
            color: highlight ? 'var(--white)' : 'rgba(255,255,255,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {entry.name}
          </span>
          {/* Position badge */}
          <span style={{
            fontSize: '8px',
            letterSpacing: '0.1em',
            color: entry.position === 'G' ? '#4ade80' : entry.position === 'D' ? '#60a5fa' : 'var(--muted)',
            border: `1px solid ${entry.position === 'G' ? 'rgba(74,222,128,0.3)' : entry.position === 'D' ? 'rgba(96,165,250,0.3)' : 'var(--muted-2)'}`,
            padding: '1px 3px',
            borderRadius: '1px',
            flexShrink: 0,
            lineHeight: 1.4,
          }}>
            {pos}
          </span>
        </div>

        {/* Top 2 contributing stats */}
        {topStats.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
            {topStats.map((s, i) => (
              <span key={s} style={{
                fontSize: '9px',
                letterSpacing: '0.08em',
                color: i === 0 ? 'var(--gold)' : 'var(--muted)',
                fontWeight: i === 0 ? 500 : 300,
              }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: compact ? '0.95rem' : '1.3rem',
          fontWeight: 300,
          color: 'var(--gold)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {entry.legacyScore}
        </div>
        {!compact && (
          <div style={{ fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.08em', marginTop: '2px' }}>pts</div>
        )}
      </div>
    </div>
  );
}
