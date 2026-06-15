'use client';

import { useState, Children } from 'react';

const TABS = ['Story', 'Matches', 'Performers', 'Fan Voice', 'Spotlight'];

export default function SectionPanel({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  // Children may arrive as a nested array — flatten to a guaranteed flat list
  const panels = Children.toArray(children);

  return (
    <>
      {/* Active section content */}
      <div style={{ paddingBottom: '24px' }}>
        {panels[active]}
      </div>

      {/* Fixed bottom bar */}
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
