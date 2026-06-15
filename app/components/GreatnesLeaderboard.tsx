import type { GreatnessEntry } from '../lib/api';
import { PlayerFanComment } from './RedditShell';

export default function GreatnessLeaderboard({ entries }: { entries: GreatnessEntry[] }) {
  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Hierarchy</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Legacy Leaderboard</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          Who is helping their legacy most — goals, assists, appearances, weighted by impact
        </p>
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
      gridTemplateColumns: '52px 1fr auto',
      alignItems: 'start',
      gap: '20px',
      padding: '22px 24px',
      background: highlight ? 'var(--navy-2)' : 'transparent',
      border: highlight ? '1px solid var(--gold-border)' : '1px solid transparent',
      borderRadius: '2px',
    }}>
      <span className="rank" style={{ opacity: highlight ? 0.7 : 0.25, paddingTop: '2px' }}>
        {String(entry.rank).padStart(2, '0')}
      </span>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          {entry.team.logo && (
            <img src={entry.team.logo} alt={entry.team.name} width={18} height={18} style={{ objectFit: 'contain', opacity: 0.85 }} />
          )}
          <span style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.2rem',
            fontWeight: highlight ? 500 : 400,
            color: highlight ? 'var(--white)' : 'rgba(255,255,255,0.75)',
          }}>
            {entry.player.name}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            {entry.team.name}
          </span>
        </div>
        <PlayerFanComment playerName={entry.player.name} />
      </div>

      <div style={{ textAlign: 'right', minWidth: '100px' }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.5rem',
          fontWeight: 300,
          color: 'var(--gold)',
          lineHeight: 1,
        }}>
          {entry.score}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '10px', letterSpacing: '0.08em', marginTop: '4px' }}>
          {entry.goals}G · {entry.assists}A · {entry.matches}P
        </div>
      </div>
    </div>
  );
}
