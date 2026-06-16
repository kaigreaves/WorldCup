const BASE = 'https://v3.football.api-sports.io';
const KEY = process.env.API_SPORTS_KEY ?? '';
const LEAGUE = 1;
const SEASON = 2026;

const headers = { 'x-apisports-key': KEY };

async function apiFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers, next: { revalidate } });
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

export interface StandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  description: string | null;
  all: { played: number; win: number; draw: number; lose: number };
}

export async function getStandings(): Promise<StandingEntry[][]> {
  interface RawStandings { league: { standings: StandingEntry[][] } }
  const res = await apiFetch<RawStandings[]>(`/standings?league=${LEAGUE}&season=${SEASON}`);
  return res?.[0]?.league?.standings ?? [];
}

export async function searchPlayer(name: string): Promise<ApiScorer | null> {
  const results = await apiFetch<ApiScorer[]>(`/players?search=${encodeURIComponent(name)}&league=${LEAGUE}&season=${SEASON}`);
  return results?.[0] ?? null;
}

// ── Storylines ────────────────────────────────────────────────────────────────

export interface Storyline {
  id: string;
  tag: string;
  headline: string;
  context: string;
  playerName: string;
  playerPhoto: string;
  teamName: string;
  teamLogo: string;
  goals: number;
  assists: number;
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
  if (goals === 1 && assists >= 1) return 'Goals and Assists';
  if (goals === 1) return 'First Blood';
  if (assists >= 1) return 'The Enabler';
  return 'Watch This Space';
}

// Unique headlines by rank position to avoid repeated templates when stats are similar
const RANK_HEADLINES: Record<number, (shortName: string, goals: number, assists: number, matches: number, team: string) => string> = {
  0: (s, g, a, m, t) => {
    if (g >= 2 && a >= 1) return `${s} leads the tournament and it isn't just the goals — it's how he's doing it for ${t}.`;
    if (g >= 2) return `${s} tops the leaderboard with ${g} goals. ${t} are built around him right now.`;
    if (g === 1 && a >= 1) return `${s} is the most complete performer at this World Cup so far. ${t} might go further than anyone expects.`;
    if (g === 1) return `${s} leads on points despite just one goal. The efficiency speaks for itself.`;
    if (a >= 2) return `${s} hasn't scored but he's creating everything for ${t}. The leaderboard knows it.`;
    return `${s} is the name at the top right now. ${t} go as far as he goes.`;
  },
  1: (s, g, a, m, t) => {
    if (g >= 2) return `${s} has ${g} goals in this tournament. That's not a hot streak — that's a statement.`;
    if (g === 1 && a >= 1) return `${s} is making things happen in every game for ${t}. The goal and assist are just the headline.`;
    if (g === 1) return `${s} got his goal. For someone with his ability, that's usually how it starts.`;
    if (a >= 2) return `${s} is the one making the play for ${t}. The goals aren't coming — but the chances are.`;
    return `${s} is quietly building a case. ${t} look different when he's involved.`;
  },
  2: (s, g, a, m, t) => {
    if (g >= 2) return `Two goals in the group stage. ${s} is turning ${t} into a team nobody wants to face.`;
    if (g === 1 && a >= 1) return `${s} contributed a goal and an assist. For ${t}, that might be enough to matter.`;
    if (g === 1) return `${s} opened his account and ${t} won. Sometimes the timing is everything.`;
    if (a >= 1) return `${s} set one up. Not always the story, but always part of it.`;
    return `${s} is in the conversation. The tournament isn't close to done with him.`;
  },
  3: (s, g, a, m, t) => {
    if (g >= 2) return `${s} has goals. ${t} have a player who is starting to look dangerous at the right time.`;
    if (g === 1) return `${s} scored. It counted. That's where the story starts for ${t}.`;
    if (a >= 1) return `${s} is getting involved for ${t}. The numbers don't fully show it yet.`;
    return `${s} is still finding his level at this tournament. The talent is not in question.`;
  },
  4: (s, g, a, m, t) => {
    if (g >= 1 || a >= 1) return `${s} has contributed. For ${t} to go far, they'll need more of it.`;
    return `${s} is here and ${t} will need him. The tournament sets the terms — not the player.`;
  },
};

function storyHeadline(name: string, goals: number, assists: number, matches: number, team: string, rank: number): string {
  const n = name.toLowerCase();
  const shortName = name.split(/\s+/).pop() ?? name;

  // Known legends get hand-written headlines
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
  if (n.includes('ronaldo') || n.includes('cr7')) {
    if (goals >= 2) return `Ronaldo is still scoring at a World Cup. At this point, disbelief is the only reasonable response.`;
    if (goals >= 1) return `Ronaldo has a goal. He will not pretend that isn't the point.`;
    return `Ronaldo hasn't scored. The weight of that is visible every time he touches the ball.`;
  }

  const fn = RANK_HEADLINES[Math.min(rank, 4)];
  return fn ? fn(shortName, goals, assists, matches, team) : `${shortName} is here. The tournament will have its say on his legacy soon enough.`;
}

// Factual context — what the player has actually done
function storyContext(name: string, goals: number, assists: number, matches: number, team: string): string {
  const n = name.toLowerCase();
  if (n.includes('messi')) return 'Every minute on this pitch is borrowed time. He plays like he knows it. Nobody wants it to end.';
  if (n.includes('mbappe') || n.includes('mbappé')) return "He was the best player at the last World Cup at 19. He's 27 now. This is the peak.";

  const parts: string[] = [];
  if (goals > 0) parts.push(`${goals} goal${goals > 1 ? 's' : ''}`);
  if (assists > 0) parts.push(`${assists} assist${assists > 1 ? 's' : ''}`);
  const statLine = parts.length > 0 ? parts.join(', ') : 'yet to score or assist';
  return `${statLine} in ${matches} appearance${matches !== 1 ? 's' : ''} for ${team}.`;
}

export function buildStorylines(entries: GreatnessEntry[]): Storyline[] {
  return entries.slice(0, 5).map((e, i) => ({
    id: String(e.player.id),
    tag: storyTag(e.player.name, e.goals, e.assists),
    headline: storyHeadline(e.player.name, e.goals, e.assists, e.matches, e.team.name, i),
    context: storyContext(e.player.name, e.goals, e.assists, e.matches, e.team.name),
    playerName: e.player.name,
    playerPhoto: e.player.photo,
    teamName: e.team.name,
    teamLogo: e.team.logo,
    goals: e.goals,
    assists: e.assists,
  }));
}

// ── Static player → team mapping (for performers not in scorer data) ──────────

export const PLAYER_TEAM_MAP: Record<string, string> = {
  // France
  'mbappé': 'France', 'mbappe': 'France', 'dembélé': 'France', 'dembele': 'France',
  'griezmann': 'France', 'giroud': 'France', 'camavinga': 'France', 'tchouaméni': 'France',
  'tchouameni': 'France', 'maignan': 'France', 'upamecano': 'France', 'rabiot': 'France',
  'hernandez': 'France', 'saliba': 'France', 'thuram': 'France', 'olise': 'France',
  'barcola': 'France', 'kante': 'France', 'kanté': 'France',
  // Argentina
  'messi': 'Argentina', 'di maria': 'Argentina', 'álvarez': 'Argentina', 'alvarez': 'Argentina',
  'de paul': 'Argentina', 'mac allister': 'Argentina', 'martinez': 'Argentina', 'dibu': 'Argentina',
  'romero': 'Argentina', 'molina': 'Argentina', 'tagliafico': 'Argentina',
  // England
  'bellingham': 'England', 'saka': 'England', 'kane': 'England', 'foden': 'England',
  'walker': 'England', 'trippier': 'England', 'pickford': 'England', 'mainoo': 'England',
  'palmer': 'England', 'gordon': 'England',
  // Brazil
  'vinicius': 'Brazil', 'vinicius jr': 'Brazil', 'rodrygo': 'Brazil', 'endrick': 'Brazil',
  'paquetá': 'Brazil', 'paqueta': 'Brazil', 'militão': 'Brazil', 'militao': 'Brazil',
  'marquinhos': 'Brazil', 'alisson': 'Brazil', 'raphinha': 'Brazil',
  // Spain
  'yamal': 'Spain', 'pedri': 'Spain', 'nico williams': 'Spain', 'morata': 'Spain',
  'rodri': 'Spain', 'carvajal': 'Spain', 'laporte': 'Spain', 'ferran': 'Spain',
  'gavi': 'Spain', 'le normand': 'Spain',
  // Germany
  'musiala': 'Germany', 'wirtz': 'Germany', 'rüdiger': 'Germany', 'rudiger': 'Germany',
  'kimmich': 'Germany', 'havertz': 'Germany', 'undav': 'Germany', 'brown': 'Germany',
  'gnabry': 'Germany', 'sane': 'Germany', 'müller': 'Germany', 'muller': 'Germany',
  'neuer': 'Germany', 'ayari': 'Germany',
  // Portugal
  'ronaldo': 'Portugal', 'bruno fernandes': 'Portugal', 'leão': 'Portugal', 'leao': 'Portugal',
  'felix': 'Portugal', 'carvalho': 'Portugal', 'cancelo': 'Portugal', 'bernardo': 'Portugal',
  // Belgium
  'lukaku': 'Belgium', 'de bruyne': 'Belgium', 'doku': 'Belgium', 'tielemans': 'Belgium',
  'carrasco': 'Belgium', 'vertonghen': 'Belgium', 'courtois': 'Belgium', 'witsel': 'Belgium',
  // Netherlands
  'van dijk': 'Netherlands', 'gakpo': 'Netherlands', 'de jong': 'Netherlands',
  'dumfries': 'Netherlands', 'weghorst': 'Netherlands', 'zirkzee': 'Netherlands',
  'simons': 'Netherlands',
  // USA
  'pulisic': 'United States', 'balogun': 'United States', 'reyna': 'United States',
  'mckennie': 'United States', 'musah': 'United States', 'weah': 'United States',
  // Canada
  'davies': 'Canada', 'jonathan david': 'Canada', 'buchanan': 'Canada', 'larin': 'Canada',
  // Mexico
  'lozano': 'Mexico', 'alvarez edson': 'Mexico',
  // Morocco
  'hakimi': 'Morocco', 'en-nesyri': 'Morocco', 'ziyech': 'Morocco', 'amrabat': 'Morocco',
  // South Korea
  'son': 'South Korea', 'hwang': 'South Korea', 'lee': 'South Korea',
  // Egypt
  'salah': 'Egypt', 'mo salah': 'Egypt',
  // Nigeria
  'osimhen': 'Nigeria',
  // Poland
  'lewandowski': 'Poland',
  // Georgia
  'kvaratskhelia': 'Georgia', 'kvara': 'Georgia',
  // Sweden
  'isak': 'Sweden', 'forsberg': 'Sweden',
};

// Build team name → logo from fixtures
export function buildTeamFlagMap(fixtures: ApiFixture[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fixtures) {
    map[f.teams.home.name] = f.teams.home.logo;
    map[f.teams.away.name] = f.teams.away.logo;
  }
  return map;
}

// Build team name (lowercase) → rank within their group, from standings
export function buildTeamRankMap(standings: StandingEntry[][]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const group of standings) {
    for (const entry of group) {
      map[entry.team.name.toLowerCase()] = entry.rank;
    }
  }
  return map;
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
    const efficiency = matches > 0 ? (goals + assists) / matches : 0;
    const effBonus = efficiency >= 2 ? 4 : efficiency >= 1 ? 2 : 0;
    const score = goals * 10 + assists * 6 + effBonus + matches;
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
    const efficiency = matches > 0 ? (goals + assists) / matches : 0;
    const effBonus = efficiency >= 2 ? 4 : efficiency >= 1 ? 2 : 0;
    const score = goals * 10 + assists * 6 + effBonus + matches;
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
  teamLogo?: string;
  playerPhoto?: string;
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
    teamLogo: 'https://media.api-sports.io/football/teams/2.png',
    playerPhoto: 'https://media.api-sports.io/football/players/278.png',
    role: 'Forward',
    legacyContext: 'Already the most expensive player in history. This tournament is his coronation — or his question mark.',
    color: '#002395',
  },
  {
    fullName: 'Lionel Messi',
    nameFragment: 'messi',
    teamName: 'Argentina',
    teamTla: 'ARG',
    teamLogo: 'https://media.api-sports.io/football/teams/26.png',
    playerPhoto: 'https://media.api-sports.io/football/players/154.png',
    role: 'Forward',
    legacyContext: 'The 2022 title changed the debate forever. But Messi refuses to let it end.',
    color: '#74ACDF',
  },
];

// Accent colours for dynamic spotlight slots
const DYNAMIC_COLORS = ['#C9A84C', '#ED2939', '#4ade80'];

// Returns Mbappé + Messi always, then the top 3 performers from the leaderboard
export function buildSpotlightPlayers(entries: GreatnessEntry[], scorers: ApiScorer[] = [], assists: ApiScorer[] = []): SpotlightConfig[] {
  const allPlayers = [...scorers, ...assists];

  // Resolve team logo + photo for fixed spotlight players from the scorer lists
  // Only overrides hardcoded values when a live API match is found
  function resolveFixed(cfg: SpotlightConfig): SpotlightConfig {
    const match = allPlayers.find(s =>
      s.player.name.toLowerCase().includes(cfg.nameFragment) ||
      cfg.nameFragment.includes(s.player.name.toLowerCase().replace(/[^a-z]/g, ''))
    );
    if (!match) return cfg;
    return {
      ...cfg,
      teamLogo: match.statistics[0]?.team.logo ?? cfg.teamLogo,
      playerPhoto: match.player.photo ?? cfg.playerPhoto,
    };
  }

  const fixedNames = new Set(FIXED_SPOTLIGHT.map(p => p.nameFragment));
  const dynamic = entries
    .filter(e => !fixedNames.has(e.player.name.toLowerCase().replace(/[éèêë]/g, 'e').replace(/\s+/g, '')))
    .slice(0, 3)
    .map((e, i) => {
      const nameParts = e.player.name.split(/\s+/);
      const lastName = nameParts[nameParts.length - 1] ?? e.player.name;
      return {
        fullName: e.player.name,
        nameFragment: lastName.toLowerCase().replace(/[^a-z]/g, ''),
        teamName: e.team.name,
        teamTla: e.team.name.substring(0, 3).toUpperCase(),
        teamLogo: e.team.logo,
        playerPhoto: e.player.photo,
        role: 'Forward',
        legacyContext: storyContext(e.player.name, e.goals, e.assists, e.matches, e.team.name),
        color: DYNAMIC_COLORS[i] ?? '#C9A84C',
      } as SpotlightConfig;
    });
  return [...FIXED_SPOTLIGHT.map(resolveFixed), ...dynamic];
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
