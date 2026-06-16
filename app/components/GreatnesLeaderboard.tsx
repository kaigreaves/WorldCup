'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { subscribeReddit } from '../lib/reddit-store';
import type { LegacyEntry } from '../lib/api';
import type { PerformerEntry } from '../lib/reddit-client';

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

export default function GreatnessLeaderboard({
  entries,
  compact = false,
}: {
  entries: LegacyEntry[];
  compact?: boolean;
}) {
  const [ranked, setRanked] = useState<LegacyEntry[]>(entries);

  useEffect(() => {
    return subscribeReddit(data => {
      setRanked(applyBuzzModifier(entries, data.performers));
    });
  }, [entries]);

  return (
    <section>
      <div style={{ marginBottom: compact ? '20px' : '2rem' }}>
        <p className="label" style={{ marginBottom: '8px' }}>The Hierarchy</p>
        <h2 style={{ fontSize: compact ? '1.3rem' : '2.5rem', color: 'var(--white)', margin: 0 }}>
          Legacy Leaderboard
        </h2>
        <div className="gold-line" style={{ marginTop: '12px' }} />
      </div>

      {ranked.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '13px' }}>Tournament data loading.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {ranked.map((entry, i) => (
            <LeaderboardRow key={entry.playerId} entry={entry} highlight={i < 3} compact={compact} />
          ))}
        </div>
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
      gridTemplateColumns: compact ? '24px 1fr auto' : '44px 1fr auto',
      alignItems: 'center',
      gap: compact ? '8px' : '14px',
      padding: compact ? '9px 10px' : '14px 16px',
      background: highlight ? 'rgba(201,168,76,0.06)' : 'transparent',
      borderLeft: highlight ? '2px solid var(--gold)' : '2px solid transparent',
    }}>

      {/* Rank */}
      <span style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: compact ? '0.85rem' : '2rem',
        fontWeight: 300,
        color: 'var(--gold)',
        opacity: highlight ? 0.7 : 0.3,
        lineHeight: 1,
        textAlign: 'center',
        flexShrink: 0,
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
            fontFamily: 'Cormorant Garamond, serif',
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
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: compact ? '0.95rem' : '1.3rem',
          fontWeight: 300,
          color: 'var(--gold)',
          lineHeight: 1,
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
