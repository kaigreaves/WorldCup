const BASE = 'https://v3.football.api-sports.io';
const KEY = process.env.API_SPORTS_KEY ?? '';
const LEAGUE = 1;
const SEASON = 2026;

const headers = { 'x-apisports-key': KEY };

function hasApiError(errors: unknown): boolean {
  // api-sports returns HTTP 200 even when rate-limited — the only signal is a
  // non-empty `errors` field (an empty array `[]` on success, an object with
  // keys like `rateLimit` on failure). Treating a 200 as automatically valid
  // silently accepts rate-limited responses as if they were real empty data.
  if (!errors) return false;
  return Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;
}

// ── API quota tracker ─────────────────────────────────────────────────────────
// api-sports returns X-RateLimit-Requests-Limit and X-RateLimit-Requests-Remaining
// on every response. We log a warning when remaining calls are low so we can
// catch overages before they happen. Logs appear in Vercel Function logs.

function logQuota(res: Response, path: string) {
  const limit     = res.headers.get('X-RateLimit-Requests-Limit');
  const remaining = res.headers.get('X-RateLimit-Requests-Remaining');
  if (!limit || !remaining) return;
  const used = parseInt(limit) - parseInt(remaining);
  const pct  = Math.round((used / parseInt(limit)) * 100);

  if (parseInt(remaining) <= 10) {
    console.error(`[API-SPORTS] ⚠️  CRITICAL: only ${remaining}/${limit} calls left today (${pct}% used) — ${path}`);
  } else if (parseInt(remaining) <= 25) {
    console.warn(`[API-SPORTS] ⚠️  LOW: ${remaining}/${limit} calls remaining (${pct}% used) — ${path}`);
  } else {
    console.log(`[API-SPORTS] quota: ${remaining}/${limit} remaining (${pct}% used) — ${path}`);
  }
}

async function apiFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Retry uses a cache-busting header (not a query param — api-sports
      // rejects any unrecognized query param outright, and not `cache: 'no-store'`,
      // since a `no-store` fetch anywhere in a route forces the *entire* page to
      // render dynamically on every request, killing 5-minute ISR for everything
      // else on the page, not just this one call).
      const reqHeaders = attempt === 0 ? headers : { ...headers, 'X-Retry-Attempt': String(Date.now()) };
      const res = await fetch(`${BASE}${path}`, { headers: reqHeaders, next: { revalidate } });
      logQuota(res, path);
      if (!res.ok) return null;
      const json = await res.json() as { response: T; errors?: unknown };
      if (hasApiError(json.errors)) {
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
          continue;
        }
        return null;
      }
      return json.response;
    } catch {
      if (attempt === 0) continue;
      return null;
    }
  }
  return null;
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
  return apiFetch<ApiFixture[]>(`/fixtures?league=${LEAGUE}&season=${SEASON}`, 300);
}

export async function getTopScorers(): Promise<ApiScorer[] | null> {
  return apiFetch<ApiScorer[]>(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`, 300);
}

export async function getTopAssists(): Promise<ApiScorer[] | null> {
  return apiFetch<ApiScorer[]>(`/players/topassists?league=${LEAGUE}&season=${SEASON}`, 300);
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
  const res = await apiFetch<RawStandings[]>(`/standings?league=${LEAGUE}&season=${SEASON}`, 300);
  return res?.[0]?.league?.standings ?? [];
}

export async function searchPlayer(name: string): Promise<ApiScorer | null> {
  const results = await apiFetch<ApiScorer[]>(`/players?search=${encodeURIComponent(name)}&league=${LEAGUE}&season=${SEASON}`);
  return results?.[0] ?? null;
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

// ── Legacy Leaderboard ────────────────────────────────────────────────────────
// Multi-factor scoring: goal context (equalizer/winner/PK), opponent quality,
// stage multiplier, keeper/defender contributions, hat trick bonuses.

// Pre-tournament FIFA rankings — stable, not affected by group stage results
const FIFA_RANKINGS: Record<string, number> = {
  'Argentina': 1, 'France': 2, 'England': 3, 'Belgium': 4, 'Brazil': 5,
  'Portugal': 6, 'Netherlands': 7, 'Spain': 8, 'Croatia': 9, 'Italy': 10,
  'Germany': 11, 'Uruguay': 12, 'Colombia': 13, 'Mexico': 14,
  'United States': 15, 'USA': 15, 'Senegal': 16, 'Morocco': 17,
  'Switzerland': 18, 'Japan': 19, 'Denmark': 22, 'Poland': 23,
  'Australia': 24, 'Serbia': 25, 'Sweden': 25, 'Canada': 27,
  'Ecuador': 28, 'Turkey': 30, 'Ukraine': 31, 'Cameroon': 32,
  'Ghana': 33, 'Tunisia': 34, 'Chile': 35, 'Nigeria': 36,
  'Algeria': 37, 'Peru': 38, 'Egypt': 39, 'Saudi Arabia': 40,
  'Korea Republic': 26, 'South Korea': 26,
  'IR Iran': 19, 'Iran': 19,
  "Côte d'Ivoire": 21, 'Ivory Coast': 21,
  'Bosnia & Herzegovina': 45, 'Costa Rica': 42,
  'New Zealand': 70, 'Cape Verde Islands': 58, 'Cape Verde': 58,
  'Georgia': 75, 'Panama': 46, 'Paraguay': 43,
  'Venezuela': 45, 'Bolivia': 44, 'Honduras': 48,
  'El Salvador': 49, 'Jamaica': 47, 'Haiti': 50,
  'Indonesia': 130, 'Tanzania': 118, 'Guatemala': 51,
  'Trinidad and Tobago': 52, 'Iraq': 60, 'Qatar': 41,
};

export function getOQS(teamName: string, standings: StandingEntry[][]): number {
  const rank = FIFA_RANKINGS[teamName] ?? 90;
  // Steep curve: rank 1 → 1.0, rank 51 → 0.1
  const fifaScore = Math.max(0.1, 1 - (rank - 1) / 50);
  // Tournament form: points per game, 0–1 scale
  const entry = standings.flat().find(s => s.team.name === teamName);
  let tournScore = 0.3;
  if (entry && entry.all.played > 0) {
    tournScore = Math.min(1.0, entry.points / (entry.all.played * 3));
  }
  // 0.6 floor keeps OQS range narrow (0.6–1.0) so 2 goals vs weaker team
  // always beats 1 goal vs stronger team — quality matters but doesn't dominate
  return 0.6 + 0.4 * (fifaScore * 0.7 + tournScore * 0.3);
}

export function getStageMultiplier(round: string): number {
  const r = round.toLowerCase();
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter') && !r.includes('3rd')) return 2.5;
  if (r.includes('semi')) return 2.0;
  if (r.includes('quarter')) return 1.6;
  if (r.includes('16') || r.includes('round of 32')) return 1.3;
  return 1.0; // group stage
}

// ── Fixture event fetching (cached 24h — immutable once match ends) ───────────

export interface RawEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
}

interface RawFixturePlayer {
  team: { id: number; name: string; logo: string };
  players: Array<{
    player: { id: number; name: string; photo: string };
    statistics: Array<{
      games: { position: string; minutes: number | null; substitute: boolean; rating: string | null };
      goals: { total: number | null; conceded: number | null; saves: number | null };
      tackles: { total: number | null; interceptions: number | null; blocks: number | null };
      duels: { total: number | null; won: number | null };
      penalty: { saved: number | null };
    }>;
  }>;
}

export async function getFixtureEvents(fixtureId: number): Promise<RawEvent[]> {
  return (await apiFetch<RawEvent[]>(`/fixtures/events?fixture=${fixtureId}`, 86400)) ?? [];
}

export async function getFixturePlayerStats(fixtureId: number): Promise<RawFixturePlayer[]> {
  return (await apiFetch<RawFixturePlayer[]>(`/fixtures/players?fixture=${fixtureId}`, 86400)) ?? [];
}

// ── Goal classification ───────────────────────────────────────────────────────

interface ClassifiedGoal {
  scorerPlayerId: number;
  scorerName: string;
  assistPlayerId: number | null;
  assistName: string | null;
  teamId: number;
  isPenalty: boolean;
  isEqualizer: boolean;
  isGameWinner: boolean;
}

export function classifyGoals(
  events: RawEvent[],
  homeTeamId: number,
  finalHomeScore: number,
  finalAwayScore: number,
): ClassifiedGoal[] {
  const goalEvents = events
    .filter(e => e.type === 'Goal' && e.detail !== 'Own Goal' && e.detail !== 'Missed Penalty')
    .sort((a, b) => (a.time.elapsed + (a.time.extra ?? 0)) - (b.time.elapsed + (b.time.extra ?? 0)));

  let homeScore = 0;
  let awayScore = 0;

  const classified: ClassifiedGoal[] = goalEvents.map(e => {
    const isHome = e.team.id === homeTeamId;
    const prevHome = homeScore;
    const prevAway = awayScore;
    if (isHome) homeScore++; else awayScore++;

    const wasLosing = isHome ? prevHome < prevAway : prevAway < prevHome;
    const nowLevel = homeScore === awayScore;

    return {
      scorerPlayerId: e.player.id,
      scorerName: e.player.name,
      assistPlayerId: e.assist.id,
      assistName: e.assist.name,
      teamId: e.team.id,
      isPenalty: e.detail === 'Penalty',
      isEqualizer: wasLosing && nowLevel,
      isGameWinner: false,
      _homeAfter: homeScore,
      _awayAfter: awayScore,
    } as ClassifiedGoal & { _homeAfter: number; _awayAfter: number };
  });

  // Find game-winning goal: last goal by winning team from which lead was never surrendered
  const homeWon = finalHomeScore > finalAwayScore;
  const awayWon = finalAwayScore > finalHomeScore;
  if (homeWon || awayWon) {
    const winTeamIsHome = homeWon;
    for (let i = classified.length - 1; i >= 0; i--) {
      const g = classified[i] as ClassifiedGoal & { _homeAfter: number; _awayAfter: number };
      const isWinTeam = winTeamIsHome ? g.teamId === homeTeamId : g.teamId !== homeTeamId;
      if (!isWinTeam) continue;
      const lead = winTeamIsHome ? g._homeAfter - g._awayAfter : g._awayAfter - g._homeAfter;
      if (lead <= 0) continue;
      // Check no subsequent goal erased the lead
      const leadHeld = !(classified.slice(i + 1) as (ClassifiedGoal & { _homeAfter: number; _awayAfter: number })[]).some(later => {
        const laterLead = winTeamIsHome ? later._homeAfter - later._awayAfter : later._awayAfter - later._homeAfter;
        return laterLead <= 0;
      });
      if (leadHeld) { g.isGameWinner = true; break; }
    }
  }

  return classified;
}

// ── Main legacy computation ───────────────────────────────────────────────────

export interface LegacyEntry {
  rank: number;
  playerId: number;
  name: string;
  photo: string;
  teamName: string;
  teamLogo: string;
  position: string; // 'G' | 'D' | 'M' | 'F'
  // Display stats
  goals: number;
  assists: number;
  matches: number;
  cleanSheets: number;
  penaltiesSaved: number;
  equalizerGoals: number;
  gameWinningGoals: number;
  hatTricks: number;
  // Score
  legacyScore: number;
}

export async function computeLegacyLeaderboard(
  fixtures: ApiFixture[],
  scorers: ApiScorer[],
  assistsList: ApiScorer[],
  standings: StandingEntry[][],
): Promise<LegacyEntry[]> {
  const finishedFixtures = fixtures.filter(f =>
    f.fixture.status.short === 'FT' ||
    f.fixture.status.short === 'AET' ||
    f.fixture.status.short === 'PEN'
  );

  // Fallback team logos from fixture data (always available)
  const teamLogoMap: Record<string, string> = {};
  for (const f of fixtures) {
    teamLogoMap[f.teams.home.name] = f.teams.home.logo;
    teamLogoMap[f.teams.away.name] = f.teams.away.logo;
  }
  // Also build from scorer/assist data
  for (const s of [...scorers, ...assistsList]) {
    const st = s.statistics[0];
    if (st) teamLogoMap[st.team.name] = st.team.logo;
  }

  // Fetch events + player stats for all finished fixtures (24h cache).
  // Batched in small groups instead of firing every request at once — api-sports
  // enforces a per-minute rate limit well below what a 16-fixture × 2-endpoint
  // burst needs, and silently rejecting most of them is what caused real
  // goals/assists to disappear from the leaderboard.
  // Small batch size — the observed failure looks like a concurrent-in-flight-
  // requests cap rather than a per-minute quota (the per-minute budget has
  // plenty of headroom even when bursts fail), so keep simultaneous requests low.
  // Fixture events/stats are cached 24h in Vercel Data Cache, so real API
  // calls only happen on the very first ever cold start. The outer unstable_cache
  // (60s TTL) means this function body runs at most once per minute. Use a
  // larger batch size and minimal delay — the old 700ms sleep was the primary
  // cause of Vercel function timeouts (25 fixtures × 700ms = 8.75s, close to
  // or exceeding the 10s limit before any actual network time was counted).
  const BATCH_SIZE = 6;
  const allEvents: RawEvent[][] = [];
  const allPlayerStats: RawFixturePlayer[][] = [];
  for (let i = 0; i < finishedFixtures.length; i += BATCH_SIZE) {
    const batch = finishedFixtures.slice(i, i + BATCH_SIZE);
    const [eventsBatch, playerStatsBatch] = await Promise.all([
      Promise.all(batch.map(f => getFixtureEvents(f.fixture.id))),
      Promise.all(batch.map(f => getFixturePlayerStats(f.fixture.id))),
    ]);
    allEvents.push(...eventsBatch);
    allPlayerStats.push(...playerStatsBatch);
    if (i + BATCH_SIZE < finishedFixtures.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // ── Per-player accumulators ───────────────────────────────────────────────

  interface PlayerAcc {
    playerId: number;
    name: string;
    photo: string;
    teamName: string;
    teamLogo: string;
    position: string;
    legacyScore: number;
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    penaltiesSaved: number;
    equalizerGoals: number;
    gameWinningGoals: number;
    goalsPerMatch: Map<number, number>; // fixtureId → goals in that match
    // Keeper/defender accumulation
    totalSaves: number;
    minutesPlayed: number;
    tackles: number;
    interceptions: number;
    blocks: number;
    matchesPlayed: number;
  }

  const players = new Map<number, PlayerAcc>();

  function getPlayer(id: number, name: string, photo: string, teamName: string, teamLogo: string, position: string): PlayerAcc {
    if (!players.has(id)) {
      players.set(id, {
        playerId: id, name, photo, teamName, teamLogo, position,
        legacyScore: 0, goals: 0, assists: 0, matches: 0,
        cleanSheets: 0, penaltiesSaved: 0, equalizerGoals: 0, gameWinningGoals: 0,
        goalsPerMatch: new Map(), totalSaves: 0, minutesPlayed: 0,
        tackles: 0, interceptions: 0, blocks: 0, matchesPlayed: 0,
      });
    }
    return players.get(id)!;
  }

  // ── Process each fixture ──────────────────────────────────────────────────

  for (let fi = 0; fi < finishedFixtures.length; fi++) {
    const fix = finishedFixtures[fi];
    const events = allEvents[fi];
    const playerStats = allPlayerStats[fi];

    const homeTeamId = fix.teams.home.id;
    const finalHomeScore = fix.goals.home ?? 0;
    const finalAwayScore = fix.goals.away ?? 0;
    const round = fix.league.round;
    const stageMultiplier = getStageMultiplier(round);

    const homeOQS = getOQS(fix.teams.away.name, standings); // scoring vs the other team
    const awayOQS = getOQS(fix.teams.home.name, standings);

    // Classify goals
    const goals = classifyGoals(events, homeTeamId, finalHomeScore, finalAwayScore);

    // Count goals per player in this fixture (for hat trick detection)
    const goalsThisMatch = new Map<number, number>();
    for (const g of goals) {
      goalsThisMatch.set(g.scorerPlayerId, (goalsThisMatch.get(g.scorerPlayerId) ?? 0) + 1);
    }

    // Score each goal
    for (const g of goals) {
      const oqs = g.teamId === homeTeamId ? homeOQS : awayOQS;
      const baseGoal = g.isPenalty ? 7 : 10;
      const contextBonus = g.isEqualizer ? 6 : g.isGameWinner ? 8 : 0;
      const pts = (baseGoal + contextBonus) * oqs * stageMultiplier;

      // Scorer — look up from player stats for photo/team
      const scorerStats = playerStats.flatMap(t => t.players).find(p => p.player.id === g.scorerPlayerId);
      const teamEntry = playerStats.find(t => t.players.some(p => p.player.id === g.scorerPlayerId));
      const scorerTeamName = teamEntry?.team.name ?? (g.teamId === homeTeamId ? fix.teams.home.name : fix.teams.away.name);
      const scorer = getPlayer(
        g.scorerPlayerId, g.scorerName,
        scorerStats?.player.photo ?? '',
        scorerTeamName,
        teamEntry?.team.logo ?? teamLogoMap[scorerTeamName] ?? '',
        scorerStats?.statistics[0]?.games.position ?? 'F',
      );
      scorer.legacyScore += pts;
      scorer.goals += 1;
      if (g.isEqualizer) scorer.equalizerGoals += 1;
      if (g.isGameWinner) scorer.gameWinningGoals += 1;
      const matchGoals = (scorer.goalsPerMatch.get(fix.fixture.id) ?? 0) + 1;
      scorer.goalsPerMatch.set(fix.fixture.id, matchGoals);

      // Assist
      if (g.assistPlayerId) {
        const baseAssist = g.isPenalty ? 1 : 6;
        const assistBonus = (!g.isPenalty && (g.isEqualizer || g.isGameWinner)) ? 3 : 0;
        const assistPts = (baseAssist + assistBonus) * oqs * stageMultiplier;

        const aStats = playerStats.flatMap(t => t.players).find(p => p.player.id === g.assistPlayerId);
        const aTeam = playerStats.find(t => t.players.some(p => p.player.id === g.assistPlayerId));
        const aTeamName = aTeam?.team.name ?? (g.teamId === homeTeamId ? fix.teams.home.name : fix.teams.away.name);
        const assister = getPlayer(
          g.assistPlayerId, g.assistName ?? '',
          aStats?.player.photo ?? '',
          aTeamName,
          aTeam?.team.logo ?? teamLogoMap[aTeamName] ?? '',
          aStats?.statistics[0]?.games.position ?? 'M',
        );
        assister.legacyScore += assistPts;
        assister.assists += 1;
      }
    }

    // Hat trick bonus (per match)
    for (const [pid, gCount] of goalsThisMatch) {
      if (gCount >= 3) {
        const p = players.get(pid);
        if (p) p.legacyScore += 15;
      }
    }

    // ── Keeper & defender stats from fixture player data ──────────────────

    for (const teamData of playerStats) {
      const isHomeTeam = teamData.team.id === homeTeamId;
      const teamOQS = isHomeTeam ? homeOQS : awayOQS;
      const teamConceded = isHomeTeam ? finalAwayScore : finalHomeScore;

      for (const { player, statistics } of teamData.players) {
        const stat = statistics[0];
        if (!stat) continue;
        const pos = stat.games.position;
        const mins = stat.games.minutes ?? 0;
        if (mins === 0 && stat.games.substitute) continue; // didn't play

        const tLogo = teamData.team.logo || teamLogoMap[teamData.team.name] || '';
        const p = getPlayer(player.id, player.name, player.photo, teamData.team.name, tLogo, pos);
        p.matchesPlayed += 1;
        p.minutesPlayed += mins;

        if (pos === 'G') {
          // Goalkeeper scoring
          const saves = stat.goals.saves ?? 0;
          const pkSaved = stat.penalty.saved ?? 0;
          const cleanSheet = teamConceded === 0 && mins >= 60;

          p.totalSaves += saves;
          p.penaltiesSaved += pkSaved;
          if (cleanSheet) {
            p.cleanSheets += 1;
            p.legacyScore += 8 * teamOQS * stageMultiplier;
          }
          p.legacyScore += pkSaved * 10 * teamOQS * stageMultiplier;
          // Saves above average (>4 per game): small bonus
          if (saves > 4) p.legacyScore += (saves - 4) * 0.4;

        } else if (pos === 'D') {
          // Defender — accumulate raw stats for qualifying check later
          p.tackles += stat.tackles.total ?? 0;
          p.interceptions += stat.tackles.interceptions ?? 0;
          p.blocks += stat.tackles.blocks ?? 0;
          // Clean sheet partial credit
          const cleanSheet = teamConceded === 0 && mins >= 60;
          if (cleanSheet) {
            p.cleanSheets += 1;
            p.legacyScore += 5 * teamOQS * stageMultiplier;
          }
        }
      }
    }
  }

  // ── Consistency bonus for all tracked players ─────────────────────────────

  // Seed match counts + fallback scoring from the aggregate scorer/assist feed.
  // The per-fixture event calls above can be rate-limited in production (api-sports
  // returns HTTP 200 with a rateLimit error body that Next then caches for up to
  // 24h), scoring zero goals for any player whose fixtures didn't load — which is
  // why a prolific scorer can collapse to just the consistency bonus. The
  // top-scorer/assist lists are two cheap calls that almost always load, so we use
  // them as a floor: award baseline points for any goals/assists the event loop
  // didn't already count. When events DO load, the counted totals match the
  // aggregate, so missingGoals/missingAssists are 0 and this adds nothing — no
  // double-counting, no regression to the detailed contextual scoring.
  for (const s of [...scorers, ...assistsList]) {
    const st = s.statistics[0];
    if (!st) continue;
    let p = players.get(s.player.id);
    if (!p) {
      p = getPlayer(
        s.player.id, s.player.name, s.player.photo,
        st.team.name, st.team.logo || teamLogoMap[st.team.name] || '', 'F',
      );
    }
    p.matches = Math.max(p.matches, st.games.appearences ?? 0);

    const aggGoals = st.goals.total ?? 0;
    const aggAssists = st.goals.assists ?? 0;
    const missingGoals = Math.max(0, aggGoals - p.goals);
    const missingAssists = Math.max(0, aggAssists - p.assists);
    if (missingGoals > 0 || missingAssists > 0) {
      // Neutral estimate — no opponent-quality or goal-context data is available
      // from the aggregate feed, so use the midpoint of the event-based range
      // (~8 pts/goal, ~5 pts/assist). Enough to rank a real scorer correctly
      // without overshooting players whose context bonuses we can't see.
      p.legacyScore += missingGoals * 8 + missingAssists * 5;
      p.goals = Math.max(p.goals, aggGoals);
      p.assists = Math.max(p.assists, aggAssists);
    }
  }

  // Apply consistency bonus (small, doesn't dominate)
  for (const p of players.values()) {
    const m = p.matches || p.matchesPlayed;
    p.legacyScore += m * 0.5;
  }

  // ── Hat trick count (for display) ─────────────────────────────────────────

  // ── Build final entries ───────────────────────────────────────────────────

  const allEntries: LegacyEntry[] = Array.from(players.values()).map(p => {
    let hatTricks = 0;
    for (const g of p.goalsPerMatch.values()) if (g >= 3) hatTricks++;

    return {
      rank: 0,
      playerId: p.playerId,
      name: p.name,
      photo: p.photo,
      teamName: p.teamName,
      teamLogo: p.teamLogo,
      position: p.position,
      goals: p.goals,
      assists: p.assists,
      matches: Math.max(p.matches, p.matchesPlayed),
      cleanSheets: p.cleanSheets,
      penaltiesSaved: p.penaltiesSaved,
      equalizerGoals: p.equalizerGoals,
      gameWinningGoals: p.gameWinningGoals,
      hatTricks,
      legacyScore: Math.round(p.legacyScore * 10) / 10,
    };
  });

  // ── Defender qualifying threshold ─────────────────────────────────────────
  // Defenders must rank top-5 in combined defensive actions per 90 to be included

  const defenders = allEntries.filter(e => e.position === 'D' && e.matches > 0);
  const defPer90 = defenders.map(e => {
    const p = players.get(e.playerId)!;
    const per90 = p.minutesPlayed > 0 ? (p.tackles + p.interceptions + p.blocks) / (p.minutesPlayed / 90) : 0;
    return { entry: e, per90 };
  }).sort((a, b) => b.per90 - a.per90);

  const qualifiedDefIds = new Set(defPer90.slice(0, 5).map(d => d.entry.playerId));

  // Remove defenders who don't qualify
  const qualified = allEntries.filter(e => e.position !== 'D' || qualifiedDefIds.has(e.playerId));

  // Sort by score — playerId as stable tiebreaker so order is identical on every device
  const sorted = qualified
    .filter(e => e.legacyScore > 0)
    .sort((a, b) => b.legacyScore - a.legacyScore || a.playerId - b.playerId);

  // ── Enforce keeper/defender constraints ───────────────────────────────────
  // Max 3 total non-outfield in list; always at least 1

  const top25: LegacyEntry[] = [];
  let nonOutfieldCount = 0;

  for (const entry of sorted) {
    const isNonOutfield = entry.position === 'G' || entry.position === 'D';
    if (isNonOutfield && nonOutfieldCount >= 3) continue;
    top25.push(entry);
    if (isNonOutfield) nonOutfieldCount++;
    if (top25.length >= 25) break;
  }

  // Ensure at least 1 non-outfield player
  if (nonOutfieldCount === 0) {
    const bestKeeper = sorted.find(e => e.position === 'G' || e.position === 'D');
    if (bestKeeper && top25.length >= 25) top25[24] = bestKeeper;
    else if (bestKeeper) top25.push(bestKeeper);
  }

  return top25
    .sort((a, b) => b.legacyScore - a.legacyScore || a.playerId - b.playerId)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// ── Legacy Moment of the Day ──────────────────────────────────────────────────

export interface LegacyMoment {
  playerName: string;
  teamName: string;
  teamLogo: string;
  position: string;
  // Match context
  opponent: string;
  opponentLogo: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  round: string;
  stageMultiplier: number;
  matchDate: string;
  // Performance
  goals: number;
  assists: number;
  cleanSheet: boolean;
  penaltiesSaved: number;
  hatTrick: boolean;
  gameWinningGoals: number;
  equalizerGoals: number;
  matchRating: string | null;
  // Legacy impact
  legacyPtsGained: number;
  rankBefore: number;  // rank if today's pts excluded
  rankAfter: number;   // current rank in full leaderboard
  // Label
  isTodayMoment: boolean; // false = best single match of full tournament
}

function easternDateKey(d: Date): string {
  // Vercel runs UTC — convert to America/New_York before comparing dates
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${day}`;
}

export async function computeLegacyMoment(
  fixtures: ApiFixture[],
  standings: StandingEntry[][],
  fullLeaderboard: LegacyEntry[],
): Promise<LegacyMoment | null> {
  const FINISHED = new Set(['FT', 'AET', 'PEN']);
  const todayKey = easternDateKey(new Date());

  const allFinished = fixtures.filter(f => FINISHED.has(f.fixture.status.short));
  const todayFinished = allFinished.filter(f => easternDateKey(new Date(f.fixture.date)) === todayKey);
  const isTodayMoment = todayFinished.length > 0;
  const targetFixtures = isTodayMoment ? todayFinished : allFinished;

  if (targetFixtures.length === 0) return null;

  const teamLogoMap: Record<string, string> = {};
  for (const f of fixtures) {
    teamLogoMap[f.teams.home.name] = f.teams.home.logo;
    teamLogoMap[f.teams.away.name] = f.teams.away.logo;
  }

  // Track best performance across target fixtures
  interface BestPerf {
    playerName: string; teamName: string; teamLogo: string; position: string;
    opponent: string; opponentLogo: string; homeScore: number; awayScore: number;
    isHome: boolean; round: string; stageMultiplier: number; matchDate: string;
    goals: number; assists: number; cleanSheet: boolean; penaltiesSaved: number;
    hatTrick: boolean; gameWinningGoals: number; equalizerGoals: number;
    matchRating: string | null; legacyPtsGained: number;
  }

  let best: BestPerf | null = null;

  const BATCH_SIZE = 2;
  for (let i = 0; i < targetFixtures.length; i += BATCH_SIZE) {
    const batch = targetFixtures.slice(i, i + BATCH_SIZE);
    const [eventsBatch, playerStatsBatch] = await Promise.all([
      Promise.all(batch.map(f => getFixtureEvents(f.fixture.id))),
      Promise.all(batch.map(f => getFixturePlayerStats(f.fixture.id))),
    ]);
    if (i + BATCH_SIZE < targetFixtures.length) {
      await new Promise(r => setTimeout(r, 700));
    }

    for (let bi = 0; bi < batch.length; bi++) {
      const fix = batch[bi];
      const events = eventsBatch[bi];
      const playerStats = playerStatsBatch[bi];

      const homeTeamId = fix.teams.home.id;
      const finalHome = fix.goals.home ?? 0;
      const finalAway = fix.goals.away ?? 0;
      const stageMultiplier = getStageMultiplier(fix.league.round);
      const homeOQS = getOQS(fix.teams.away.name, standings);
      const awayOQS = getOQS(fix.teams.home.name, standings);

      const goals = classifyGoals(events, homeTeamId, finalHome, finalAway);

      // Goals per player in this match
      const goalsThisMatch = new Map<number, number>();
      for (const g of goals) {
        goalsThisMatch.set(g.scorerPlayerId, (goalsThisMatch.get(g.scorerPlayerId) ?? 0) + 1);
      }

      // ── Per-player accumulation for this single fixture ────────────────────
      interface FixPerf {
        name: string; teamName: string; teamLogo: string; position: string;
        isHome: boolean; goals: number; assists: number;
        gameWinningGoals: number; equalizerGoals: number;
        cleanSheet: boolean; penaltiesSaved: number;
        matchRating: string | null; legacyPts: number;
      }
      const perfMap = new Map<number, FixPerf>();

      function getPerf(id: number, name: string, teamName: string, teamLogo: string, position: string, isHome: boolean): FixPerf {
        if (!perfMap.has(id)) {
          perfMap.set(id, { name, teamName, teamLogo, position, isHome, goals: 0, assists: 0, gameWinningGoals: 0, equalizerGoals: 0, cleanSheet: false, penaltiesSaved: 0, matchRating: null, legacyPts: 0 });
        }
        return perfMap.get(id)!;
      }

      // Score goals
      for (const g of goals) {
        const isHome = g.teamId === homeTeamId;
        const oqs = isHome ? homeOQS : awayOQS;
        const baseGoal = g.isPenalty ? 7 : 10;
        const contextBonus = g.isEqualizer ? 6 : g.isGameWinner ? 8 : 0;
        const pts = (baseGoal + contextBonus) * oqs * stageMultiplier;

        const scorerPStats = playerStats.flatMap(t => t.players).find(p => p.player.id === g.scorerPlayerId);
        const scorerTeamEntry = playerStats.find(t => t.players.some(p => p.player.id === g.scorerPlayerId));
        const scorerTeamName = scorerTeamEntry?.team.name ?? (isHome ? fix.teams.home.name : fix.teams.away.name);
        const scorerTeamLogo = scorerTeamEntry?.team.logo ?? teamLogoMap[scorerTeamName] ?? '';
        const scorerPos = scorerPStats?.statistics[0]?.games.position ?? 'F';

        const perf = getPerf(g.scorerPlayerId, g.scorerName, scorerTeamName, scorerTeamLogo, scorerPos, isHome);
        perf.legacyPts += pts;
        perf.goals += 1;
        if (g.isGameWinner) perf.gameWinningGoals += 1;
        if (g.isEqualizer) perf.equalizerGoals += 1;

        // Assist
        if (g.assistPlayerId) {
          const baseAssist = g.isPenalty ? 1 : 6;
          const assistBonus = (!g.isPenalty && (g.isEqualizer || g.isGameWinner)) ? 3 : 0;
          const assistPts = (baseAssist + assistBonus) * oqs * stageMultiplier;
          const aTeamEntry = playerStats.find(t => t.players.some(p => p.player.id === g.assistPlayerId));
          const aTeamName = aTeamEntry?.team.name ?? scorerTeamName;
          const aTeamLogo = aTeamEntry?.team.logo ?? teamLogoMap[aTeamName] ?? '';
          const aPStats = playerStats.flatMap(t => t.players).find(p => p.player.id === g.assistPlayerId);
          const aIsHome = aTeamEntry ? aTeamEntry.team.id === homeTeamId : isHome;
          const aPerf = getPerf(g.assistPlayerId, g.assistName ?? '', aTeamName, aTeamLogo, aPStats?.statistics[0]?.games.position ?? 'M', aIsHome);
          aPerf.legacyPts += assistPts;
          aPerf.assists += 1;
        }
      }

      // Hat trick bonus
      for (const [pid, gc] of goalsThisMatch) {
        if (gc >= 3) {
          const p = perfMap.get(pid);
          if (p) p.legacyPts += 15;
        }
      }

      // Keeper/defender + ratings
      for (const teamData of playerStats) {
        const isHomeTeam = teamData.team.id === homeTeamId;
        const oqs = isHomeTeam ? homeOQS : awayOQS;
        const teamConceded = isHomeTeam ? finalAway : finalHome;
        for (const { player, statistics } of teamData.players) {
          const stat = statistics[0];
          if (!stat) continue;
          const mins = stat.games.minutes ?? 0;
          if (mins === 0 && stat.games.substitute) continue;
          const pos = stat.games.position;
          const perf = getPerf(player.id, player.name, teamData.team.name, teamData.team.logo || teamLogoMap[teamData.team.name] || '', pos, isHomeTeam);
          perf.matchRating = stat.games.rating;

          if (pos === 'G') {
            const pkSaved = stat.penalty.saved ?? 0;
            const cs = teamConceded === 0 && mins >= 60;
            if (cs) { perf.cleanSheet = true; perf.legacyPts += 8 * oqs * stageMultiplier; }
            if (pkSaved > 0) { perf.penaltiesSaved += pkSaved; perf.legacyPts += pkSaved * 10 * oqs * stageMultiplier; }
          } else if (pos === 'D') {
            const cs = teamConceded === 0 && mins >= 60;
            if (cs) { perf.cleanSheet = true; perf.legacyPts += 5 * oqs * stageMultiplier; }
          }
        }
      }

      // Find best performer in this fixture
      for (const [pid, perf] of perfMap) {
        if (perf.legacyPts <= 0) continue;
        const hatTrick = (goalsThisMatch.get(pid) ?? 0) >= 3;
        const isHomePerspective = perf.isHome;
        const candidate: BestPerf = {
          playerName: perf.name, teamName: perf.teamName, teamLogo: perf.teamLogo,
          position: perf.position, isHome: isHomePerspective,
          opponent: isHomePerspective ? fix.teams.away.name : fix.teams.home.name,
          opponentLogo: isHomePerspective ? fix.teams.away.logo : fix.teams.home.logo,
          homeScore: finalHome, awayScore: finalAway,
          round: fix.league.round, stageMultiplier, matchDate: fix.fixture.date,
          goals: perf.goals, assists: perf.assists, cleanSheet: perf.cleanSheet,
          penaltiesSaved: perf.penaltiesSaved, hatTrick, gameWinningGoals: perf.gameWinningGoals,
          equalizerGoals: perf.equalizerGoals, matchRating: perf.matchRating,
          legacyPtsGained: Math.round(perf.legacyPts * 10) / 10,
        };
        if (!best || candidate.legacyPtsGained > best.legacyPtsGained) best = candidate;
      }
    }
  }

  if (!best) return null;

  // ── Compute rank movement ──────────────────────────────────────────────────
  // rankAfter: position in full leaderboard
  const momentEntry = fullLeaderboard.find(e => e.name === best!.playerName);
  const rankAfter = momentEntry?.rank ?? fullLeaderboard.length + 1;

  // rankBefore: where they'd rank if today's pts subtracted
  const adjusted = fullLeaderboard.map(e =>
    e.name === best!.playerName
      ? { ...e, legacyScore: Math.max(0, e.legacyScore - best!.legacyPtsGained) }
      : e
  ).sort((a, b) => b.legacyScore - a.legacyScore);
  const rankBefore = adjusted.findIndex(e => e.name === best!.playerName) + 1;

  return {
    ...best,
    rankBefore: rankBefore > 0 ? rankBefore : rankAfter,
    rankAfter,
    isTodayMoment,
  };
}
