import type { GreatnessEntry } from '../lib/api';

export default function GreatnessLeaderboard({
  entries,
  compact = false,
}: {
  entries: GreatnessEntry[];
  compact?: boolean;
}) {
  return (
    <section>
      <div style={{ marginBottom: compact ? '20px' : '2rem' }}>
        <p className="label" style={{ marginBottom: '8px' }}>The Hierarchy</p>
        <h2 style={{ fontSize: compact ? '1.3rem' : '2.5rem', color: 'var(--white)', margin: 0 }}>
          Legacy Leaderboard
        </h2>
        <div className="gold-line" style={{ marginTop: '12px' }} />
      </div>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '13px' }}>Tournament data loading.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {entries.map((entry, i) => (
            <LeaderboardRow key={entry.player.id} entry={entry} highlight={i < 3} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}

function LeaderboardRow({
  entry,
  highlight,
  compact,
}: {
  entry: GreatnessEntry;
  highlight: boolean;
  compact: boolean;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? '32px 1fr auto' : '52px 1fr auto',
      alignItems: 'center',
      gap: compact ? '10px' : '20px',
      padding: compact ? '12px 8px' : '22px 24px',
      background: highlight ? 'var(--navy-2)' : 'transparent',
      borderLeft: highlight ? '2px solid var(--gold)' : '2px solid transparent',
      borderRadius: '1px',
    }}>
      {/* Rank */}
      <span style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: compact ? '1rem' : '2.6rem',
        fontWeight: 300,
        color: 'var(--gold)',
        opacity: highlight ? 0.7 : 0.3,
        lineHeight: 1,
        textAlign: 'center',
      }}>
        {entry.rank}
      </span>

      {/* Player */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          {entry.team.logo && (
            <img
              src={entry.team.logo}
              alt={entry.team.name}
              width={compact ? 14 : 18}
              height={compact ? 14 : 18}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <span style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: compact ? '0.95rem' : '1.2rem',
            fontWeight: highlight ? 500 : 400,
            color: highlight ? 'var(--white)' : 'rgba(255,255,255,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {entry.player.name}
          </span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
          {entry.goals}G · {entry.assists}A · {entry.matches}P
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: compact ? '1.1rem' : '1.5rem',
          fontWeight: 300,
          color: 'var(--gold)',
          lineHeight: 1,
        }}>
          {entry.score}
        </div>
      </div>
    </div>
  );
}
