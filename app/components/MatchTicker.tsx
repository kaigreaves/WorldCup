'use client';

import { useState, useMemo } from 'react';
import type { ApiFixture } from '../lib/api';

const FINISHED = new Set(['FT', 'AET', 'PEN']);
const LIVE = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE', 'SUSP']);

function dateKey(dateStr: string) {
  const d = new Date(dateStr);
  // Use local date formatted as YYYY-MM-DD for grouping
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MatchTicker({ fixtures }: { fixtures: ApiFixture[] }) {
  const days = useMemo(() => {
    const map = new Map<string, ApiFixture[]>();
    for (const f of fixtures) {
      const s = f.fixture.status.short;
      if (!FINISHED.has(s) && !LIVE.has(s)) continue;
      const key = dateKey(f.fixture.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, matches]) => ({
        key,
        label: dayLabel(matches[0].fixture.date),
        matches: matches.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()),
      }));
  }, [fixtures]);

  const [dayIndex, setDayIndex] = useState(() => Math.max(0, days.length - 1));

  if (days.length === 0) return null;

  const safeIndex = Math.min(dayIndex, days.length - 1);
  const current = days[safeIndex];

  return (
    <div style={{
      position: 'sticky',
      top: '64px',
      zIndex: 90,
      background: 'var(--navy)',
      borderBottom: '1px solid var(--gold-border)',
      display: 'flex',
      alignItems: 'center',
      height: '44px',
      gap: 0,
    }}>
      {/* Left nav */}
      <button
        onClick={() => setDayIndex(i => Math.max(0, i - 1))}
        disabled={safeIndex === 0}
        style={{
          flexShrink: 0,
          width: '36px',
          height: '100%',
          background: 'none',
          border: 'none',
          borderRight: '1px solid var(--gold-border)',
          color: safeIndex === 0 ? 'var(--muted-2)' : 'var(--gold)',
          cursor: safeIndex === 0 ? 'default' : 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ‹
      </button>

      {/* Day label */}
      <div style={{
        flexShrink: 0,
        padding: '0 12px',
        borderRight: '1px solid var(--gold-border)',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '9px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {current.label}
        </span>
      </div>

      {/* Matches row */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        padding: '0 4px',
        height: '100%',
        scrollbarWidth: 'none',
      }}>
        {current.matches.map(f => {
          const isLive = LIVE.has(f.fixture.status.short);
          const homeGoals = f.goals.home ?? 0;
          const awayGoals = f.goals.away ?? 0;
          return (
            <div key={f.fixture.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px',
              height: '100%',
              borderRight: '1px solid var(--gold-border)',
              flexShrink: 0,
            }}>
              {f.teams.home.logo && (
                <img src={f.teams.home.logo} alt={f.teams.home.name} width={16} height={16} style={{ objectFit: 'contain', opacity: 0.85 }} />
              )}
              <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {f.teams.home.name.split(' ').slice(-1)[0]}
              </span>
              <span style={{
                fontSize: '12px',
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 500,
                color: isLive ? '#4ade80' : 'var(--white)',
                letterSpacing: '0.05em',
                minWidth: '28px',
                textAlign: 'center',
              }}>
                {homeGoals}–{awayGoals}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {f.teams.away.name.split(' ').slice(-1)[0]}
              </span>
              {f.teams.away.logo && (
                <img src={f.teams.away.logo} alt={f.teams.away.name} width={16} height={16} style={{ objectFit: 'contain', opacity: 0.85 }} />
              )}
              {isLive && (
                <span style={{ fontSize: '8px', color: '#4ade80', letterSpacing: '0.1em' }}>
                  {f.fixture.status.elapsed ?? ''}′
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right nav */}
      <button
        onClick={() => setDayIndex(i => Math.min(days.length - 1, i + 1))}
        disabled={safeIndex === days.length - 1}
        style={{
          flexShrink: 0,
          width: '36px',
          height: '100%',
          background: 'none',
          border: 'none',
          borderLeft: '1px solid var(--gold-border)',
          color: safeIndex === days.length - 1 ? 'var(--muted-2)' : 'var(--gold)',
          cursor: safeIndex === days.length - 1 ? 'default' : 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ›
      </button>
    </div>
  );
}
