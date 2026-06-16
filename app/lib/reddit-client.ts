// Client-side Reddit fetching — runs in the browser, not the server.
// Reddit's public JSON API blocks server requests but works fine from a browser.

const TRACKED_PLAYERS: { name: string; aliases: string[] }[] = [
  { name: 'Mbappé', aliases: ['mbappe', 'mbappé', 'kylian'] },
  { name: 'Olise', aliases: ['olise', 'michael olise'] },
  { name: 'Camavinga', aliases: ['camavinga'] },
  { name: 'Tchouaméni', aliases: ['tchouameni', 'tchouaméni'] },
  { name: 'Upamecano', aliases: ['upamecano'] },
  { name: 'Theo Hernandez', aliases: ['theo hernandez'] },
  { name: 'Maignan', aliases: ['maignan'] },
  { name: 'Dembélé', aliases: ['dembele', 'dembélé', 'ousmane'] },
  { name: 'Messi', aliases: ['messi', 'leo', 'goat', 'lionel'] },
  { name: 'Di María', aliases: ['di maria', 'di maría'] },
  { name: 'Álvarez', aliases: ['julian alvarez'] },
  { name: 'De Paul', aliases: ['de paul'] },
  { name: 'Mac Allister', aliases: ['mac allister', 'macallister'] },
  { name: 'Dibu Martínez', aliases: ['dibu', 'emi martinez'] },
  { name: 'Bellingham', aliases: ['bellingham', 'jude'] },
  { name: 'Saka', aliases: ['saka', 'bukayo'] },
  { name: 'Kane', aliases: ['harry kane'] },
  { name: 'Foden', aliases: ['foden', 'phil foden'] },
  { name: 'Walker', aliases: ['walker', 'kyle walker'] },
  { name: 'Trippier', aliases: ['trippier'] },
  { name: 'Pickford', aliases: ['pickford'] },
  { name: 'Mainoo', aliases: ['mainoo', 'kobbie'] },
  { name: 'Palmer', aliases: ['palmer', 'cole palmer'] },
  { name: 'Vinicius Jr', aliases: ['vini', 'vinicius', 'vini jr'] },
  { name: 'Rodrygo', aliases: ['rodrygo'] },
  { name: 'Endrick', aliases: ['endrick'] },
  { name: 'Paquetá', aliases: ['paqueta', 'paquetá'] },
  { name: 'Militão', aliases: ['militao', 'militão'] },
  { name: 'Marquinhos', aliases: ['marquinhos'] },
  { name: 'Alisson', aliases: ['alisson'] },
  { name: 'Yamal', aliases: ['yamal', 'lamine'] },
  { name: 'Pedri', aliases: ['pedri'] },
  { name: 'Nico Williams', aliases: ['nico williams'] },
  { name: 'Morata', aliases: ['morata'] },
  { name: 'Rodri', aliases: ['rodri'] },
  { name: 'Carvajal', aliases: ['carvajal'] },
  { name: 'Musiala', aliases: ['musiala', 'jamal'] },
  { name: 'Wirtz', aliases: ['wirtz', 'florian wirtz'] },
  { name: 'Rüdiger', aliases: ['rudiger', 'rüdiger'] },
  { name: 'Kimmich', aliases: ['kimmich'] },
  { name: 'Havertz', aliases: ['havertz'] },
  { name: 'Ronaldo', aliases: ['ronaldo', 'cr7', 'cristiano'] },
  { name: 'Bruno Fernandes', aliases: ['bruno fernandes'] },
  { name: 'Leão', aliases: ['leao', 'leão', 'rafael leao'] },
  { name: 'Pulisic', aliases: ['pulisic', 'captain america'] },
  { name: 'Balogun', aliases: ['balogun', 'folarin'] },
  { name: 'Reyna', aliases: ['gio reyna', 'reyna'] },
  { name: 'McKennie', aliases: ['mckennie'] },
  { name: 'Musah', aliases: ['musah', 'yunus'] },
  { name: 'Davies', aliases: ['davies', 'phonzy', 'alphonso'] },
  { name: 'Larin', aliases: ['larin', 'cyle'] },
  { name: 'Jonathan David', aliases: ['jonathan david', 'j. david'] },
  { name: 'Buchanan', aliases: ['buchanan', 'tajon'] },
  { name: 'Lozano', aliases: ['lozano', 'chucky'] },
  { name: 'Hakimi', aliases: ['hakimi', 'achraf'] },
  { name: 'En-Nesyri', aliases: ['en-nesyri', 'youssef'] },
  { name: 'Van Dijk', aliases: ['van dijk', 'virgil'] },
  { name: 'Gakpo', aliases: ['gakpo', 'cody'] },
  { name: 'De Jong', aliases: ['de jong', 'frenkie'] },
  { name: 'Osimhen', aliases: ['osimhen'] },
  { name: 'Salah', aliases: ['salah', 'mo salah'] },
  { name: 'Son', aliases: ['son heung-min', 'son heung'] },
  { name: 'Lewandowski', aliases: ['lewandowski', 'lewy'] },
  { name: 'Hwang', aliases: ['hwang in-beom', 'hwang'] },
  { name: 'Havertz', aliases: ['havertz', 'kai havertz'] },
  { name: 'Musiala', aliases: ['musiala', 'jamal musiala'] },
  { name: 'Wirtz', aliases: ['wirtz', 'florian wirtz'] },
  { name: 'Undav', aliases: ['undav', 'deniz undav'] },
  { name: 'Ayari', aliases: ['ayari', 'yasin ayari'] },
  { name: 'Jonathan David', aliases: ['jonathan david', 'j. david', 'jon david'] },
  { name: 'Balogun', aliases: ['balogun', 'folarin balogun'] },
  { name: 'Weah', aliases: ['weah', 'timothy weah'] },
  { name: 'Doku', aliases: ['doku', 'jeremy doku'] },
  { name: 'De Bruyne', aliases: ['de bruyne', 'kdb', 'kevin de bruyne'] },
  { name: 'Lukaku', aliases: ['lukaku', 'romelu'] },
  { name: 'Kvaratskhelia', aliases: ['kvaratskhelia', 'kvara'] },
  { name: 'Dumfries', aliases: ['dumfries'] },
  { name: 'Weghorst', aliases: ['weghorst'] },
  { name: 'Zirkzee', aliases: ['zirkzee'] },
  { name: 'Simons', aliases: ['simons', 'xavi simons'] },
  { name: 'Veiga', aliases: ['veiga', 'raphael veiga'] },
  { name: 'Benzema', aliases: ['benzema', 'karim'] },
  { name: 'Griezmann', aliases: ['griezmann', 'antoine'] },
  { name: 'Giroud', aliases: ['giroud', 'olivier giroud'] },
  { name: 'Lozano', aliases: ['lozano', 'chucky lozano'] },
  { name: 'Alvarez', aliases: ['alvarez', 'edson alvarez'] },
  { name: 'Brown', aliases: ['noah brown'] },
];

export interface RedditComment {
  id: string;
  body: string;
  score: number;
  author: string;
  thread_title?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
}

export interface PerformerEntry {
  name: string;
  mentionCount: number;
  weightedScore: number;
  topComment: RedditComment;
}

export interface RedditClientData {
  threads: RedditPost[];
  matchComments: Record<string, RedditComment[]>;
  playerComments: Record<string, RedditComment>;
  performers: PerformerEntry[];           // today's buzz (recent threads)
  tournamentFavourites: PerformerEntry[]; // all-time mentions across whole tournament
  fanVoiceComments: RedditComment[];
  allComments: RedditComment[];
  fetchedAt: string;
}

// ── Content filtering ─────────────────────────────────────────────────────────

const INSULT_PATTERNS = [
  /\bn+i+g+[aehr]/i,
  /\bf+a+g+/i,
  /\bkill yourself/i,
  /\bkys\b/i,
];

function isAcceptable(body: string): boolean {
  if (!body || body.length < 15) return false;
  if (body === '[deleted]' || body === '[removed]') return false;
  for (const p of INSULT_PATTERNS) if (p.test(body)) return false;
  return true;
}

function isSubstantive(body: string): boolean {
  if (!isAcceptable(body)) return false;
  if (body.length < 20) return false;
  const lower = body.toLowerCase();
  if (lower.includes('automoderator')) return false;
  const lines = body.split('\n').filter(l => l.trim());
  if (lines.length > 0 && lines.every(l => l.trim().startsWith('>'))) return false;
  return true;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

// Use Arctic Shift — a real-time Reddit archive API, no auth required, has live WC2026 data.
// Reddit's own API requires OAuth since 2023 and returns 403 from servers without credentials.

const ARCTIC = 'https://arctic-shift.photon-reddit.com/api';

interface ArcticPost {
  id: string; title: string; subreddit: string; score: number;
  num_comments: number; created_utc: number; permalink: string;
}
interface ArcticComment {
  id: string; body: string; score: number; author: string;
  link_id: string; created_utc: number;
}

async function arcticGet<T>(url: string): Promise<T | null> {
  try {
    // Arctic Shift allows CORS — fetch directly from the browser, no proxy needed
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function searchPosts(query: string, subreddit: string): Promise<RedditPost[]> {
  const url = `${ARCTIC}/posts/search?subreddit=${subreddit}&title=${encodeURIComponent(query)}&limit=10`;
  const data = await arcticGet<{ data: ArcticPost[] }>(url);
  return (data?.data ?? []).map(p => ({
    id: p.id,
    title: p.title,
    subreddit: p.subreddit ?? subreddit,
    score: p.score ?? 0,
    num_comments: p.num_comments ?? 0,
    created_utc: p.created_utc,
    permalink: p.permalink ?? '',
  }));
}

async function fetchComments(postId: string, _subreddit: string, threadTitle: string): Promise<RedditComment[]> {
  const url = `${ARCTIC}/comments/search?link_id=t3_${postId}&limit=100`;
  const data = await arcticGet<{ data: ArcticComment[] }>(url);
  return (data?.data ?? [])
    .map(c => ({ id: c.id, body: c.body, score: c.score ?? 0, author: c.author, thread_title: threadTitle }))
    .filter(c => isAcceptable(c.body))
    .sort((a, b) => b.score - a.score);
}

// ── Team name normalization ───────────────────────────────────────────────────

const TEAM_MAP: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Bosnia & Herzegovina': 'Bosnia',
  "Côte d'Ivoire": 'Ivory Coast',
  'IR Iran': 'Iran',
};

// All aliases a team might appear as in thread titles
const TEAM_ALIASES: Record<string, string[]> = {
  'United States': ['usa', 'usmnt', 'united states', 'us men'],
  "Côte d'Ivoire": ["côte d'ivoire", "cote d'ivoire", 'ivory coast'],
  'Korea Republic': ['south korea', 'korea republic', 'korea'],
  'Bosnia & Herzegovina': ['bosnia', 'bosnia & herzegovina'],
  'IR Iran': ['iran', 'ir iran'],
  'Netherlands': ['netherlands', 'holland'],
  'Saudi Arabia': ['saudi arabia', 'saudi'],
  'New Zealand': ['new zealand', 'new zealand all whites'],
};

function teamInTitle(teamName: string, title: string): boolean {
  const t = title.toLowerCase();
  const aliases = TEAM_ALIASES[teamName] ?? [(TEAM_MAP[teamName] ?? teamName).toLowerCase()];
  const all = [...new Set([...aliases, teamName.toLowerCase()])];
  return all.some(a => t.includes(a));
}

export function matchKey(home: string, away: string): string {
  const norm = (n: string) => (TEAM_MAP[n] ?? n).toLowerCase();
  return `${norm(home)} vs ${norm(away)}`;
}

function normTeam(n: string) { return (TEAM_MAP[n] ?? n).toLowerCase(); }

// ── Player mention detection ──────────────────────────────────────────────────

function detectMentions(comments: RedditComment[]) {
  const map = new Map<string, { count: number; totalScore: number; topComment: RedditComment }>();
  for (const c of comments) {
    const lower = c.body.toLowerCase();
    for (const p of TRACKED_PLAYERS) {
      if (!p.aliases.some(a => lower.includes(a))) continue;
      const ex = map.get(p.name);
      if (!ex) {
        map.set(p.name, { count: 1, totalScore: c.score, topComment: c });
      } else {
        ex.count++;
        ex.totalScore += c.score;
        if (c.score > ex.topComment.score) ex.topComment = c;
      }
    }
  }
  return map;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchRedditData(
  fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>
): Promise<RedditClientData> {
  // 1. Find match threads
  const seen = new Set<string>();
  const threads: RedditPost[] = [];

  const searches = [
    { q: 'Match Thread', sub: 'worldcup' },
    { q: 'Post Match Thread', sub: 'worldcup' },
    { q: 'Match Thread', sub: 'soccer' },
    { q: 'Post Match Thread', sub: 'soccer' },
  ];

  await Promise.all(searches.map(async ({ q, sub }) => {
    const posts = await searchPosts(q, sub);
    console.log(`[Reddit] ${sub} "${q}" → ${posts.length} posts`);
    for (const p of posts) {
      if (!seen.has(p.id)) { seen.add(p.id); threads.push(p); }
    }
  }));

  threads.sort((a, b) => b.created_utc - a.created_utc);
  const topThreads = threads.slice(0, 10);

  // 2. Fetch comments from all threads in parallel
  const threadComments = await Promise.all(
    topThreads.map(t => fetchComments(t.id, t.subreddit, t.title))
  );
  const commentsByThread = new Map(topThreads.map((t, i) => [t.id, threadComments[i]]));
  const allComments = threadComments.flat();

  // 3. Match comments to fixtures
  const matchComments: Record<string, RedditComment[]> = {};
  for (const fix of fixtures) {
    const key = matchKey(fix.homeTeam, fix.awayTeam);

    // Find threads specifically about this match
    const relThreads = topThreads.filter(t => {
      const title = t.title;
      const matchesTeams = teamInTitle(fix.homeTeam, title) && teamInTitle(fix.awayTeam, title);
      const notPostMatch = fix.isFinished ? true : !title.toLowerCase().includes('post match') && !title.toLowerCase().includes('post-match');
      return matchesTeams && notPostMatch;
    });

    let comments: RedditComment[] = [];
    if (relThreads.length > 0) {
      for (const t of relThreads) comments.push(...(commentsByThread.get(t.id) ?? []));
    } else {
      // Fallback: pick any comment from all threads that mentions either team name
      const homeAliases = [fix.homeTeam.toLowerCase(), (TEAM_MAP[fix.homeTeam] ?? fix.homeTeam).toLowerCase()];
      const awayAliases = [fix.awayTeam.toLowerCase(), (TEAM_MAP[fix.awayTeam] ?? fix.awayTeam).toLowerCase()];
      comments = allComments.filter(c => {
        const b = c.body.toLowerCase();
        return homeAliases.some(a => b.includes(a)) || awayAliases.some(a => b.includes(a));
      });
    }

    const seen2 = new Set<string>();
    const best: RedditComment[] = [];
    // Sort by score so best comments surface first
    const sorted = comments
      .filter(c => isSubstantive(c.body) && c.score >= -2)
      .sort((a, b) => b.score - a.score);
    for (const c of sorted) {
      if (best.length >= 4) break;
      if (!seen2.has(c.author)) { seen2.add(c.author); best.push(c); }
    }
    if (best.length > 0) matchComments[key] = best;
  }

  // 4. Player comments — best comment per player with score >= 20
  const playerComments: Record<string, RedditComment> = {};
  const globalMentions = detectMentions(allComments.filter(c => isSubstantive(c.body)));
  for (const [name, data] of globalMentions) {
    if (data.topComment.score >= 0) playerComments[name] = data.topComment;
  }

  // 5. Performers — from most recent threads
  const recentTs = topThreads[0]?.created_utc ?? 0;
  const recentIds = new Set(topThreads.filter(t => t.created_utc >= recentTs - 86400).map(t => t.id));
  const recentComments = Array.from(commentsByThread.entries())
    .filter(([id]) => recentIds.has(id))
    .flatMap(([, comments]) => comments);

  const recentMentions = detectMentions(recentComments.filter(c => isSubstantive(c.body)));
  const performers: PerformerEntry[] = Array.from(recentMentions.entries())
    .filter(([, d]) => d.count >= 2)
    .map(([name, d]) => ({
      name,
      mentionCount: d.count,
      weightedScore: d.count * (d.totalScore / d.count),
      topComment: d.topComment,
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 8);

  // 5b. Tournament favourites — cumulative mentions across ALL threads (not just recent)
  const allMentions = detectMentions(allComments.filter(c => isSubstantive(c.body)));
  const tournamentFavourites: PerformerEntry[] = Array.from(allMentions.entries())
    .filter(([, d]) => d.count >= 2)
    .map(([name, d]) => ({
      name,
      mentionCount: d.count,
      weightedScore: d.count * (d.totalScore / Math.max(1, d.count)),
      topComment: d.topComment,
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, 10);

  // 6. Fan voice — top varied comments
  const fanVoiceComments = allComments
    .filter(c => isSubstantive(c.body) && c.score >= 0 && c.body.length <= 600)
    .sort((a, b) => b.score - a.score)
    .reduce((acc: RedditComment[], c) => {
      const authors = new Set(acc.map(x => x.author));
      const titles = new Set(acc.map(x => x.thread_title));
      if (!authors.has(c.author) && (!titles.has(c.thread_title) || acc.length < 3)) acc.push(c);
      return acc;
    }, [])
    .slice(0, 6);

  return {
    threads: topThreads,
    matchComments,
    playerComments,
    performers,
    tournamentFavourites,
    fanVoiceComments,
    allComments: allComments.filter(c => isSubstantive(c.body)).slice(0, 150),
    fetchedAt: new Date().toISOString(),
  };
}
