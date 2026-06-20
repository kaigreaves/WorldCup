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
  type LegacyEntry,
  type LegacyMoment,
  type ApiFixture,
  type ApiScorer,
  type StandingEntry,
} from './lib/api';

// ISR: page shell is statically cached on Vercel CDN. All heavy API work is
// wrapped in unstable_cache which uses Vercel's persistent Data Cache — this
// survives new deployments, so a force-push never triggers an API storm.
export const revalidate = 60;

interface PageData {
  allFixtures: ApiFixture[];
  allScorers: ApiScorer[];
  allAssists: ApiScorer[];
  standings: StandingEntry[][];
  legacyEntries: LegacyEntry[];
  legacyMoment: LegacyMoment | null;
  // ISO timestamp of when the data was fetched. Used to show "last updated"
  // in the UI and to distinguish a real error from a pre-tournament empty state.
  computedAt: string;
}

// Single cache entry for all expensive computation. Vercel Data Cache persists
// across deployments — cold starts after a redeploy hit the cache, not the API.
const getPageData = unstable_cache(
  async (): Promise<PageData> => {
    const [fixtures, scorers, assists, standings] = await Promise.all([
      getFixtures(), getTopScorers(), getTopAssists(), getStandings(),
    ]);
    const allFixtures = fixtures ?? [];
    const allScorers = scorers ?? [];
    const allAssists = assists ?? [];
    const legacyEntries = await computeLegacyLeaderboard(allFixtures, allScorers, allAssists, standings);
    const legacyMoment = await computeLegacyMoment(allFixtures, standings, legacyEntries);
    return { allFixtures, allScorers, allAssists, standings, legacyEntries, legacyMoment, computedAt: new Date().toISOString() };
  },
  ['page-data'],
  { revalidate: 300 },
);

import Image from 'next/image';
import GlacierLogo from './components/GlacierLogo';
import GreatnessLeaderboard from './components/GreatnessLeaderboard';
import GroupStandings from './components/GroupStandings';
import Matches from './components/Matches';
import SectionPanel from './components/SectionPanel';
import MatchTicker from './components/MatchTicker';
import RecapBanner from './components/RecapBanner';
import LegacyMomentSplash from './components/LegacyMomentSplash';
import { RedditDataLoader, PerformersSection, FanVoiceSection, TournamentFavourites } from './components/RedditShell';

export default async function Page() {
  const { allFixtures, allScorers, allAssists, standings, legacyEntries, legacyMoment, computedAt } = await getPageData();

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
      <header className="app-header">
        {/* Brand mark — logo only, no text cluttering the mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <GlacierLogo variant="header" />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            paddingLeft: 'var(--space-3)',
            borderLeft: '1px solid rgba(255,255,255,0.10)',
          }}>
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--white)',
              lineHeight: 1.2,
            }}>Legacy Tracker</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              lineHeight: 1,
            }}>FIFA World Cup 2026</span>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {isLive && (
            <span className="live-badge">
              <span className="live-dot" />
              Live
            </span>
          )}
        </div>
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
              <GreatnessLeaderboard entries={legacyEntries} computedAt={computedAt} />
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
              <div style={{ marginBottom: '36px' }}>
                <p className="section-eyebrow" style={{ marginBottom: '8px' }}>Fan Pulse</p>
                <h2 className="section-large-title">Who&apos;s Buzzing?</h2>
                <div className="gold-line" style={{ marginTop: '16px', opacity: 0.5 }} />
              </div>
              <PerformersSection headless playerMeta={playerMeta} />
              <div className="gold-line" style={{ margin: '52px 0', opacity: 0.3 }} />
              <TournamentFavourites />
              <div className="gold-line" style={{ margin: '52px 0', opacity: 0.3 }} />
              <div style={{ marginBottom: '28px' }}>
                <p className="section-eyebrow" style={{ marginBottom: '8px' }}>Fan Voice</p>
                <h2 className="section-large-title">Trending</h2>
                <div className="gold-line" style={{ marginTop: '16px', opacity: 0.5 }} />
              </div>
              <FanVoiceSection headless />
            </div>,
          ]}
        </SectionPanel>
      </main>


    </div>
  );
}
