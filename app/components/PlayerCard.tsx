'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import Image from 'next/image';
import type { LegacyEntry } from '../lib/api';
import type { PlayerMatchStat } from '../api/player/[playerId]/route';
import { subscribeReddit } from '../lib/reddit-store';
import type { RedditComment } from '../lib/reddit-client';

// ── Round label ───────────────────────────────────────────────────────────────

function roundShort(round: string): string {
  const r = round.toLowerCase();
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter') && !r.includes('3rd')) return 'FINAL';
  if (r.includes('semi')) return 'SF';
  if (r.includes('quarter')) return 'QF';
  if (r.includes('16')) return 'R16';
  if (r.includes('32')) return 'R32';
  return 'GS';
}

function posLabel(pos: string): string {
  if (pos === 'G') return 'GK';
  if (pos === 'D') return 'DEF';
  if (pos === 'M') return 'MID';
  return 'FWD';
}

// ── SVG line graph ────────────────────────────────────────────────────────────

function LegacyGraph({ history }: { history: PlayerMatchStat[] }) {
  if (history.length === 0) return null;

  const W = 320;
  const H = 90;
  const PAD = { top: 24, right: 16, bottom: 24, left: 16 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxPts = Math.max(...history.map(m => m.cumulativePts), 1);
  const points = history.map((m, i) => ({
    x: PAD.left + (history.length === 1 ? innerW / 2 : (i / (history.length - 1)) * innerW),
    y: PAD.top + innerH - (m.cumulativePts / maxPts) * innerH,
    m,
  }));

  // Smooth cubic bezier path
  function pathD(pts: typeof points): string {
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.45;
      const cp2x = curr.x - (curr.x - prev.x) * 0.45;
      d += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  const linePath = pathD(points);
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(201,168,76,0.25)" />
          <stop offset="100%" stopColor="rgba(201,168,76,0)" />
        </linearGradient>
      </defs>

      {/* Fill */}
      <path d={fillPath} fill="url(#graphFill)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Data points + labels */}
      {points.map(({ x, y, m }, i) => (
        <g key={i}>
          {/* +pts label above */}
          <text
            x={x}
            y={y - 7}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(201,168,76,0.9)"
            fontFamily="system-ui,-apple-system,sans-serif"
            fontWeight="600"
          >
            +{m.legacyPts}
          </text>
          {/* Circle */}
          <circle cx={x} cy={y} r="3" fill="var(--gold)" opacity="0.9" />
          {/* Round label below */}
          <text
            x={x}
            y={H - PAD.bottom + 13}
            textAnchor="middle"
            fontSize="7"
            fill="rgba(255,255,255,0.4)"
            fontFamily="system-ui,-apple-system,sans-serif"
            letterSpacing="0.05em"
          >
            {roundShort(m.round)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlayerCard({
  entry,
  onClose,
}: {
  entry: LegacyEntry;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<PlayerMatchStat[] | null>(null);
  const [exiting, setExiting] = useState(false);
  const [redditComment, setRedditComment] = useState<RedditComment | null>(null);

  // Fetch match history
  useEffect(() => {
    fetch(`/api/player/${entry.playerId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { matchHistory: PlayerMatchStat[] } | null) => {
        if (data) setHistory(data.matchHistory);
      })
      .catch(() => setHistory([]));
  }, [entry.playerId]);

  // Reddit comment for this player
  useEffect(() => {
    return subscribeReddit(data => {
      const lower = entry.name.toLowerCase();
      const lastName = lower.split(' ').pop() ?? lower;
      const comment = data.playerComments[lower] ?? data.playerComments[lastName];
      if (comment) setRedditComment(comment);
    });
  }, [entry.name]);

  // Lock body scroll while open
  useLayoutEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(onClose, 350);
  }

  const pos = posLabel(entry.position);
  const statPills: string[] = [];
  if (entry.goals > 0) statPills.push(`${entry.goals}G`);
  if (entry.assists > 0) statPills.push(`${entry.assists}A`);
  if (entry.cleanSheets > 0) statPills.push(`${entry.cleanSheets}CS`);
  if (entry.hatTricks > 0) statPills.push(`${entry.hatTricks}HTK`);
  if (entry.penaltiesSaved > 0) statPills.push(`${entry.penaltiesSaved}PKS`);
  if (entry.gameWinningGoals > 0) statPills.push(`${entry.gameWinningGoals}GW`);

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,10,28,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: exiting ? 'fadeOut 0.35s ease forwards' : 'fadeIn 0.2s ease both',
      }}
    >
      <style>{`
        @keyframes fadeOut { to { opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(0,10,28,0.97)',
          border: '0.5px solid rgba(201,168,76,0.35)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(201,168,76,0.12)',
          animation: 'cardUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Tricolor accent */}
        <div style={{ height: '3px', background: 'linear-gradient(to right, var(--blue), var(--gold), var(--red))' }} />

        <div style={{ padding: '20px 20px 0' }}>

          {/* Header: team logo + name + position */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            {entry.teamLogo && (
              <Image src={entry.teamLogo} alt={entry.teamName} width={32} height={32} style={{ objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'system-ui,-apple-system,sans-serif',
                fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em',
                color: 'var(--white)', lineHeight: 1.1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{entry.teamName}</div>
            </div>
            <span style={{
              fontSize: '8px', letterSpacing: '0.12em',
              color: entry.position === 'G' ? '#4ade80' : entry.position === 'D' ? '#60a5fa' : 'var(--muted)',
              border: `1px solid ${entry.position === 'G' ? 'rgba(74,222,128,0.3)' : entry.position === 'D' ? 'rgba(96,165,250,0.3)' : 'var(--muted-2)'}`,
              padding: '2px 5px', borderRadius: '2px', flexShrink: 0,
            }}>
              {pos}
            </span>
          </div>

          {/* Rank + Score */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
            <span style={{
              fontFamily: 'system-ui,-apple-system,sans-serif',
              fontSize: '48px', fontWeight: 200, color: 'var(--gold)',
              lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            }}>
              #{entry.rank}
            </span>
            <div>
              <div style={{
                fontFamily: 'system-ui,-apple-system,sans-serif',
                fontSize: '22px', fontWeight: 300, color: 'var(--white)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {entry.legacyScore}
              </div>
              <div style={{ fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.12em' }}>LEGACY PTS</div>
            </div>
          </div>

          {/* Stat pills */}
          {statPills.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {statPills.map(s => (
                <span key={s} style={{
                  fontSize: '10px', letterSpacing: '0.1em',
                  color: 'var(--gold)',
                  border: '0.5px solid rgba(201,168,76,0.35)',
                  background: 'rgba(201,168,76,0.07)',
                  padding: '3px 8px', borderRadius: '6px',
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Graph */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '8px 8px 4px',
            marginBottom: '14px',
          }}>
            {history === null ? (
              <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em' }}>LOADING…</div>
              </div>
            ) : history.length === 0 ? (
              <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em' }}>No match data yet</div>
              </div>
            ) : (
              <LegacyGraph history={history} />
            )}
          </div>

          {/* Match log */}
          {history && history.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              {history.map((m, i) => (
                <div key={m.fixtureId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: i < history.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                    {m.opponentLogo && (
                      <Image src={m.opponentLogo} alt={m.opponent} width={14} height={14} style={{ objectFit: 'contain', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      vs {m.opponent}
                    </span>
                    <span style={{
                      fontSize: '8px', color: 'var(--muted)', letterSpacing: '0.1em',
                      border: '0.5px solid var(--muted-2)', padding: '1px 4px', borderRadius: '2px', flexShrink: 0,
                    }}>
                      {roundShort(m.round)}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '12px', color: 'var(--gold)', fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: '8px',
                  }}>
                    +{m.legacyPts}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Reddit comment */}
          {redditComment && (
            <div style={{
              borderTop: '0.5px solid rgba(255,255,255,0.07)',
              paddingTop: '12px', marginBottom: '14px',
            }}>
              <p style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic',
                lineHeight: 1.6, margin: '0 0 5px 0',
              }}>
                &ldquo;{redditComment.body.length > 160 ? redditComment.body.slice(0, 160).trimEnd() + '…' : redditComment.body}&rdquo;
              </p>
              <span style={{ fontSize: '10px', color: 'var(--gold)', opacity: 0.75 }}>
                ↑ {redditComment.score.toLocaleString()} · u/{redditComment.author}
              </span>
            </div>
          )}
        </div>

        {/* Watermark footer */}
        <div style={{
          padding: '10px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            World Cup 2026 · Legacy
          </span>
          <span style={{ fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)' }}>
            Tap to close
          </span>
        </div>
      </div>
    </div>
  );
}
