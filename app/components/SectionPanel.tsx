'use client';

import { useState, Children } from 'react';

const TABS = ['Story', 'Matches', 'Performers', 'Fan Voice', 'Spotlight'];

export default function SectionPanel({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const panels = Children.toArray(children);

  function scrollToRankings() {
    document.getElementById('mobile-rankings')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      {/* Active section content */}
      <div style={{ paddingBottom: '24px' }}>
        {panels[active]}
      </div>

      {/* Fixed bottom nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '58px',
        background: 'var(--navy)',
        borderTop: '1px solid var(--gold-border)',
        display: 'flex',
        zIndex: 300,
      }}>
        {/* Rankings shortcut — shown on mobile via CSS, scrolls to leaderboard */}
        <button
          onClick={scrollToRankings}
          className="rankings-tab"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            borderTop: '2px solid var(--gold)',
            cursor: 'pointer',
            fontSize: '9px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            padding: '0 4px',
          }}
        >
          Rankings
        </button>

        {TABS.map((tab, i) => {
          const isActive = active === i;
          return (
            <button
              key={tab}
              onClick={() => setActive(i)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderTop: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '9px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
                color: isActive ? 'var(--gold)' : 'var(--muted)',
                fontFamily: 'Inter, sans-serif',
                fontWeight: isActive ? 500 : 300,
                padding: '0 4px',
              }}
            >
              {tab}
            </button>
          );
        })}
      </nav>
    </>
  );
}
