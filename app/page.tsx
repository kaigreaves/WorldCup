import {
  getFixtures,
  getTopScorers,
  getTopAssists,
  computeGreatness,
  buildStorylines,
  buildSpotlightPlayers,
  getUpcomingFixtures,
  getFinishedFixtures,
  getLiveFixtures,
} from './lib/api';
import Storylines from './components/Storylines';
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
  const storylines = buildStorylines(greatnessEntries);
  const spotlightPlayers = buildSpotlightPlayers(greatnessEntries);
  const upcomingMatches = getUpcomingFixtures(allFixtures);
  const finishedMatches = getFinishedFixtures(allFixtures);
  const liveMatches = getLiveFixtures(allFixtures);

  const fixturesForReddit = [
    ...finishedMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: true })),
    ...liveMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
    ...upcomingMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
  ];

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const matchesPlayed = allFixtures.filter(f => f.fixture.status.short === 'FT').length;
  const isLive = liveMatches.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--gold-border)',
        padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        background: 'var(--navy)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', height: '20px', gap: '3px' }}>
            <div style={{ width: '6px', background: 'var(--blue)', borderRadius: '1px' }} />
            <div style={{ width: '6px', background: 'var(--white)', opacity: 0.9, borderRadius: '1px' }} />
            <div style={{ width: '6px', background: 'var(--red)', borderRadius: '1px' }} />
          </div>
          <div>
            <div style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '0.95rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: 'var(--white)',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}>
              The Story of Greatness
            </div>
            <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginTop: '3px' }}>
              FIFA World Cup 2026
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isLive && (
            <span style={{
              fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              Live
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.03em' }}>{today}</span>
        </div>
      </header>

      {/* Nav */}
      <nav style={{
        padding: '0 clamp(20px, 4vw, 48px)',
        borderBottom: '1px solid var(--gold-border)',
        display: 'flex',
        gap: '28px',
        overflowX: 'auto',
      }}>
        {[
          ['The Story', '#storylines'],
          ['Legacy', '#leaderboard'],
          ['Matches', '#matches'],
          ['Fan Voice', '#fanvoice'],
          ['Spotlight', '#spotlight'],
        ].map(([label, href]) => (
          <a key={href} href={href} style={{
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            padding: '16px 0',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}>
            {label}
          </a>
        ))}
      </nav>

      {/* Hero */}
      <div style={{
        padding: '64px clamp(20px, 4vw, 48px) 56px',
        borderBottom: '1px solid var(--gold-border)',
        background: 'linear-gradient(180deg, var(--navy-2) 0%, var(--navy) 100%)',
      }}>
        <p className="label" style={{ marginBottom: '16px', opacity: 0.7 }}>
          Where legacies are written
        </p>
        <h1 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(2.4rem, 5vw, 4.4rem)',
          fontWeight: 300,
          lineHeight: 1.1,
          color: 'var(--white)',
          maxWidth: '700px',
          margin: '0 0 20px 0',
        }}>
          It is not the critic who counts.
          <br />
          <em style={{ color: 'var(--gold)', fontWeight: 300 }}>It is the man in the arena.</em>
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--muted)',
          maxWidth: '480px',
          lineHeight: '1.8',
          margin: 0,
        }}>
          Every match writes or rewrites a legacy. We track who is delivering when it counts —
          told through the eyes of the fans watching it happen.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '32px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: matchesPlayed > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)',
          }} />
          <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {matchesPlayed > 0 ? `${matchesPlayed} matches played` : 'Awaiting tournament data'}
            {isLive && ` · ${liveMatches.length} match${liveMatches.length > 1 ? 'es' : ''} live now`}
          </span>
        </div>
      </div>

      {/* Main */}
      <main style={{ padding: '64px clamp(20px, 4vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
        <RedditDataLoader fixtures={fixturesForReddit} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>

          <div id="storylines">
            <Storylines storylines={storylines} />
          </div>

          <div id="leaderboard">
            <GreatnessLeaderboard entries={greatnessEntries} />
          </div>

          <div id="matches">
            <Matches upcoming={upcomingMatches} finished={finishedMatches} live={liveMatches} />
          </div>

          <div id="fanvoice">
            <PerformersSection />
          </div>

          <div>
            <FanVoiceSection />
          </div>

          <div id="spotlight">
            <PlayerSpotlight
              players={spotlightPlayers}
              scorers={allScorers}
              assists={allAssists}
              fixtures={allFixtures}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--gold-border)',
        padding: '28px clamp(20px, 4vw, 48px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1rem',
            color: 'var(--gold)',
            margin: 0,
            letterSpacing: '0.05em',
          }}>
            The Story of Greatness
          </p>
          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Stats via api-sports.io · Fan voice via Reddit · FIFA World Cup 2026
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px', height: '24px' }}>
          <div style={{ width: '7px', background: 'var(--blue)', opacity: 0.7, borderRadius: '1px' }} />
          <div style={{ width: '7px', background: 'var(--white)', opacity: 0.4, borderRadius: '1px' }} />
          <div style={{ width: '7px', background: 'var(--red)', opacity: 0.7, borderRadius: '1px' }} />
        </div>
      </footer>
    </div>
  );
}
