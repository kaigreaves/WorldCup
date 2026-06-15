const BASE = 'https://v3.football.api-sports.io';
const KEY = '8dcac7731565e7af932c170119c7898d';
const LEAGUE = 1;
const SEASON = 2026;

const headers = { 'x-apisports-key': KEY };

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json() as { response: T };
    return json.response;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiTeam {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

export interface ApiPlayer {
  id: number;
  name: string;
  photo: string;
  nationality?: string;
  age?: number;
}

export interface ApiScorer {
  player: ApiPlayer;
  statistics: {
    team: { id: number; name: string; logo: string };
    goals: { total: number | null; assists: number | null; conceded: number | null };
    games: { appearences: number | null; lineups: number | null };
  }[];
}

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string; elapsed: number | null };
    venue?: { name: string; city: string };
  };
  league: {
    round: string;
  };
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

export async function getFixtures(): Promise<ApiFixture[] | null> {
  return apiFetch<ApiFixture[]>(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
}

export async function getTopScorers(): Promise<ApiScorer[] | null> {
  return apiFetch<ApiScorer[]>(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`);
}

export async function getTopAssists(): Promise<ApiScorer[] | null> {
  return apiFetch<ApiScorer[]>(`/players/topassists?league=${LEAGUE}&season=${SEASON}`);
}

// ── Derived helpers ───────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE', 'SUSP']);

export function getLiveFixtures(fixtures: ApiFixture[]): ApiFixture[] {
  return fixtures
    .filter(f => LIVE_STATUSES.has(f.fixture.status.short))
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
}

export function getFinishedFixtures(fixtures: ApiFixture[], limit = 12): ApiFixture[] {
  return fixtures
    .filter(f => f.fixture.status.short === 'FT' || f.fixture.status.short === 'AET' || f.fixture.status.short === 'PEN')
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, limit);
}

export function getUpcomingFixtures(fixtures: ApiFixture[], limit = 6): ApiFixture[] {
  const now = new Date();
  return fixtures
    .filter(f => f.fixture.status.short === 'NS' && new Date(f.fixture.date) > now)
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
    .slice(0, limit);
}

export function getRecentFixtures(fixtures: ApiFixture[], days = 3): ApiFixture[] {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return fixtures
    .filter(f =>
      (f.fixture.status.short === 'FT' || f.fixture.status.short === 'AET') &&
      new Date(f.fixture.date) >= cutoff
    )
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());
}

// ── Greatness ─────────────────────────────────────────────────────────────────

export interface GreatnessEntry {
  rank: number;
  player: ApiPlayer;
  team: { id: number; name: string; logo: string };
  goals: number;
  assists: number;
  matches: number;
  score: number;
  narrative: string;
}

const LEGACY_NARRATIVES: Record<string, string> = {
  'Kylian Mbappé': 'Every tournament goal writes a new chapter in the argument for all-time greatness.',
  'K. Mbappe': 'Every tournament goal writes a new chapter in the argument for all-time greatness.',
  'L. Messi': 'The final act of the greatest career in football history — each moment is now immortal.',
  'Lionel Messi': 'The final act of the greatest career in football history — each moment is now immortal.',
  'J. Bellingham': 'A generational talent cementing his status as England\'s most important player since Beckham.',
  'Jude Bellingham': 'A generational talent cementing his status as England\'s most important player since Beckham.',
  'A. Davies': 'Carrying an entire nation\'s footballing identity on his shoulders with breathtaking joy.',
  'Alphonso Davies': 'Carrying an entire nation\'s footballing identity on his shoulders with breathtaking joy.',
  'M. Olise': 'The revelation — a player born for the biggest stages, announcing himself to the world.',
  'Michael Olise': 'The revelation — a player born for the biggest stages, announcing himself to the world.',
};

function getNarrative(name: string, goals: number, assists: number): string {
  if (LEGACY_NARRATIVES[name]) return LEGACY_NARRATIVES[name];
  if (goals >= 5) return 'A tournament-defining performance that will echo through football history.';
  if (goals >= 3) return 'Consistently decisive — the hallmark of a player at the peak of their powers.';
  if (assists >= 3) return 'The architect. Pulling the strings, bending the game to his will.';
  if (goals >= 1 || assists >= 1) return 'Making their mark — a player who arrives on the biggest stages.';
  return 'Leaving an imprint on this tournament with every appearance.';
}

export function computeGreatness(scorers: ApiScorer[], assistsList: ApiScorer[]): GreatnessEntry[] {
  const map = new Map<number, GreatnessEntry>();

  for (const s of scorers) {
    const st = s.statistics[0];
    if (!st) continue;
    const goals = st.goals.total ?? 0;
    const assists = st.goals.assists ?? 0;
    const matches = st.games.appearences ?? 1;
    const score = goals * 10 + assists * 6 + matches * 0.5;
    map.set(s.player.id, {
      rank: 0,
      player: s.player,
      team: st.team,
      goals,
      assists,
      matches,
      score: Math.round(score * 10) / 10,
      narrative: getNarrative(s.player.name, goals, assists),
    });
  }

  // Merge in assists data for players not already in the scorer list
  for (const s of assistsList) {
    if (map.has(s.player.id)) continue;
    const st = s.statistics[0];
    if (!st) continue;
    const goals = st.goals.total ?? 0;
    const assists = st.goals.assists ?? 0;
    const matches = st.games.appearences ?? 1;
    const score = goals * 10 + assists * 6 + matches * 0.5;
    map.set(s.player.id, {
      rank: 0,
      player: s.player,
      team: st.team,
      goals,
      assists,
      matches,
      score: Math.round(score * 10) / 10,
      narrative: getNarrative(s.player.name, goals, assists),
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// ── Spotlight players ─────────────────────────────────────────────────────────

export interface SpotlightConfig {
  fullName: string;
  nameFragment: string;
  teamName: string;
  teamTla: string;
  role: string;
  legacyContext: string;
  color: string;
}

export const SPOTLIGHT_PLAYERS: SpotlightConfig[] = [
  {
    fullName: 'Kylian Mbappé',
    nameFragment: 'mbappe',
    teamName: 'France',
    teamTla: 'FRA',
    role: 'Forward',
    legacyContext: 'Already the most expensive player in history. This tournament is his coronation — or his question mark. Every knockout match, every defining moment belongs to him.',
    color: '#002395',
  },
  {
    fullName: 'Lionel Messi',
    nameFragment: 'messi',
    teamName: 'Argentina',
    teamTla: 'ARG',
    role: 'Forward',
    legacyContext: 'The 2022 title changed the debate forever. But Messi refuses to let it end. Each appearance now carries the weight of a farewell the world isn\'t ready for.',
    color: '#74ACDF',
  },
  {
    fullName: 'Jude Bellingham',
    nameFragment: 'bellingham',
    teamName: 'England',
    teamTla: 'ENG',
    role: 'Midfielder',
    legacyContext: 'Twenty-two years old and already carrying England\'s most intense hope since 1966. His ceiling is unknown. His ambition, absolute. A World Cup win would make him England\'s greatest.',
    color: '#CF081F',
  },
  {
    fullName: 'Alphonso Davies',
    nameFragment: 'davies',
    teamName: 'Canada',
    teamTla: 'CAN',
    role: 'Defender / Winger',
    legacyContext: 'From a Ghanaian refugee camp to the World Cup stage — Davies\'s story is football\'s most extraordinary narrative. He is not just a player. He is a national moment.',
    color: '#FF0000',
  },
  {
    fullName: 'Michael Olise',
    nameFragment: 'olise',
    teamName: 'France',
    teamTla: 'FRA',
    role: 'Winger',
    legacyContext: 'The breakout star waiting to happen. Olise\'s club form has been quietly breathtaking. The World Cup is his moment to step from elite to immortal.',
    color: '#ED2939',
  },
];

export function findSpotlightStats(
  player: SpotlightConfig,
  scorers: ApiScorer[],
  assistsList: ApiScorer[]
): { goals: number; assists: number; matches: number } {
  const all = [...scorers, ...assistsList];
  const match = all.find(s =>
    s.player.name.toLowerCase().includes(player.nameFragment.toLowerCase())
  );
  if (!match) return { goals: 0, assists: 0, matches: 0 };
  const st = match.statistics[0];
  return {
    goals: st?.goals.total ?? 0,
    assists: st?.goals.assists ?? 0,
    matches: st?.games.appearences ?? 0,
  };
}

export function getTeamFixtures(fixtures: ApiFixture[], teamName: string): ApiFixture[] {
  return fixtures
    .filter(f =>
      f.fixture.status.short === 'FT' &&
      (f.teams.home.name.toLowerCase().includes(teamName.toLowerCase()) ||
       f.teams.away.name.toLowerCase().includes(teamName.toLowerCase()))
    )
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 4);
}
