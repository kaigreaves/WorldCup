'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import { subscribeReddit } from '../lib/reddit-store';
import type { LegacyMoment } from '../lib/api';
import type { RedditComment } from '../lib/reddit-client';

const SESSION_KEY = 'wcs_moment_shown';
const DISPLAY_DURATION = 10000; // ms before auto-dismiss

function formatRound(round: string): string {
  const r = round.toLowerCase();
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter') && !r.includes('3rd')) return 'THE FINAL';
  if (r.includes('semi')) return 'SEMI-FINAL';
  if (r.includes('quarter')) return 'QUARTER-FINAL';
  if (r.includes('16')) return 'ROUND OF 16';
  if (r.includes('32')) return 'ROUND OF 32';
  return 'GROUP STAGE';
}

function formatMultiplier(m: number): string {
  if (m === 1.0) return '×1.0';
  return `×${m.toFixed(1)}`;
}

function RankArrow({ before, after }: { before: number; after: number }) {
  if (before === after) {
    return (
      <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Held #{after}</span>
    );
  }
  const moved = before - after;
  const improved = moved > 0;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ color: 'var(--muted)', fontSize: '13px' }}>#{before}</span>
      <span style={{ color: improved ? '#4ade80' : 'var(--red)', fontSize: '16px', lineHeight: 1 }}>
        {improved ? '↑' : '↓'}
      </span>
      <span style={{ color: improved ? '#4ade80' : 'var(--red)', fontSize: '13px', fontWeight: 600 }}>
        #{after}
      </span>
      {improved && (
        <span style={{ fontSize: '10px', color: 'rgba(74,222,128,0.7)', letterSpacing: '0.08em' }}>
          +{moved} spot{moved > 1 ? 's' : ''}
        </span>
      )}
    </span>
  );
}

export default function LegacyMomentSplash({ moment }: { moment: LegacyMoment }) {
  const [visible, setVisible] = useState(false);

  // useLayoutEffect runs synchronously before the browser paints —
  // no visible flash between "app behind" and "splash on top".
  useLayoutEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(true);
  }, []);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [redditComment, setRedditComment] = useState<RedditComment | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  useEffect(() => {
    if (!visible) return;

    // Progress bar countdown
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DISPLAY_DURATION) * 100);
      setProgress(pct);
    }, 50);

    timerRef.current = setTimeout(() => dismiss(), DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    return subscribeReddit(data => {
      const lower = moment.playerName.toLowerCase();
      const lastName = lower.split(' ').pop() ?? lower;
      const comment = data.playerComments[lower] ?? data.playerComments[lastName];
      if (comment) setRedditComment(comment);
    });
  }, [moment.playerName]);

  function dismiss() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => setVisible(false), 400);
  }

  if (!visible) return null;

  const scoreStr = `${moment.homeScore}–${moment.awayScore}`;
  const round = formatRound(moment.round);
  const multiplier = formatMultiplier(moment.stageMultiplier);
  const label = moment.isTodayMoment ? 'LEGACY MOMENT OF THE DAY' : 'LEGACY MOMENT OF THE TOURNAMENT';

  const statBadges: string[] = [];
  if (moment.hatTrick) statBadges.push('HAT-TRICK');
  if (moment.gameWinningGoals > 0) statBadges.push('GAME WINNER');
  if (moment.equalizerGoals > 0) statBadges.push('EQUALIZER');
  if (moment.cleanSheet) statBadges.push('CLEAN SHEET');
  if (moment.penaltiesSaved > 0) statBadges.push(`${moment.penaltiesSaved} PK SAVED`);

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--navy)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: exiting ? 'fadeOut 0.4s ease forwards' : 'none',
      }}
    >
      <style>{`
        @keyframes fadeOut { to { opacity: 0; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(0,10,28,0.95)',
          border: '0.5px solid rgba(201,168,76,0.4)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(201,168,76,0.15)',
          animation: 'none',
        }}
      >
        {/* Gold top accent */}
        <div style={{ height: '3px', background: 'linear-gradient(to right, var(--blue), var(--gold), var(--red))' }} />

        <div style={{ padding: '24px 24px 0' }}>
          {/* Label */}
          <p style={{
            fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--gold)', fontWeight: 600, margin: '0 0 20px 0',
          }}>
            {label}
          </p>

          {/* Player */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {moment.teamLogo && (
              <Image src={moment.teamLogo} alt={moment.teamName} width={36} height={36} style={{ objectFit: 'contain', flexShrink: 0 }} />
            )}
            <div>
              <div style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em',
                color: 'var(--white)', lineHeight: 1.1,
              }}>
                {moment.playerName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', letterSpacing: '0.04em' }}>
                {moment.teamName}
              </div>
            </div>
          </div>

          {/* Match context */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px', marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              {moment.opponentLogo && (
                <Image src={moment.opponentLogo} alt={moment.opponent} width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                vs {moment.opponent}
              </span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 300, color: 'var(--white)', flexShrink: 0, letterSpacing: '0.06em' }}>
              {scoreStr}
            </span>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--gold)', textTransform: 'uppercase' }}>{round}</div>
              <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.06em' }}>{multiplier} weight</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {moment.goals > 0 && (
              <StatPill label={`${moment.goals} ${moment.goals === 1 ? 'Goal' : 'Goals'}`} highlight />
            )}
            {moment.assists > 0 && (
              <StatPill label={`${moment.assists} ${moment.assists === 1 ? 'Assist' : 'Assists'}`} />
            )}
            {statBadges.map(b => <StatPill key={b} label={b} />)}
            {moment.matchRating && (
              <StatPill label={`Rating ${moment.matchRating}`} highlight />
            )}
          </div>

          {/* Legacy impact */}
          <div style={{
            background: 'rgba(201,168,76,0.06)', border: '0.5px solid rgba(201,168,76,0.25)',
            borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                Legacy Impact
              </span>
              <span style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '22px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1,
              }}>
                +{moment.legacyPtsGained} pts
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em' }}>RANKINGS</span>
              <RankArrow before={moment.rankBefore} after={moment.rankAfter} />
            </div>
          </div>

          {/* Reddit comment */}
          {redditComment && (
            <div style={{
              borderTop: '0.5px solid rgba(255,255,255,0.08)',
              paddingTop: '14px', marginBottom: '16px',
            }}>
              <p style={{
                fontSize: '12px', color: 'rgba(255,255,255,0.72)', fontStyle: 'italic',
                lineHeight: 1.6, margin: '0 0 6px 0',
              }}>
                &ldquo;{redditComment.body.length > 200 ? redditComment.body.slice(0, 200).trimEnd() + '…' : redditComment.body}&rdquo;
              </p>
              <span style={{ fontSize: '10px', color: 'var(--gold)', opacity: 0.8 }}>
                ↑ {redditComment.score.toLocaleString()} · u/{redditComment.author}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar + tap to skip */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'var(--gold)', borderRadius: '1px',
                width: `${progress}%`, transition: 'width 0.1s linear',
              }} />
            </div>
            <span style={{
              marginLeft: '14px', fontSize: '10px', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--muted)', flexShrink: 0,
            }}>
              Tap to continue
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <span style={{
      fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
      color: highlight ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
      border: `0.5px solid ${highlight ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.12)'}`,
      background: highlight ? 'rgba(201,168,76,0.07)' : 'transparent',
      padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
