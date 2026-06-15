import type { GreatnessEntry } from '../lib/api';
import { PlayerFanComment } from './RedditShell';

interface Props {
  entries: GreatnessEntry[];
}

export default function GreatnessLeaderboard({ entries }: Props) {
  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Hierarchy</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Greatness Leaderboard</h2>
        <div className="gold-line mt-4" />
      </div>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Tournament data loading.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {entries.map((entry, i) => (
            <LeaderboardRow key={entry.player.id} entry={entry} highlight={i < 3} />
          ))}
        </div>
      )}
    </section>
  );
}

function LeaderboardRow({ entry, highlight }: { entry: GreatnessEntry; highlight: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '44px 1fr auto',
      alignItems: 'start',
      gap: '16px',
      padding: '16px 20px',
      background: highlight ? 'var(--navy-2)' : 'transparent',
      border: highlight ? '1px solid var(--gold-border)' : '1px solid transparent',
      borderRadius: '2px',
    }}>
      <span className="rank" style={{ opacity: highlight ? 0.7 : 0.3, paddingTop: '2px', fontSize: '32px' }}>
        {String(entry.rank).padStart(2, '0')}
      </span>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          {entry.team.logo && (
            <img src={entry.team.logo} alt={entry.team.name} width={20} height={20} style={{ objectFit: 'contain', opacity: 0.85 }} />
          )}
          <span style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.25rem',
            fontWeight: highlight ? 500 : 400,
            color: highlight ? 'var(--white)' : 'rgba(255,255,255,0.8)',
          }}>
            {entry.player.name}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            {entry.team.name}
          </span>
        </div>

        {/* Real fan comment, falls back to editorial narrative */}
        <PlayerFanComment playerName={entry.player.name} fallback={entry.narrative} />
      </div>

      <div style={{ textAlign: 'right', minWidth: '120px' }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.6rem',
          fontWeight: 300,
          color: 'var(--gold)',
          lineHeight: 1,
        }}>
          {entry.score}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.08em', marginTop: '4px' }}>
          {entry.goals}G · {entry.assists}A · {entry.matches}P
        </div>
      </div>
    </div>
  );
}
