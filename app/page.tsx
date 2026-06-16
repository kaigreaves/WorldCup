import {
  getFixtures,
  getTopScorers,
  getTopAssists,
  getStandings,
  computeGreatness,
  buildStorylines,
  buildSpotlightPlayers,
  buildTeamFlagMap,
  buildTeamRankMap,
  PLAYER_TEAM_MAP,
  getUpcomingFixtures,
  getFinishedFixtures,
  getLiveFixtures,
} from './lib/api';
import Storylines from './components/Storylines';
import GreatnessLeaderboard from './components/GreatnesLeaderboard';
import GroupStandings from './components/GroupStandings';
import Matches from './components/Matches';
import PlayerSpotlight from './components/PlayerSpotlight';
import SectionPanel from './components/SectionPanel';
import MatchTicker from './components/MatchTicker';
import RecapBanner from './components/RecapBanner';
import HeroCTA from './components/HeroCTA';
import { RedditDataLoader, PerformersSection, FanVoiceSection } from './components/RedditShell';

export default async function Page() {
  const [fixtures, scorers, assists, standings] = await Promise.all([
    getFixtures(),
    getTopScorers(),
    getTopAssists(),
    getStandings(),
  ]);

  const allFixtures = fixtures ?? [];
  const allScorers = scorers ?? [];
  const allAssists = assists ?? [];

  const greatnessEntries = computeGreatness(allScorers, allAssists);
  const storylines = buildStorylines(greatnessEntries);
  const spotlightPlayers = buildSpotlightPlayers(greatnessEntries, allScorers, allAssists);

  // Name → { photo, teamLogo } lookup for client components (Performers)
  const teamFlagMap = buildTeamFlagMap(allFixtures);
  const teamRanks = buildTeamRankMap(standings);
  const playerMeta: Record<string, { photo?: string; teamLogo?: string }> = {};

  // Seed from static player→team map so performers get flags even without scorer data
  for (const [playerKey, teamName] of Object.entries(PLAYER_TEAM_MAP)) {
    const teamLogo = teamFlagMap[teamName];
    if (teamLogo) playerMeta[playerKey] = { teamLogo };
  }

  // Override/enrich with live API data (adds player photos where available)
  for (const s of [...allScorers, ...allAssists]) {
    const lastName = s.player.name.split(' ').pop()?.toLowerCase() ?? '';
    const fullLower = s.player.name.toLowerCase();
    const meta = { photo: s.player.photo, teamLogo: s.statistics[0]?.team.logo ?? teamFlagMap[s.statistics[0]?.team.name ?? ''] };
    if (lastName) playerMeta[lastName] = { ...playerMeta[lastName], ...meta };
    playerMeta[fullLower] = { ...playerMeta[fullLower], ...meta };
  }
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

      {/* Fixed right sidebar — always visible on desktop */}
      <aside id="leaderboard" style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '280px',
        height: '100vh',
        borderLeft: '1px solid var(--gold-border)',
        background: 'var(--navy)',
        overflowY: 'auto',
        zIndex: 50,
        padding: '24px 20px 80px',
        boxSizing: 'border-box',
      } as React.CSSProperties}>
        {/* WC 2026 badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', opacity: 0.6 }}>
          <img
            src="https://media.api-sports.io/football/leagues/1.png"
            alt="FIFA World Cup 2026"
            width={22}
            height={22}
            style={{ objectFit: 'contain' }}
          />
          <span style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', fontFamily: 'Inter, sans-serif' }}>
            FIFA World Cup 2026
          </span>
        </div>
        <GreatnessLeaderboard entries={greatnessEntries} compact />
        <GroupStandings groups={standings} />
      </aside>

      {/* Main content — padded right to clear the fixed sidebar on desktop */}
      <div className="main-wrapper">

        {/* Header */}
        <header style={{
          borderBottom: '1px solid var(--gold-border)',
          padding: '0 clamp(20px, 4vw, 40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          position: 'sticky',
          top: 0,
          background: 'var(--navy)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="https://media.api-sports.io/football/leagues/1.png"
              alt="FIFA World Cup 2026"
              style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <div style={{
              width: '1px',
              height: '28px',
              background: 'var(--gold-border)',
            }} />
            <div style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '0.95rem',
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: 'var(--white)',
              textTransform: 'uppercase',
            }}>
              The Story of Greatness
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isLive && (
              <span style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Live
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.03em' }}>{today}</span>
          </div>
        </header>


        {/* Score ticker */}
        <MatchTicker fixtures={allFixtures} />

        {/* Recap banner — shown if matches finished since last visit */}
        <RecapBanner fixtures={allFixtures} />

        {/* Hero */}
        <div style={{
          position: 'relative',
          borderBottom: '1px solid var(--gold-border)',
          overflow: 'hidden',
          minHeight: '420px',
          display: 'flex',
          alignItems: 'center',
        }}>
          {/* Mbappé background photo — right-aligned, no distortion */}
          <img
            src="/Mbappe-hero.jpg"
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: 'auto',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block',
              zIndex: 0,
            }}
          />
          {/* Dark gradient left-to-right so text stays readable */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, var(--navy) 40%, rgba(0,17,43,0.85) 65%, rgba(0,17,43,0.2) 100%)',
            zIndex: 1,
          }} />
          {/* Top + bottom fade */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,17,43,0.4) 0%, transparent 20%, transparent 80%, var(--navy) 100%)',
            zIndex: 1,
          }} />

          {/* Text content */}
          <div style={{ position: 'relative', zIndex: 2, padding: '56px clamp(20px, 4vw, 40px) 48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <img
                src="https://media.api-sports.io/football/leagues/1.png"
                alt="FIFA World Cup 2026"
                width={32}
                height={32}
                style={{ objectFit: 'contain', opacity: 0.85 }}
              />
              <p className="label" style={{ opacity: 0.7, margin: 0 }}>FIFA World Cup 2026 · Where legacies are written</p>
            </div>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.2rem, 4vw, 4rem)',
              fontWeight: 300,
              lineHeight: 1.1,
              color: 'var(--white)',
              maxWidth: '560px',
              margin: '0 0 18px 0',
            }}>
              It is not the critic who counts.
              <br />
              <em style={{ color: 'var(--gold)', fontWeight: 300 }}>It is the man in the arena.</em>
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '400px', lineHeight: '1.8', margin: '0 0 24px 0' }}>
              Every match writes or rewrites a legacy. We track who is delivering when it counts —
              told through the eyes of the fans watching it happen.
            </p>
            <HeroCTA />
          </div>
        </div>

        {/* Hero stats bar */}
        <div style={{ padding: '0 clamp(20px, 4vw, 40px)', borderBottom: '1px solid var(--gold-border)', background: 'var(--navy-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: matchesPlayed > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {matchesPlayed > 0 ? `${matchesPlayed} matches played` : 'Awaiting tournament data'}
              {isLive && ` · ${liveMatches.length} live now`}
            </span>
          </div>
        </div>

        {/* Main */}
        <main style={{ padding: '56px clamp(20px, 4vw, 40px)', maxWidth: '900px' }}>
          <RedditDataLoader fixtures={fixturesForReddit} />

          <SectionPanel>
            {[
              <Storylines key="story" storylines={storylines} />,
              <Matches key="matches" upcoming={upcomingMatches} finished={finishedMatches} live={liveMatches} teamRanks={teamRanks} />,
              <div key="performers" id="performers"><PerformersSection headless playerMeta={playerMeta} /></div>,
              <FanVoiceSection key="fanvoice" headless />,
              <PlayerSpotlight
                key="spotlight"
                players={spotlightPlayers}
                scorers={allScorers}
                assists={allAssists}
                fixtures={allFixtures}
                headless
              />,
            ]}
          </SectionPanel>
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--gold-border)',
          padding: '24px clamp(20px, 4vw, 40px) 80px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>
            Stats via api-sports.io · Fan voice via Reddit · FIFA World Cup 2026
          </p>
          <div style={{ display: 'flex', gap: '4px', height: '20px' }}>
            <div style={{ width: '6px', background: 'var(--blue)', opacity: 0.7, borderRadius: '1px' }} />
            <div style={{ width: '6px', background: 'var(--white)', opacity: 0.4, borderRadius: '1px' }} />
            <div style={{ width: '6px', background: 'var(--red)', opacity: 0.7, borderRadius: '1px' }} />
          </div>
        </footer>

      </div>
    </div>
  );
}
