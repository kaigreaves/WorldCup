import { NextResponse } from 'next/server';
import { fetchRedditData } from '../../lib/reddit-client';
import { getFixtures, getUpcomingFixtures, getFinishedFixtures, getLiveFixtures } from '../../lib/api';

// Cache the full Reddit data computation on the server for 30 minutes.
// This eliminates 100+ browser-side API calls — the client makes one request
// and gets the pre-computed result from Vercel's CDN edge cache.
export const revalidate = 1800;

export async function GET() {
  try {
    const allFixtures = (await getFixtures()) ?? [];
    const finished = getFinishedFixtures(allFixtures);
    const live = getLiveFixtures(allFixtures);
    const upcoming = getUpcomingFixtures(allFixtures);

    const fixtures = [
      ...finished.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: true })),
      ...live.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
      ...upcoming.map(f => ({ homeTeam: f.teams.home.name, awayTeam: f.teams.away.name, isFinished: false })),
    ];

    const data = await fetchRedditData(fixtures);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[reddit-data] fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch Reddit data' }, { status: 500 });
  }
}
