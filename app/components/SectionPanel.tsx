'use client';

import { useState, Children } from 'react';

const TABS = ['Legacy', 'Matches', 'Buzzing'];

export default function SectionPanel({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const panels = Children.toArray(children);

  function go(i: number) {
    setActive(i);
    setAnimKey(k => k + 1);
    // Scroll so the content is centred on screen, not buried below the fold.
    // Use the always-rendered anchor — desktop-tabs has display:none on mobile,
    // and scrollIntoView is a no-op on elements with no layout box.
    setTimeout(() => {
      document.getElementById('section-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
  }

  return (
    <>
      {/* Always-rendered scroll target (desktop-tabs below is display:none on mobile,
          so scrollIntoView on it silently fails there) */}
      <div id="section-anchor" style={{ height: 0 }} />

      {/* ── Desktop horizontal tab strip ───────────────────────────────────── */}
      <div className="desktop-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => go(i)}
            className={`desktop-tab-btn${active === i ? ' active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Panel content ─────────────────────────────────────────────────── */}
      <div key={animKey} className="section-panel-content" style={{ paddingBottom: '80px' }}>
        {panels[active]}
      </div>

      {/* ── Mobile fixed bottom nav ────────────────────────────────────────── */}
      <nav className="bottom-nav">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => go(i)}
            className={`bottom-nav-btn${active === i ? ' active' : ''}`}>
            {tab}
          </button>
        ))}
      </nav>
    </>
  );
}
