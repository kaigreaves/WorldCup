'use client';

import { useState, useEffect } from 'react';
import type { ApiFixture } from '../lib/api';

const STORAGE_KEY = 'wcs_last_visit';
const FINISHED = new Set(['FT', 'AET', 'PEN']);

function buildRecap(fixtures: ApiFixture[], since: number): string {
  const newResults = fixtures.filter(f => {
    if (!FINISHED.has(f.fixture.status.short)) return false;
    return new Date(f.fixture.date).getTime() > since;
  });

  if (newResults.length === 0) return '';

  const parts = newResults.map(f => {
    const home = f.teams.home.name;
    const away = f.teams.away.name;
    const hg = f.goals.home ?? 0;
    const ag = f.goals.away ?? 0;
    if (hg > ag) return `${home} beat ${away} ${hg}–${ag}`;
    if (ag > hg) return `${away} beat ${home} ${ag}–${hg}`;
    return `${home} drew ${hg}–${ag} with ${away}`;
  });

  if (parts.length === 1) return `While you were away: ${parts[0]}.`;
  const last = parts.pop();
  return `While you were away: ${parts.join(', ')}, and ${last}.`;
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
      background: 'rgba(212,175,55,0.08)',
      borderBottom: '1px solid var(--gold-border)',
      padding: '10px clamp(20px, 4vw, 40px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
        {recap}
      </p>
      <button
        onClick={() => setDismissed(true)}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 4px',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
