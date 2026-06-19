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

interface GraphPoint { cumulativePts: number; legacyPts: number; round: string; }

function LegacyGraph({ history, rank, skeleton = false }: { history: GraphPoint[]; rank: number; skeleton?: boolean }) {
  // Always start from 0 at tournament start
  const pts: GraphPoint[] = [{ cumulativePts: 0, legacyPts: 0, round: 'START' }, ...history];

  const W = 320;
  const H = 90;
  const PAD = { top: 24, right: 16, bottom: 24, left: 16 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxPts = Math.max(...pts.map(m => m.cumulativePts), 1);
  const points = pts.map((m, i) => ({
    x: PAD.left + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * innerW),
    y: PAD.top + innerH - (m.cumulativePts / maxPts) * innerH,
    m,
  }));

  function pathD(ps: typeof points): string {
    if (ps.length === 1) return `M ${ps[0].x} ${ps[0].y}`;
    let d = `M ${ps[0].x} ${ps[0].y}`;
    for (let i = 1; i < ps.length; i++) {
      const prev = ps[i - 1];
      const curr = ps[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.45;
      const cp2x = curr.x - (curr.x - prev.x) * 0.45;
      d += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  const linePath = pathD(points);
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', opacity: skeleton ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
      <defs>
        <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(201,168,76,0.25)" />
          <stop offset="100%" stopColor="rgba(201,168,76,0)" />
        </linearGradient>
      </defs>

      <path d={fillPath} fill="url(#graphFill)" />
      <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />

      {points.map(({ x, y, m }, i) => {
        const isStart = i === 0;
        const isLast = i === points.length - 1;
        return (
          <g key={i}>
            {/* Label above dot: rank on last point, nothing on intermediate, nothing on start */}
            {isLast && (
              <text x={x} y={y - 8} textAnchor="middle" fontSize="9"
                fill="rgba(201,168,76,1)" fontFamily="system-ui,-apple-system,sans-serif" fontWeight="700"
                letterSpacing="-0.02em">
                #{rank}
              </text>
            )}
            <circle cx={x} cy={y} r={isLast ? 4 : isStart ? 2 : 2.5}
              fill={isLast ? 'var(--gold)' : isStart ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.6)'}
              opacity="0.95" />
            <text x={x} y={H - PAD.bottom + 13} textAnchor="middle" fontSize="7"
              fill="rgba(255,255,255,0.4)" fontFamily="system-ui,-apple-system,sans-serif" letterSpacing="0.05em">
              {isStart ? 'KO' : roundShort(m.round)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Share card generator ──────────────────────────────────────────────────────

async function shareCard(entry: LegacyEntry, statPills: string[], history: PlayerMatchStat[] | null) {
  try { navigator.vibrate?.(10); } catch {}

  // Portrait card matching the on-screen player card shape
  const SCALE = 2; // retina
  const W = 400, H = 580;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Rounded card background
  const R = 20;
  ctx.beginPath();
  ctx.moveTo(R, 0); ctx.lineTo(W - R, 0);
  ctx.quadraticCurveTo(W, 0, W, R);
  ctx.lineTo(W, H - R); ctx.quadraticCurveTo(W, H, W - R, H);
  ctx.lineTo(R, H); ctx.quadraticCurveTo(0, H, 0, H - R);
  ctx.lineTo(0, R); ctx.quadraticCurveTo(0, 0, R, 0);
  ctx.closePath();
  ctx.save(); ctx.clip();

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#000A1C');
  bg.addColorStop(1, '#001030');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow top-right
  const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W * 0.7);
  glow.addColorStop(0, 'rgba(0,35,149,0.3)');
  glow.addColorStop(1, 'rgba(0,35,149,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Ghost rank number (background)
  ctx.font = `200 ${entry.rank < 10 ? 220 : 180}px -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(201,168,76,0.05)';
  ctx.textAlign = 'right';
  ctx.fillText(`#${entry.rank}`, W + 10, H - 10);

  // Tricolor stripe at top
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0, '#0023A0');
  stripe.addColorStop(0.45, '#C9A84C');
  stripe.addColorStop(1, '#EF3340');
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, W, 3);

  const PAD = 28;

  // Eyebrow
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(201,168,76,0.75)';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0.12em';
  ctx.fillText('FIFA WORLD CUP 2026  ·  LEGACY', PAD, 30);
  ctx.letterSpacing = '0em';

  // Player name
  const nameFontSize = entry.name.length > 14 ? 34 : entry.name.length > 10 ? 40 : 46;
  ctx.font = `700 ${nameFontSize}px -apple-system, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(entry.name, PAD, 80);

  // Team name + position
  ctx.font = '400 14px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(entry.teamName, PAD, 102);

  const pos = entry.position === 'G' ? 'GK' : entry.position === 'D' ? 'DEF' : entry.position === 'M' ? 'MID' : 'FWD';
  ctx.font = '500 9px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const teamW = ctx.measureText(entry.teamName).width;
  ctx.fillText(`  ·  ${pos}`, PAD + teamW + 2, 102);

  // Rank + score row
  ctx.font = '200 72px -apple-system, sans-serif';
  ctx.fillStyle = '#C9A84C';
  ctx.textAlign = 'left';
  ctx.fillText(`#${entry.rank}`, PAD, 178);

  const rankW = ctx.measureText(`#${entry.rank}`).width;
  ctx.font = '300 36px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`${entry.legacyScore}`, PAD + rankW + 16, 170);

  ctx.font = '500 8px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.letterSpacing = '0.1em';
  ctx.fillText('LEGACY PTS', PAD + rankW + 18, 186);
  ctx.letterSpacing = '0em';

  // Stat pills
  let pillX = PAD;
  const pillY = 212;
  ctx.font = '600 11px -apple-system, sans-serif';
  for (const stat of statPills.slice(0, 5)) {
    const tw = ctx.measureText(stat).width;
    const pw = tw + 16, ph = 20, pr = 5;
    ctx.fillStyle = 'rgba(201,168,76,0.1)';
    ctx.strokeStyle = 'rgba(201,168,76,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY - ph + 5, pw, ph, pr);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C9A84C';
    ctx.fillText(stat, pillX + 8, pillY);
    pillX += pw + 8;
  }

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(PAD, 238); ctx.lineTo(W - PAD, 238); ctx.stroke();

  // Match history (up to 5)
  if (history && history.length > 0) {
    const matches = history.slice(-5);
    const rowH = 34;
    matches.forEach((m, i) => {
      const y = 258 + i * rowH;
      // Round badge
      const round = (() => {
        const r = m.round.toLowerCase();
        if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 'FINAL';
        if (r.includes('semi')) return 'SF';
        if (r.includes('quarter')) return 'QF';
        if (r.includes('16')) return 'R16';
        if (r.includes('32')) return 'R32';
        return 'GS';
      })();

      ctx.font = '400 12px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.textAlign = 'left';
      ctx.fillText(`vs ${m.opponent}`, PAD, y + 14);

      ctx.font = '500 8px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const vsW = ctx.measureText(`vs ${m.opponent}`).width;
      ctx.fillText(` · ${round}`, PAD + vsW, y + 14);

      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.fillStyle = '#C9A84C';
      ctx.textAlign = 'right';
      ctx.fillText(`+${m.legacyPts}`, W - PAD, y + 14);

      if (i < matches.length - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(PAD, y + rowH - 2); ctx.lineTo(W - PAD, y + rowH - 2); ctx.stroke();
      }
    });
  }

  // Watermark
  ctx.font = '400 9px -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.textAlign = 'left';
  ctx.fillText('glacier.sports', PAD, H - 16);

  ctx.restore();

  // Share or download
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${entry.name.replace(/\s/g, '-')}-legacy.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `${entry.name} — Legacy Tracker`, text: `${entry.name} is ranked #${entry.rank} with ${entry.legacyScore} legacy pts at the 2026 World Cup` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, 'image/png');
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlayerCard({
  entry,
  onClose,
  preloadedHistory = null,
}: {
  entry: LegacyEntry;
  onClose: () => void;
  preloadedHistory?: PlayerMatchStat[] | null;
}) {
  const [history, setHistory] = useState<PlayerMatchStat[] | null>(preloadedHistory);
  const [exiting, setExiting] = useState(false);
  const [redditComment, setRedditComment] = useState<RedditComment | null>(null);

  // Fetch match history only if not already preloaded
  useEffect(() => {
    if (preloadedHistory !== null) return;
    fetch(`/api/player/${entry.playerId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { matchHistory: PlayerMatchStat[] } | null) => {
        if (data) setHistory(data.matchHistory);
      })
      .catch(() => setHistory([]));
  }, [entry.playerId, preloadedHistory]);

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
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
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
          margin: 'auto',
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

          {/* Graph — show instant skeleton from 0→current while real data loads */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '8px 8px 4px',
            marginBottom: '14px',
          }}>
            {history === null ? (
              // Instant skeleton: straight line from 0 to current score
              entry.legacyScore > 0
                ? <LegacyGraph history={[{ cumulativePts: entry.legacyScore, legacyPts: entry.legacyScore, round: 'now' }]} rank={entry.rank} skeleton />
                : <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em' }}>LOADING…</div>
                  </div>
            ) : history.length === 0 ? (
              <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em' }}>No match data yet</div>
              </div>
            ) : (
              <LegacyGraph history={history} rank={entry.rank} />
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

        {/* Footer — share + close */}
        <div style={{
          padding: '10px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            World Cup 2026 · Legacy
          </span>
          <button
            onClick={e => { e.stopPropagation(); shareCard(entry, statPills, history); }}
            style={{
              background: 'rgba(201,168,76,0.1)',
              border: '0.5px solid rgba(201,168,76,0.3)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
