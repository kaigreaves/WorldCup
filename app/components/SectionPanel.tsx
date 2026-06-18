'use client';

import { useState, Children, useRef, useCallback } from 'react';

// ── Icons — outline (inactive) and filled (active) ────────────────────────────

const TABS = [
  {
    label: 'Legacy',
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M19.5 3H18V2a1 1 0 0 0-2 0v1H8V2a1 1 0 0 0-2 0v1H4.5a3.5 3.5 0 0 0-.5 6.964V9a7 7 0 0 0 6 6.93V17c0 .28-.11.51-.28.63C8.23 18.42 7 20.27 7 22h10c0-1.73-1.23-3.58-2.72-4.37A.76.76 0 0 1 14 17v-1.07A7 7 0 0 0 20 9v-.036A3.5 3.5 0 0 0 19.5 3Z" />
      </svg>
    ),
  },
  {
    label: 'Matches',
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M19 2h-1V1a1 1 0 0 0-2 0v1H8V1a1 1 0 0 0-2 0v1H5a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3Zm1 17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9h16v9Z" />
      </svg>
    ),
  },
  {
    label: 'Buzzing',
    outline: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
    filled: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2c-.28 0-.54.1-.72.28C9.1 4.5 8 6.9 8 9c0 .98.27 1.85.6 2.6A3.5 3.5 0 0 1 5 15a1 1 0 0 0-1 1c0 3.87 3.13 7 7 7s7-3.13 7-7c0-2.3-1.1-4.5-3-6.1C13.6 8.6 13 7.4 13 6a1 1 0 0 0-.65-.94A1 1 0 0 0 12 5V2Z" />
      </svg>
    ),
  },
];

export default function SectionPanel({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState<'right' | 'left' | null>(null);
  const panels = Children.toArray(children);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function go(i: number) {
    setSlideDir(i > active ? 'right' : 'left');
    setActive(i);
    setAnimKey(k => k + 1);
    setTimeout(() => {
      document.getElementById('section-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
  }

  // Swipe left/right — only trigger if horizontal angle < 45° AND the touch
  // didn't start inside a horizontally-scrollable child (e.g. GroupStandings
  // tab bar, MatchTicker, SectionTabs). Walk up from target; if any ancestor
  // within this panel has overflow-x: auto/scroll AND has overflow content,
  // let the child scroll handle it instead of switching tabs.
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    let el = e.target as HTMLElement | null;
    while (el && el !== e.currentTarget) {
      const ox = window.getComputedStyle(el).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth) return;
      el = el.parentElement;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 50) return;           // too short
    if (Math.abs(dy) > Math.abs(dx)) return; // more vertical than horizontal
    if (dx < 0 && active < TABS.length - 1) go(active + 1);
    if (dx > 0 && active > 0) go(active - 1);
  }, [active]);

  return (
    <>
      <div id="section-anchor" style={{ height: 0 }} />

      {/* ── Desktop horizontal tab strip ───────────────────────────────────── */}
      <div className="desktop-tabs">
        {TABS.map((tab, i) => (
          <button key={tab.label} onClick={() => go(i)} className={`desktop-tab-btn${active === i ? ' active' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Panel content ─────────────────────────────────────────────────── */}
      <div
        key={animKey}
        className="section-panel-content"
        style={{
          paddingBottom: '24px',
          animation: slideDir === 'right'
            ? 'slideInFromRight 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both'
            : slideDir === 'left'
            ? 'slideInFromLeft 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both'
            : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {panels[active]}
      </div>

      {/* ── Mobile fixed bottom nav ────────────────────────────────────────── */}
      <nav className="bottom-nav">
        {TABS.map((tab, i) => (
          <button key={tab.label} onClick={() => go(i)} className={`bottom-nav-btn${active === i ? ' active' : ''}`}>
            <span className="bottom-nav-icon">{active === i ? tab.filled : tab.outline}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
