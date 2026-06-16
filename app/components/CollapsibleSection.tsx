'use client';

import { useState } from 'react';

interface Props {
  label: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({ label, title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'block',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <p className="label mb-3">{label}</p>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--white)', margin: 0 }}>{title}</h2>
          </div>
          <span style={{
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            paddingBottom: '6px',
            flexShrink: 0,
          }}>
            {open ? 'Collapse ↑' : 'Expand ↓'}
          </span>
        </div>
        <div className="gold-line" />
      </button>

      {open && (
        <div style={{ marginTop: '2rem' }}>
          {children}
        </div>
      )}
    </section>
  );
}
