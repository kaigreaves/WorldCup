'use client';

import { useState } from 'react';

const TABS = ['Matches', 'Performers', 'Fan Voice', 'Spotlight'];

export default function SectionTabs({ children }: { children: React.ReactNode[] }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--gold-border)',
        marginBottom: '32px',
        overflowX: 'auto',
      }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '14px 20px',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: active === i ? 'var(--gold)' : 'var(--muted)',
              borderBottom: active === i ? '2px solid var(--gold)' : '2px solid transparent',
              whiteSpace: 'nowrap' as const,
              flexShrink: 0,
              marginBottom: '-1px',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {children[active]}
    </div>
  );
}
