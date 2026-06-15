import type { ApiFixture } from '../lib/api';
import { MatchFanComments } from './RedditShell';

function formatDate(utcDate: string) {
  const d = new Date(utcDate);
  return {
    date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
  };
}

function TeamBadge({ team, dim }: { team: ApiFixture['teams']['home']; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, opacity: dim ? 0.45 : 1 }}>
      {team.logo && <img src={team.logo} alt={team.name} width={28} height={28} style={{ objectFit: 'contain' }} />}
      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', color: 'var(--white)', whiteSpace: 'nowrap' }}>
        {team.name}
      </span>
    </div>
  );
}

function UpcomingCard({ fix }: { fix: ApiFixture }) {
  const { date, time } = formatDate(fix.fixture.date);
  return (
    <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="label" style={{ marginBottom: '4px' }}>{fix.league.round}</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{date} · {time}</p>
        </div>
        {fix.fixture.venue && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', maxWidth: '140px', lineHeight: 1.4 }}>
            {fix.fixture.venue.city}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <TeamBadge team={fix.teams.home} />
        <span style={{ color: 'var(--gold)', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', flexShrink: 0 }}>vs</span>
        <TeamBadge team={fix.teams.away} />
      </div>
      <MatchFanComments
        homeTeam={fix.teams.home.name}
        awayTeam={fix.teams.away.name}
        label="What fans are saying"
        isFinished={false}
      />
    </div>
  );
}

function FinishedCard({ fix }: { fix: ApiFixture }) {
  const { date } = formatDate(fix.fixture.date);
  const home = fix.goals.home ?? 0;
  const away = fix.goals.away ?? 0;
  return (
    <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p className="label" style={{ marginBottom: '4px' }}>{fix.league.round}</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{date}</p>
        </div>
        <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', paddingTop: '2px' }}>
          {fix.fixture.status.short}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <TeamBadge team={fix.teams.home} dim={fix.teams.away.winner === true} />
        <div style={{ textAlign: 'center', minWidth: '80px', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '2.5rem', fontWeight: 300,
            color: 'var(--white)', lineHeight: 1, letterSpacing: '0.05em',
          }}>
            {home} <span style={{ color: 'var(--gold)', opacity: 0.5 }}>—</span> {away}
          </div>
        </div>
        <TeamBadge team={fix.teams.away} dim={fix.teams.home.winner === true} />
      </div>
      <MatchFanComments
        homeTeam={fix.teams.home.name}
        awayTeam={fix.teams.away.name}
        label="Fan reaction"
        isFinished={true}
      />
    </div>
  );
}

interface Props {
  upcoming: ApiFixture[];
  finished: ApiFixture[];
}

export default function Matches({ upcoming, finished }: Props) {
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' };
  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Stage</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Matches</h2>
        <div className="gold-line mt-4" />
      </div>
      {upcoming.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '20px' }}>Upcoming fixtures</p>
          <div style={grid}>{upcoming.map(f => <UpcomingCard key={f.fixture.id} fix={f} />)}</div>
        </div>
      )}
      {finished.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '20px' }}>Results</p>
          <div style={grid}>{finished.map(f => <FinishedCard key={f.fixture.id} fix={f} />)}</div>
        </div>
      )}
      {upcoming.length === 0 && finished.length === 0 && (
        <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Match data will appear as the tournament gets underway.</p>
      )}
    </section>
  );
}
