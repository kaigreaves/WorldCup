import { NextResponse } from 'next/server';
import {
  getFixtures,
  getTopScorers,
  getTopAssists,
  getStandings,
  computeLegacyLeaderboard,
  computeLegacyMoment,
} from '../../lib/api';

// computeLegacyMoment makes 20+ sequential API calls (batched fixture events +
// player stats). Running it inside the main page ISR adds 10–15 s of compute
// to every 60-second revalidation cycle.  Isolating it here with a 5-minute
// ISR means it runs at most 288 times per day instead of 1440, and the page
// ISR becomes fast again.
export const revalidate = 60;

export async function GET() {
  try {
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
    const moment = await computeLegacyMoment(allFixtures, standings, legacyEntries);

    return NextResponse.json(moment, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('[legacy-moment] failed:', err);
    return NextResponse.json(null, { status: 500 });
  }
}
