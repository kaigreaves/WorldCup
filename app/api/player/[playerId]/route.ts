import { NextRequest, NextResponse } from 'next/server';
import {
  getFixtures,
  getStandings,
  getFixtureEvents,
  getFixturePlayerStats,
  classifyGoals,
  getOQS,
  getStageMultiplier,
  type LegacyEntry,
} from '../../../lib/api';

export const revalidate = 300;

export interface PlayerMatchStat {
  fixtureId: number;
  date: string;
  round: string;
  stageMultiplier: number;
  opponent: string;
  opponentLogo: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  penaltiesSaved: number;
  hatTrick: boolean;
  gameWinningGoals: number;
  equalizerGoals: number;
  matchRating: string | null;
  legacyPts: number;
  cumulativePts: number;
}

export interface PlayerProfile {
  matchHistory: PlayerMatchStat[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const { playerId: playerIdStr } = await params;
  const playerId = Number(playerIdStr);
  if (!playerId) return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });

  try {
    const [fixtures, standings] = await Promise.all([getFixtures(), getStandings()]);
    const allFixtures = fixtures ?? [];
    const FINISHED = new Set(['FT', 'AET', 'PEN']);
    const finishedFixtures = allFixtures
      .filter(f => FINISHED.has(f.fixture.status.short))
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

    const matchHistory: PlayerMatchStat[] = [];
    let cumulative = 0;

    const BATCH_SIZE = 3;
    for (let i = 0; i < finishedFixtures.length; i += BATCH_SIZE) {
      const batch = finishedFixtures.slice(i, i + BATCH_SIZE);
      const [eventsBatch, statsBatch] = await Promise.all([
        Promise.all(batch.map(f => getFixtureEvents(f.fixture.id))),
        Promise.all(batch.map(f => getFixturePlayerStats(f.fixture.id))),
      ]);
      if (i + BATCH_SIZE < finishedFixtures.length) {
        await new Promise(r => setTimeout(r, 400));
      }

      for (let bi = 0; bi < batch.length; bi++) {
        const fix = batch[bi];
        const events = eventsBatch[bi];
        const playerStats = statsBatch[bi];

        // Check if this player appeared in this fixture
        const allPlayers = playerStats.flatMap(t => t.players);
        const playerData = allPlayers.find(p => p.player.id === playerId);
        // Also check if they scored (events might have them even without stats)
        const appearsInEvents = events.some(e =>
          e.type === 'Goal' && (e.player.id === playerId || e.assist.id === playerId)
        );
        if (!playerData && !appearsInEvents) continue;

        const homeTeamId = fix.teams.home.id;
        const finalHome = fix.goals.home ?? 0;
        const finalAway = fix.goals.away ?? 0;
        const stageMultiplier = getStageMultiplier(fix.league.round);

        const teamEntry = playerStats.find(t => t.players.some(p => p.player.id === playerId));
        const isHome = teamEntry ? teamEntry.team.id === homeTeamId : false;
        const oqs = isHome ? getOQS(fix.teams.away.name, standings) : getOQS(fix.teams.home.name, standings);
        const teamConceded = isHome ? finalAway : finalHome;

        const goals = classifyGoals(events, homeTeamId, finalHome, finalAway);

        let legacyPts = 0;
        let goalCount = 0;
        let assistCount = 0;
        let gwGoals = 0;
        let eqGoals = 0;
        let cleanSheet = false;
        let penaltiesSaved = 0;
        let matchRating: string | null = null;

        // Goals
        for (const g of goals) {
          if (g.scorerPlayerId === playerId) {
            const base = g.isPenalty ? 7 : 10;
            const bonus = g.isEqualizer ? 6 : g.isGameWinner ? 8 : 0;
            legacyPts += (base + bonus) * oqs * stageMultiplier;
            goalCount++;
            if (g.isGameWinner) gwGoals++;
            if (g.isEqualizer) eqGoals++;
          }
          if (g.assistPlayerId === playerId) {
            const base = g.isPenalty ? 1 : 6;
            const bonus = !g.isPenalty && (g.isEqualizer || g.isGameWinner) ? 3 : 0;
            legacyPts += (base + bonus) * oqs * stageMultiplier;
            assistCount++;
          }
        }

        // Hat trick bonus
        if (goalCount >= 3) legacyPts += 15;

        // Keeper/defender bonuses + rating
        if (playerData) {
          const stat = playerData.statistics[0];
          if (stat) {
            matchRating = stat.games.rating;
            const pos = stat.games.position;
            const mins = stat.games.minutes ?? 0;
            if (pos === 'G') {
              const pks = stat.penalty.saved ?? 0;
              const cs = teamConceded === 0 && mins >= 60;
              if (cs) { cleanSheet = true; legacyPts += 8 * oqs * stageMultiplier; }
              if (pks > 0) { penaltiesSaved += pks; legacyPts += pks * 10 * oqs * stageMultiplier; }
            } else if (pos === 'D') {
              const cs = teamConceded === 0 && mins >= 60;
              if (cs) { cleanSheet = true; legacyPts += 5 * oqs * stageMultiplier; }
            }
          }
        }

        const pts = Math.round(legacyPts * 10) / 10;
        if (pts === 0 && goalCount === 0 && assistCount === 0 && !cleanSheet && penaltiesSaved === 0) continue;

        cumulative = Math.round((cumulative + pts) * 10) / 10;
        matchHistory.push({
          fixtureId: fix.fixture.id,
          date: fix.fixture.date,
          round: fix.league.round,
          stageMultiplier,
          opponent: isHome ? fix.teams.away.name : fix.teams.home.name,
          opponentLogo: isHome ? fix.teams.away.logo : fix.teams.home.logo,
          homeScore: finalHome,
          awayScore: finalAway,
          isHome,
          goals: goalCount,
          assists: assistCount,
          cleanSheet,
          penaltiesSaved,
          hatTrick: goalCount >= 3,
          gameWinningGoals: gwGoals,
          equalizerGoals: eqGoals,
          matchRating,
          legacyPts: pts,
          cumulativePts: cumulative,
        });
      }
    }

    return NextResponse.json({ matchHistory } satisfies PlayerProfile, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('[player] failed:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
