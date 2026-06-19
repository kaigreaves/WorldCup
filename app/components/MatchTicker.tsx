'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ApiFixture } from '../lib/api';

const FINISHED = new Set(['FT', 'AET', 'PEN']);
const LIVE = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE', 'SUSP']);

const TEAM_TLA: Record<string, string> = {
  'France': 'FRA', 'Argentina': 'ARG', 'Brazil': 'BRA', 'Germany': 'GER',
  'Spain': 'ESP', 'England': 'ENG', 'Portugal': 'POR', 'Netherlands': 'NED',
  'Belgium': 'BEL', 'Croatia': 'CRO', 'Uruguay': 'URU', 'Mexico': 'MEX',
  'United States': 'USA', 'Canada': 'CAN', 'Japan': 'JPN', 'South Korea': 'KOR',
  'Morocco': 'MAR', 'Senegal': 'SEN', 'Nigeria': 'NGA', 'Egypt': 'EGY',
  'Saudi Arabia': 'KSA', 'Iran': 'IRN', 'Australia': 'AUS', 'Poland': 'POL',
  'Switzerland': 'SUI', 'Denmark': 'DEN', 'Sweden': 'SWE', 'Serbia': 'SRB',
  'Colombia': 'COL', 'Ecuador': 'ECU', 'Peru': 'PER', 'Chile': 'CHI',
  'Cameroon': 'CMR', 'Ghana': 'GHA', 'Tunisia': 'TUN', 'Algeria': 'ALG',
  'Turkey': 'TUR', 'Czech Republic': 'CZE', 'Czechia': 'CZE', 'Slovakia': 'SVK',
  'Austria': 'AUT', 'Hungary': 'HUN', 'Romania': 'ROU', 'Ukraine': 'UKR',
  'Scotland': 'SCO', 'Wales': 'WAL', 'Iceland': 'ISL', 'Norway': 'NOR',
  'Costa Rica': 'CRC', 'Panama': 'PAN', 'Honduras': 'HON', 'Jamaica': 'JAM',
  'New Zealand': 'NZL', 'South Africa': 'RSA', 'Ivory Coast': 'CIV',
  'Bolivia': 'BOL', 'Paraguay': 'PAR', 'Venezuela': 'VEN', 'Indonesia': 'IDN',
  'Iraq': 'IRQ', 'Qatar': 'QAT', 'Jordan': 'JOR', 'Georgia': 'GEO',
  'Albania': 'ALB', 'Slovenia': 'SVN', 'North Macedonia': 'MKD',
  'Bosnia and Herzegovina': 'BIH', 'Luxembourg': 'LUX', 'Armenia': 'ARM',
  'Faeroe Islands': 'FRO', 'Guatemala': 'GUA', 'Trinidad and Tobago': 'TRI',
  'Congo DR': 'COD', 'Islands': 'ISL',
};

function teamAbbr(name: string): string {
  if (TEAM_TLA[name]) return TEAM_TLA[name];
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  return name.slice(0, 3).toUpperCase();
}

function dateKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MatchTicker({ fixtures }: { fixtures: ApiFixture[] }) {
  const router = useRouter();
  const todayKey = useMemo(() => dateKey(new Date().toISOString()), []);

  const hasLive = useMemo(() => fixtures.some(f => LIVE.has(f.fixture.status.short)), [fixtures]);

  useEffect(() => {
    if (!hasLive) return;
    const interval = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(interval);
  }, [hasLive, router]);

  const days = useMemo(() => {
    const map = new Map<string, ApiFixture[]>();
    for (const f of fixtures) {
      const s = f.fixture.status.short;
      const key = dateKey(f.fixture.date);
      // Show finished/live matches for any day, plus today's matches regardless of status
      // (so today's slate appears even before kickoff)
      if (!FINISHED.has(s) && !LIVE.has(s) && key !== todayKey) continue;
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
  }, [fixtures, todayKey]);

  const todayIndex = days.findIndex(d => d.key === todayKey);
  const [dayIndex, setDayIndex] = useState(() => (todayIndex >= 0 ? todayIndex : Math.max(0, days.length - 1)));

  if (days.length === 0) return null;

  const safeIndex = Math.min(dayIndex, days.length - 1);
  const current = days[safeIndex];

  return (
    <div style={{
      position: 'sticky', top: 'calc(56px + env(safe-area-inset-top))', zIndex: 90,
      background: 'rgba(0,5,16,0.80)',
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      borderBottom: '0.5px solid rgba(201,168,76,0.15)',
      display: 'flex', alignItems: 'center', height: '48px', gap: '6px',
      padding: '0 8px',
    }}>
      {/* Prev day arrow — circular glass button */}
      <button
        onClick={() => setDayIndex(i => Math.max(0, i - 1))}
        disabled={safeIndex === 0}
        style={{
          flexShrink: 0, width: '28px', height: '28px', border: 'none',
          borderRadius: '50%',
          background: safeIndex === 0 ? 'transparent' : 'rgba(255,255,255,0.06)',
          color: safeIndex === 0 ? 'rgba(255,255,255,0.15)' : 'var(--gold)',
          cursor: safeIndex === 0 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', lineHeight: 1,
          transition: 'background 0.15s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >‹</button>

      {/* Date pill chip */}
      <div style={{ flexShrink: 0 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap',
          background: 'rgba(201,168,76,0.10)',
          border: '0.5px solid rgba(201,168,76,0.28)',
          borderRadius: '999px',
          padding: '3px 9px',
        }}>
          {current.label}
        </span>
      </div>

      {/* Scrollable match strip */}
      <div style={{
        flex: 1, overflowX: 'auto', display: 'flex', alignItems: 'center',
        gap: '2px', padding: '0 2px', height: '100%', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {current.matches.map((f, idx) => {
          const isLive = LIVE.has(f.fixture.status.short);
          const notStarted = f.fixture.status.short === 'NS';
          const homeGoals = f.goals.home ?? 0;
          const awayGoals = f.goals.away ?? 0;
          const kickoff = notStarted
            ? new Date(f.fixture.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : null;
          return (
            <div key={f.fixture.id} style={{ display: 'contents' }}>
              {idx > 0 && (
                <span style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
                borderRadius: '999px',
                background: isLive ? 'rgba(74,222,128,0.07)' : 'transparent',
                flexShrink: 0,
              }}>
                {f.teams.home.logo && (
                  <Image src={f.teams.home.logo} alt="" width={13} height={13} style={{ objectFit: 'contain', opacity: 0.85 }} />
                )}
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', whiteSpace: 'nowrap', letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {teamAbbr(f.teams.home.name)}
                </span>
                <span style={{
                  fontSize: notStarted ? '10px' : '11.5px',
                  fontWeight: notStarted ? 400 : 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: isLive ? '#4ade80' : notStarted ? 'var(--gold)' : 'var(--white)',
                  letterSpacing: notStarted ? '0.02em' : '-0.01em',
                  minWidth: '30px', textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {notStarted ? kickoff : `${homeGoals}–${awayGoals}`}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', whiteSpace: 'nowrap', letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {teamAbbr(f.teams.away.name)}
                </span>
                {f.teams.away.logo && (
                  <Image src={f.teams.away.logo} alt="" width={13} height={13} style={{ objectFit: 'contain', opacity: 0.85 }} />
                )}
                {isLive && (
                  <span style={{ fontSize: '8px', color: '#4ade80', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>
                    {f.fixture.status.elapsed ?? ''}′
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next day arrow */}
      <button
        onClick={() => setDayIndex(i => Math.min(days.length - 1, i + 1))}
        disabled={safeIndex === days.length - 1}
        style={{
          flexShrink: 0, width: '28px', height: '28px', border: 'none',
          borderRadius: '50%',
          background: safeIndex === days.length - 1 ? 'transparent' : 'rgba(255,255,255,0.06)',
          color: safeIndex === days.length - 1 ? 'rgba(255,255,255,0.15)' : 'var(--gold)',
          cursor: safeIndex === days.length - 1 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', lineHeight: 1,
          transition: 'background 0.15s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >›</button>
    </div>
  );
}
