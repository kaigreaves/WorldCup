import {
  getFixtures,
  getTopScorers,
  getTopAssists,
  computeGreatness,
  getUpcomingFixtures,
  getFinishedFixtures,
} from './lib/api';
import GreatnessLeaderboard from './components/GreatnesLeaderboard';
import Matches from './components/Matches';
import PlayerSpotlight from './components/PlayerSpotlight';
import { RedditDataLoader, PerformersSection, FanVoiceSection } from './components/RedditShell';

export default async function Page() {
  const [fixtures, scorers, assists] = await Promise.all([
    getFixtures(),
    getTopScorers(),
    getTopAssists(),
  ]);

  const allFixtures = fixtures ?? [];
  const allScorers = scorers ?? [];
  const allAssists = assists ?? [];

  const greatnessEntries = computeGreatness(allScorers, allAssists);
  const upcomingMatches = getUpcomingFixtures(allFixtures);
  const finishedMatches = getFinishedFixtures(allFixtures);

  // Fixture list passed to client-side Reddit loader
  const fixturesForReddit = [
    ...finishedMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: true })),
    ...upcomingMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
  ];

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--gold-border)',
          padding: '0 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
          position: 'sticky',
          top: 0,
          background: 'var(--navy)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', height: '22px', gap: '3px' }}>
            <div style={{ width: '7px', background: 'var(--blue)', borderRadius: '1px' }} />
            <div style={{ width: '7px', background: 'var(--white)', opacity: 0.9, borderRadius: '1px' }} />
            <div style={{ width: '7px', background: 'var(--red)', borderRadius: '1px' }} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '1rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
                color: 'var(--white)',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              The Story of Greatness
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginTop: '3px' }}>
              FIFA World Cup 2026
            </div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '0.03em' }}>
          {today}
        </div>
      </header>

      {/* Hero */}
      <div
        style={{
          padding: '80px 48px 64px',
          borderBottom: '1px solid var(--gold-border)',
          background: 'linear-gradient(180deg, var(--navy-2) 0%, var(--navy) 100%)',
        }}
      >
        <p className="label" style={{ marginBottom: '16px', opacity: 0.7 }}>
          Where history is decided
        </p>
        <h1
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.6rem, 5.5vw, 4.8rem)',
            fontWeight: 300,
            lineHeight: 1.08,
            color: 'var(--white)',
            maxWidth: '680px',
            margin: '0 0 24px 0',
          }}
        >
          The World Cup is not a tournament.
          <br />
          <em style={{ color: 'var(--gold)', fontWeight: 300 }}>It is a verdict.</em>
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--muted)',
            maxWidth: '500px',
            lineHeight: '1.75',
            fontStyle: 'italic',
            margin: 0,
          }}
        >
          Every match writes or rewrites a legacy. We track the greatness — who&apos;s rising,
          who&apos;s defining their era, and who the tournament will remember.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '36px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: allFixtures.length > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)',
            }}
          />
          <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {allFixtures.length > 0 ? `Live · ${allFixtures.filter(f => f.fixture.status.short === 'FT').length} matches played` : 'Awaiting tournament data'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          padding: '0 48px',
          borderBottom: '1px solid var(--gold-border)',
          display: 'flex',
          gap: '32px',
          overflowX: 'auto',
        }}
      >
        {[
          ['Greatness Leaderboard', '#leaderboard'],
          ['Matches', '#matches'],
          ['Performers', '#performers'],
          ['Fan Voice', '#fanvoice'],
          ['Spotlight', '#spotlight'],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            style={{
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              padding: '18px 0',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Main content */}
      <main style={{ padding: '72px 48px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '96px' }}>

          {/* Client-side Reddit loader — fires once, hydrates all comment sections */}
          <RedditDataLoader fixtures={fixturesForReddit} />

          <div id="leaderboard">
            <GreatnessLeaderboard entries={greatnessEntries} />
          </div>

          <div id="matches">
            <Matches upcoming={upcomingMatches} finished={finishedMatches} />
          </div>

          <div id="performers">
            <PerformersSection />
          </div>

          <div id="fanvoice">
            <FanVoiceSection />
          </div>

          <div id="spotlight">
            <PlayerSpotlight scorers={allScorers} assists={allAssists} fixtures={allFixtures} />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--gold-border)',
          padding: '32px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '1rem',
              color: 'var(--gold)',
              margin: 0,
              letterSpacing: '0.05em',
            }}
          >
            The Story of Greatness
          </p>
          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Data via football-data.org · Updated live · FIFA World Cup 2026
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px', height: '28px' }}>
          <div style={{ width: '8px', background: 'var(--blue)', opacity: 0.7, borderRadius: '1px' }} />
          <div style={{ width: '8px', background: 'var(--white)', opacity: 0.4, borderRadius: '1px' }} />
          <div style={{ width: '8px', background: 'var(--red)', opacity: 0.7, borderRadius: '1px' }} />
        </div>
      </footer>
    </div>
  );
}