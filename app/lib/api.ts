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

// ── Storylines ────────────────────────────────────────────────────────────────

export interface Storyline {
  id: string;
  tag: string;
  headline: string;
  context: string;
  playerName: string;
  teamName: string;
}

function storyTag(name: string, goals: number, assists: number): string {
  const n = name.toLowerCase();
  if (n.includes('messi')) return 'The Final Chapter';
  if (n.includes('mbappe') || n.includes('mbappé')) return 'The Favourite';
  if (n.includes('ronaldo') || n.includes('cr7')) return 'One Last Run';
  if (goals >= 4) return 'Untouchable';
  if (goals >= 2 && assists >= 1) return 'In Full Flight';
  if (assists >= 3) return 'The Architect';
  if (goals >= 2) return 'Making His Case';
  if (goals === 1) return 'First Blood';
  if (assists >= 1) return 'The Enabler';
  return 'Watch This Space';
}

function storyHeadline(name: string, goals: number, assists: number, _matches: number, team: string): string {
  const n = name.toLowerCase();
  const shortName = name.split(/\s+/).pop() ?? name;
  if (n.includes('messi')) {
    if (goals >= 3) return `Messi is refusing to let this be his last World Cup story. ${goals} goals. This is a farewell nobody asked for.`;
    if (goals >= 1) return `Messi has scored. That still means something different to everything else happening on this pitch.`;
    return `Messi hasn't found his goal yet. The wait only makes it heavier.`;
  }
  if (n.includes('mbappe') || n.includes('mbappé')) {
    if (goals >= 3) return `Mbappé is doing it again. France are his team and this is his tournament to own.`;
    if (goals >= 1) return `Mbappé is on the board. The rest of this World Cup is on notice.`;
    return `Mbappé hasn't scored yet. Which only means the world is still waiting.`;
  }
  if (goals >= 4) return `${name} is the best player at this World Cup right now. It's not a debate.`;
  if (goals >= 3) return `${shortName} has ${goals} goals. ${team} are going deep because of him.`;
  if (goals >= 2 && assists >= 1) return `${shortName}: ${goals} goals, ${assists} assists. He's carrying ${team} and making it look easy.`;
  if (goals >= 2) return `${shortName} has ${goals} goals in the tournament. ${team} go as far as he takes them.`;
  if (goals === 1 && assists >= 2) return `${shortName} doesn't need the headlines. The assists column is telling the real story.`;
  if (goals === 1) return `${shortName} is on the board. The question now is whether this is the start of something.`;
  if (assists >= 2) return `${shortName} isn't finishing but he's making everything happen for ${team}.`;
  return `${shortName} is here. The tournament will have its say on his legacy soon enough.`;
}

function storyContext(name: string, goals: number, assists: number): string {
  const n = name.toLowerCase();
  if (n.includes('messi')) return 'Every minute on this pitch is borrowed time. He plays like he knows it. Nobody wants it to end.';
  if (n.includes('mbappe') || n.includes('mbappé')) return "He was the best player at the last World Cup at 19. He's 27 now. This is the peak.";
  if (goals >= 4) return "This is what it looks like when a player is in the middle of their defining tournament. You only fully understand it later.";
  if (goals >= 2 && assists >= 1) return "Goals and assists at a World Cup. That's the complete picture of a player operating at his ceiling.";
  if (goals >= 2) return "Two World Cup goals is a resume line. Three is a legacy. He's already past the first marker.";
  if (goals === 1) return "He opened his account. In a tournament that moves this fast, the first one always matters.";
  if (assists >= 2) return "The assists don't always make the front page. They should. Goals don't happen without him.";
  return "The tournament isn't finished writing his story. These are the arcs worth following.";
}

export function buildStorylines(entries: GreatnessEntry[]): Storyline[] {
  return entries.slice(0, 5).map(e => ({
    id: String(e.player.id),
    tag: storyTag(e.player.name, e.goals, e.assists),
    headline: storyHeadline(e.player.name, e.goals, e.assists, e.matches, e.team.name),
    context: storyContext(e.player.name, e.goals, e.assists),
    playerName: e.player.name,
    teamName: e.team.name,
  }));
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

const FIXED_SPOTLIGHT: SpotlightConfig[] = [
  {
    fullName: 'Kylian Mbappé',
    nameFragment: 'mbappe',
    teamName: 'France',
    teamTla: 'FRA',
    role: 'Forward',
    legacyContext: 'Already the most expensive player in history. This tournament is his coronation — or his question mark.',
    color: '#002395',
  },
  {
    fullName: 'Lionel Messi',
    nameFragment: 'messi',
    teamName: 'Argentina',
    teamTla: 'ARG',
    role: 'Forward',
    legacyContext: 'The 2022 title changed the debate forever. But Messi refuses to let it end.',
    color: '#74ACDF',
  },
];

// Accent colours for dynamic spotlight slots
const DYNAMIC_COLORS = ['#C9A84C', '#ED2939', '#4ade80'];

// Returns Mbappé + Messi always, then the top 3 performers from the leaderboard
export function buildSpotlightPlayers(entries: GreatnessEntry[]): SpotlightConfig[] {
  const fixedNames = new Set(FIXED_SPOTLIGHT.map(p => p.nameFragment));
  const dynamic = entries
    .filter(e => !fixedNames.has(e.player.name.toLowerCase().replace(/[éèê]/g, 'e').replace(/\s+/g, '')))
    .slice(0, 3)
    .map((e, i) => {
      const nameParts = e.player.name.split(/\s+/);
      const lastName = nameParts[nameParts.length - 1] ?? e.player.name;
      return {
        fullName: e.player.name,
        nameFragment: lastName.toLowerCase().replace(/[^a-z]/g, ''),
        teamName: e.team.name,
        teamTla: e.team.name.substring(0, 3).toUpperCase(),
        role: 'Forward',
        legacyContext: storyContext(e.player.name, e.goals, e.assists),
        color: DYNAMIC_COLORS[i] ?? '#C9A84C',
      } as SpotlightConfig;
    });
  return [...FIXED_SPOTLIGHT, ...dynamic];
}

export const SPOTLIGHT_PLAYERS = FIXED_SPOTLIGHT;

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
