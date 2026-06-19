'use client';

import { useState, useEffect } from 'react';
import type { ApiFixture } from '../lib/api';

const STORAGE_KEY = 'wcs_last_visit';
const FINISHED = new Set(['FT', 'AET', 'PEN']);

function describeResult(f: ApiFixture): string {
  const home = f.teams.home.name;
  const away = f.teams.away.name;
  const hg = f.goals.home ?? 0;
  const ag = f.goals.away ?? 0;
  const diff = Math.abs(hg - ag);

  if (hg === ag) {
    return `${home} and ${away} played out a ${hg}–${ag} draw`;
  }

  const [winner, loser, wg, lg] = hg > ag
    ? [home, away, hg, ag]
    : [away, home, ag, hg];

  if (diff >= 3) return `${winner} hammered ${loser} ${wg}–${lg}`;
  if (diff === 1) return `${winner} edged past ${loser} ${wg}–${lg}`;
  return `${winner} beat ${loser} ${wg}–${lg}`;
}

function buildRecap(fixtures: ApiFixture[], since: number): string {
  const newResults = fixtures.filter(f =>
    FINISHED.has(f.fixture.status.short) &&
    new Date(f.fixture.date).getTime() > since
  );

  if (newResults.length === 0) return '';

  if (newResults.length === 1) {
    return `You missed one — ${describeResult(newResults[0])}.`;
  }

  if (newResults.length === 2) {
    return `Two while you were gone: ${describeResult(newResults[0])}, and ${describeResult(newResults[1])}.`;
  }

  const first = describeResult(newResults[0]);
  const rest = newResults.length - 1;
  return `It's been busy — ${first}, plus ${rest} more result${rest > 1 ? 's' : ''} since your last visit.`;
}

export default function RecapBanner({ fixtures }: { fixtures: ApiFixture[] }) {
  const [recap, setRecap] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const since = raw ? parseInt(raw, 10) : 0;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    if (since > 0) {
      const text = buildRecap(fixtures, since);
      if (text) setRecap(text);
    }
  }, []);

  if (!recap || dismissed) return null;

  return (
    <div style={{
      background: 'rgba(201,168,76,0.05)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderBottom: '0.5px solid rgba(201,168,76,0.2)',
      padding: '10px clamp(20px, 4vw, 40px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
        {recap}
      </p>
      <button
        onClick={() => setDismissed(true)}
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', padding: '0 4px', lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
