'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { StandingEntry } from '../lib/api';

interface Props {
  groups: StandingEntry[][];
}

export default function GroupStandings({ groups }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (groups.length === 0) return null;

  const current = groups[activeIdx];
  const groupLetter = (g: StandingEntry[]) => g[0]?.group.replace('Group ', '') ?? '?';

  return (
    <div style={{ marginTop: '32px', borderTop: '0.5px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
      <p style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px', fontWeight: 500 }}>
        Group Standings
      </p>

      {/* ── Apple segmented control ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '2px',
        marginBottom: '16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        gap: '2px',
      }}>
        {groups.map((g, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              flex: '1 0 auto',
              minWidth: '28px',
              padding: '5px 8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '12px',
              fontWeight: i === activeIdx ? 600 : 400,
              letterSpacing: '0.02em',
              color: i === activeIdx ? 'var(--navy)' : 'var(--muted)',
              background: i === activeIdx
                ? 'var(--white)'
                : 'transparent',
              transition: 'background 0.18s ease, color 0.18s ease',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              boxShadow: i === activeIdx ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {groupLetter(g)}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '16px 1fr 22px 22px 22px 22px 30px 28px',
          gap: '4px', padding: '8px 12px',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.03)',
        }}>
          {['#', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts'].map(h => (
            <span key={h} style={{
              fontSize: '9px', letterSpacing: '0.1em', color: 'var(--muted)',
              textTransform: 'uppercase', textAlign: h === 'Team' ? 'left' : 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>{h}</span>
          ))}
        </div>

        {current.map((row, i) => {
          const qualifying = row.description === 'Round of 32';
          const gd = row.goalsDiff;
          const gdStr = gd > 0 ? `+${gd}` : String(gd);
          const gdColor = gd > 0 ? '#4ade80' : gd < 0 ? 'var(--red)' : 'var(--muted)';
          return (
            <div
              key={row.team.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 1fr 22px 22px 22px 22px 30px 28px',
                gap: '4px', padding: '9px 12px', alignItems: 'center',
                borderBottom: i < current.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                opacity: qualifying ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{row.rank}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                {row.team.logo && (
                  <Image src={row.team.logo} alt={row.team.name} width={14} height={14} style={{ objectFit: 'contain', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: '12px', color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                  {row.team.name}
                </span>
              </div>
              {[row.all.played, row.all.win, row.all.draw, row.all.lose].map((v, j) => (
                <span key={j} style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              ))}
              <span style={{ fontSize: '12px', color: gdColor, textAlign: 'center', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{gdStr}</span>
              <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{row.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
