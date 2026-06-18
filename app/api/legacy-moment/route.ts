import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import {
  getFixtures,
  getTopScorers,
  getTopAssists,
  getStandings,
  computeLegacyLeaderboard,
  computeLegacyMoment,
} from '../../lib/api';

export const revalidate = 60;

// unstable_cache wraps the expensive computation so it runs at most once per
// 60-second window across ALL Vercel function instances.
// Without this, every CDN cache miss triggers a fresh run of computeLegacyLeaderboard
// (which itself fans out to ~100 fetch calls for fixture events + player stats).
// The fetch-level cache (86400s for fixture events) absorbs most of those, but
// the JS execution overhead and any quota misses still compound.
// Key matches the granularity of the data: one entry per tournament.
const getCachedLegacyMoment = unstable_cache(
  async () => {
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
    return computeLegacyMoment(allFixtures, standings, legacyEntries);
  },
  ['legacy-moment'],
  { revalidate: 60 },
);

export async function GET() {
  try {
    const moment = await getCachedLegacyMoment();
    return NextResponse.json(moment, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('[legacy-moment] failed:', err);
    return NextResponse.json(null, {
      status: 200, // don't surface 500s to client — null is handled gracefully
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
