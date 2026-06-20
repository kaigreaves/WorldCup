// ─────────────────────────────────────────────────────────────────────────────
// LIGHT MODE MOCK — preview only at /light, never linked from main app
// Uses real data + real components, glacier blue (#0ea5e9) + ice white only
// ─────────────:───────────────────────────────────────────────────────────────

import Image from 'next/image';
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
} from '../lib/api';
import GreatnessLeaderboard from '../components/GreatnessLeaderboard';
import GroupStandings from '../components/GroupStandings';
import Matches from '../components/Matches';
import SectionPanel from '../components/SectionPanel';
import MatchTicker from '../components/MatchTicker';
import RecapBanner from '../components/RecapBanner';
import { RedditDataLoader, PerformersSection, FanVoiceSection, TournamentFavourites } from '../components/RedditShell';

// ISR like the main page — was `force-dynamic`, which re-ran the full leaderboard
// compute (and its per-fixture API fan-out) on EVERY request with no compute
// coalescing. As a publicly routable URL that made /light a direct path to
// blowing the api-sports per-minute limit. Cache the heavy work behind
// unstable_cache so it runs at most once per 5 minutes, exactly like `/`.
export const revalidate = 300;

const getLightPageData = unstable_cache(
  async () => {
    const [fixtures, scorers, assists, standings] = await Promise.all([
      getFixtures(), getTopScorers(), getTopAssists(), getStandings(),
    ]);
    const allFixtures = fixtures ?? [];
    const allScorers = scorers ?? [];
    const allAssists = assists ?? [];
    const legacyEntries = await computeLegacyLeaderboard(allFixtures, allScorers, allAssists, standings);
    return { allFixtures, allScorers, allAssists, standings, legacyEntries, computedAt: new Date().toISOString() };
  },
  ['light-page-data'],
  { revalidate: 300 },
);

export default async function LightModePage() {
  const { allFixtures, allScorers, allAssists, standings, legacyEntries, computedAt } = await getLightPageData();

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
  const matchesPlayed = allFixtures.filter(f => f.fixture.status.short === 'FT').length;
  const isLive = liveMatches.length > 0;

  const fixturesForReddit = [
    ...finishedMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: true })),
    ...liveMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
    ...upcomingMatches.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
  ];

  return (
    <>
      {/* Inject light-mode CSS variable overrides scoped to .lm wrapper */}
      <style>{`
        .lm {
          --navy:        #f0f9ff;
          --navy-2:      #e0f2fe;
          --navy-3:      #bae6fd;
          --blue:        #0ea5e9;
          --red:         #0284c7;
          --white:       #0c2d48;
          --gold:        #0ea5e9;
          --gold-bright: #38bdf8;
          --gold-dim:    rgba(14,165,233,0.10);
          --gold-border: rgba(14,165,233,0.20);
          --muted:       rgba(14,165,233,0.65);
          --muted-2:     rgba(12,45,72,0.35);
          --glass-bg-1:  rgba(240,249,255,0.82);
          --glass-bg-2:  rgba(14,165,233,0.05);
          --glass-bg-3:  rgba(14,165,233,0.09);
          --glass-bg-4:  rgba(224,242,254,0.80);
          --glass-border:        rgba(14,165,233,0.14);
          --glass-border-strong: rgba(14,165,233,0.22);
          --glass-specular:      rgba(255,255,255,0.60);
          --shadow-card: 0 2px 16px rgba(14,165,233,0.10), 0 8px 40px rgba(14,165,233,0.06);
          --shadow-gold: 0 0 24px rgba(14,165,233,0.12);
        }
        /* Card backgrounds */
        .lm .card {
          background: rgba(255,255,255,0.92) !important;
          border-color: rgba(14,165,233,0.18) !important;
          box-shadow: 0 2px 16px rgba(14,165,233,0.08) !important;
        }
        .lm .card-live {
          border-color: rgba(2,132,199,0.5) !important;
          animation: lmBorderPulse 2.2s ease-in-out infinite !important;
        }
        @keyframes lmBorderPulse {
          0%,100% { border-color: rgba(2,132,199,0.3); }
          50%      { border-color: rgba(2,132,199,0.7); }
        }
        /* Header */
        .lm .app-header {
          background: rgba(240,249,255,0.88) !important;
          border-bottom-color: rgba(14,165,233,0.18) !important;
        }
        .lm .header-title { color: #0c2d48 !important; }
        .lm .header-subtitle { color: rgba(14,165,233,0.7) !important; }
        .lm .live-badge {
          background: rgba(2,132,199,0.10) !important;
          border-color: rgba(2,132,199,0.35) !important;
          color: #0284c7 !important;
        }
        .lm .live-dot { background: #0284c7 !important; }
        /* Bottom nav */
        .lm .bottom-nav {
          background: rgba(240,249,255,0.92) !important;
          border-top-color: rgba(14,165,233,0.18) !important;
        }
        .lm .bottom-nav-indicator {
          background: #0ea5e9 !important;
        }
        /* Gold line divider */
        .lm .gold-line {
          background: linear-gradient(to right, #0ea5e9, rgba(14,165,233,0.1)) !important;
        }
        /* Section eyebrow */
        .lm .section-eyebrow { color: #0ea5e9 !important; }
        /* Label */
        .lm .label { color: rgba(14,165,233,0.7) !important; }
        /* Match ticker */
        .lm [class*="ticker"], .lm [data-ticker] {
          background: rgba(240,249,255,0.92) !important;
          border-color: rgba(14,165,233,0.18) !important;
        }
        /* Recap banner */
        .lm [class*="recap"] {
          background: rgba(14,165,233,0.05) !important;
          border-color: rgba(14,165,233,0.2) !important;
        }
        /* Bottom nav pill — override hardcoded dark rgba */
        .lm .bottom-nav {
          background: rgba(224,242,254,0.88) !important;
          border-color: rgba(14,165,233,0.22) !important;
          box-shadow: 0 8px 40px rgba(14,165,233,0.14), 0 2px 8px rgba(14,165,233,0.08),
                      inset 0 1px 0 rgba(255,255,255,0.70) !important;
        }
        .lm .bottom-nav-btn { color: rgba(14,165,233,0.45) !important; }
        .lm .bottom-nav-btn.active { color: #0ea5e9 !important; }
        .lm .bottom-nav-indicator {
          background: rgba(14,165,233,0.12) !important;
          border-color: rgba(14,165,233,0.30) !important;
        }
        /* App header — --glass-bg-4 is already overridable via the var, but border is hardcoded */
        .lm .app-header {
          background: rgba(224,242,254,0.88) !important;
          border-bottom-color: rgba(14,165,233,0.20) !important;
          box-shadow: 0 1px 0 rgba(14,165,233,0.10) !important;
        }
        /* global header tag override from globals.css */
        .lm header {
          background: rgba(224,242,254,0.88) !important;
          border-bottom: 0.5px solid rgba(14,165,233,0.20) !important;
          box-shadow: 0 1px 0 rgba(14,165,233,0.10) !important;
        }
        /* Card hover border colour */
        .lm .card:hover {
          border-color: rgba(14,165,233,0.40) !important;
          box-shadow: 0 4px 24px rgba(14,165,233,0.14) !important;
        }
        /* glass-elevated (used in some cards) */
        .lm .glass-elevated {
          background: rgba(255,255,255,0.80) !important;
          border-color: rgba(14,165,233,0.28) !important;
        }
        /* desktop tab strip */
        .lm .desktop-tabs {
          background: rgba(224,242,254,0.88) !important;
          border-color: rgba(14,165,233,0.15) !important;
        }
        .lm .desktop-tab-btn { color: rgba(14,165,233,0.55) !important; }
        .lm .desktop-tab-btn.active { color: #0ea5e9 !important; }
        /* Scrollbar */
        .lm ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3) !important; }
      `}</style>

      <div className="lm" style={{ minHeight: '100vh', background: '#f0f9ff' }}>

        {/* Header — same structure as main, glacier logo instead of WC logo */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Image
              src="/glacier-logo.png"
              alt="Glacier Sports"
              width={80}
              height={40}
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
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
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: matchesPlayed > 0 ? '#0ea5e9' : 'rgba(14,165,233,0.25)', flexShrink: 0 }} />
          <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {matchesPlayed > 0 ? `${matchesPlayed} matches played` : 'Awaiting tournament data'}
            {isLive && ` · ${liveMatches.length} live now`}
          </span>
        </div>

        {/* Main content — identical to main page */}
        <main style={{ padding: '0 0 calc(80px + env(safe-area-inset-bottom))' }}>
          <RedditDataLoader fixtures={fixturesForReddit} />

          <SectionPanel>
            {[
              <div key="legacy" style={{ padding: '32px clamp(16px, 4vw, 40px) 40px' }}>
                <GreatnessLeaderboard entries={legacyEntries} computedAt={computedAt} />
                <p style={{ fontSize: '10px', color: 'var(--muted-2)', marginTop: '24px', letterSpacing: '0.08em' }}>
                  Stats via api-sports.io · Fan voice via Reddit · FIFA World Cup 2026
                </p>
              </div>,

              <div key="matches" style={{ padding: '32px clamp(16px, 4vw, 40px) 40px' }}>
                <GroupStandings groups={standings} />
                <div style={{ marginTop: '40px' }}>
                  <Matches upcoming={upcomingMatches} finished={finishedMatches} live={liveMatches} teamRanks={teamRanks} />
                </div>
              </div>,

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
    </>
  );
}
