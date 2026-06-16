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
    <div style={{ marginTop: '32px', borderTop: '1px solid var(--gold-border)', paddingTop: '20px' }}>
      <p style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px', opacity: 0.6 }}>
        Group Standings
      </p>

      {/* Group tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
        {groups.map((g, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              padding: '3px 7px', fontSize: '9px', letterSpacing: '0.1em',
              fontFamily: 'Inter, sans-serif',
              background: i === activeIdx ? 'var(--gold)' : 'transparent',
              color: i === activeIdx ? 'var(--navy)' : 'var(--muted)',
              border: '1px solid', borderColor: i === activeIdx ? 'var(--gold)' : 'var(--gold-border)',
              borderRadius: '1px', cursor: 'pointer', fontWeight: i === activeIdx ? 600 : 400,
            }}
          >
            {groupLetter(g)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '16px 1fr 20px 20px 20px 20px 28px 24px',
          gap: '4px', padding: '0 0 6px',
          borderBottom: '1px solid var(--gold-border)', alignItems: 'center',
        }}>
          {['#', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts'].map(h => (
            <span key={h} style={{ fontSize: '8px', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', textAlign: h === 'Team' ? 'left' : 'center' }}>{h}</span>
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
                gridTemplateColumns: '16px 1fr 20px 20px 20px 20px 28px 24px',
                gap: '4px', padding: '6px 0', alignItems: 'center',
                borderBottom: i < current.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                opacity: qualifying ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>{row.rank}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                {row.team.logo && (
                  <Image src={row.team.logo} alt={row.team.name} width={14} height={14} style={{ objectFit: 'contain', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: '11px', color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.team.name}
                </span>
              </div>
              {[row.all.played, row.all.win, row.all.draw, row.all.lose].map((v, j) => (
                <span key={j} style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>{v}</span>
              ))}
              <span style={{ fontSize: '11px', color: gdColor, textAlign: 'center', fontWeight: 500 }}>{gdStr}</span>
              <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, textAlign: 'center' }}>{row.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
