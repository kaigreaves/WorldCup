import { unstable_cache } from 'next/cache';
import {
  getFixtures,
  getTopScorers,
  getTopAssists,
  getStandings,
  computeLegacyLeaderboard,
  computeLegacyMoment,
  buildTeamFlagMap,
  buildTeamRankMap,
  PLAYER_TEAM_MAP,
  getUpcomingFixtures,
  getFinishedFixtures,
  getLiveFixtures,
} from './lib/api';

// ISR: page is statically cached and served from Vercel CDN. The lambda runs
// at most once per 60 s in the background — all 100 k concurrent users hit the
// edge cache, not the origin.
export const revalidate = 60;

// computeLegacyMoment makes 20+ sequential API calls. Isolate it in its own
// 5-minute server-side cache so it doesn't block every 60-second page revalidation.
// unstable_cache shares the result across all Lambda instances — no HTTP round-trip.
const getLegacyMomentCached = unstable_cache(
  async () => {
    const [fixtures, scorers, assists, standings] = await Promise.all([
      getFixtures(), getTopScorers(), getTopAssists(), getStandings(),
    ]);
    const allFixtures = fixtures ?? [];
    const entries = await computeLegacyLeaderboard(allFixtures, scorers ?? [], assists ?? [], standings);
    return computeLegacyMoment(allFixtures, standings, entries);
  },
  ['legacy-moment'],
  { revalidate: 300 },
);

import Image from 'next/image';
import GreatnessLeaderboard from './components/GreatnesLeaderboard';
import GroupStandings from './components/GroupStandings';
import Matches from './components/Matches';
import SectionPanel from './components/SectionPanel';
import MatchTicker from './components/MatchTicker';
import RecapBanner from './components/RecapBanner';
import LegacyMomentSplash from './components/LegacyMomentSplash';
import { RedditDataLoader, PerformersSection, FanVoiceSection, TournamentFavourites } from './components/RedditShell';

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

  const legacyEntries = await computeLegacyLeaderboard(allFixtures, allScorers, allAssists, standings);
  const legacyMoment = await getLegacyMomentCached();

  const teamFlagMap = buildTeamFlagMap(allFixtures);
  const teamRanks = buildTeamRankMap(standings);
  const playerMeta: Record<string, { photo?: string; teamLogo?: string }> = {};

  for (const [playerKey, teamName] of Object.entries(PLAYER_TEAM_MAP)) {
    const teamLogo = teamFlagMap[teamName];
    if (teamLogo) playerMeta[playerKey] = { teamLogo };
  }

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

  const matchesPlayed = allFixtures.filter(f => f.fixture.status.short === 'FT').length;
  const isLive = liveMatches.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {legacyMoment && <LegacyMomentSplash moment={legacyMoment} />}

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--gold-border)',
        padding: 'env(safe-area-inset-top) clamp(20px, 4vw, 40px) 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'calc(56px + env(safe-area-inset-top))',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image
            src="https://media.api-sports.io/football/leagues/1.png"
            alt="FIFA World Cup 2026"
            width={28}
            height={28}
            style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
          />
          <div>
            <div style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '17px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--white)',
              lineHeight: 1.2,
            }}>
              Legacy Tracker
            </div>
            <div style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--gold)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              FIFA World Cup 2026
            </div>
          </div>
        </div>
        {isLive && (
          <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
            Live
          </span>
        )}
      </header>

      {/* Score ticker */}
      <MatchTicker fixtures={allFixtures} />

      {/* Recap banner */}
      <RecapBanner fixtures={allFixtures} />

      {/* Matches played strip */}
      <div style={{
        padding: '7px clamp(20px, 4vw, 40px)',
        borderBottom: '1px solid var(--gold-border)',
        background: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: matchesPlayed > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
        <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {matchesPlayed > 0 ? `${matchesPlayed} matches played` : 'Awaiting tournament data'}
          {isLive && ` · ${liveMatches.length} live now`}
        </span>
      </div>

      {/* Main */}
      <main style={{ padding: '0 0 calc(80px + env(safe-area-inset-bottom))' }}>
        <RedditDataLoader fixtures={fixturesForReddit} />

        <SectionPanel>
          {[
            /* ── Legacy tab ─────────────────────────────────────── */
            <div key="legacy" style={{ padding: '32px clamp(16px, 4vw, 40px) 40px' }}>
              <GreatnessLeaderboard entries={legacyEntries} />
              <p style={{ fontSize: '10px', color: 'var(--muted-2)', marginTop: '24px', letterSpacing: '0.08em' }}>
                Stats via api-sports.io · Fan voice via Reddit · FIFA World Cup 2026
              </p>
            </div>,

            /* ── Matches tab ────────────────────────────────────── */
            <div key="matches" style={{ padding: '32px clamp(16px, 4vw, 40px) 40px' }}>
              <GroupStandings groups={standings} />
              <div style={{ marginTop: '40px' }}>
                <Matches upcoming={upcomingMatches} finished={finishedMatches} live={liveMatches} teamRanks={teamRanks} />
              </div>
            </div>,

            /* ── Buzzing tab ────────────────────────────────────── */
            <div key="buzzing" style={{ padding: '32px clamp(16px, 4vw, 40px) 40px' }}>
              <div style={{ marginBottom: '32px' }}>
                <p className="label" style={{ marginBottom: '6px' }}>Fan Pulse</p>
                <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', color: 'var(--white)', margin: '0 0 10px 0', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  Who&apos;s Buzzing?
                </h2>
                <div className="gold-line" />
              </div>
              <PerformersSection headless playerMeta={playerMeta} />
              <div className="gold-line" style={{ margin: '48px 0' }} />
              <TournamentFavourites />
              <div className="gold-line" style={{ margin: '48px 0' }} />
              <FanVoiceSection headless />
            </div>,
          ]}
        </SectionPanel>
      </main>


    </div>
  );
}
