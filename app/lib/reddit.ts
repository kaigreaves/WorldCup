const REDDIT_HEADERS = {
  'User-Agent': 'world-cup-story/1.0 (personal tournament tracker)',
};

// ── Comprehensive player list for mention detection ───────────────────────────
// Covers all major WC 2026 nations including defenders, keepers, midfielders

const TRACKED_PLAYERS: { name: string; aliases: string[] }[] = [
  // France
  { name: 'Mbappé', aliases: ['mbappe', 'mbappé', 'kylian'] },
  { name: 'Olise', aliases: ['olise', 'michael olise'] },
  { name: 'Camavinga', aliases: ['camavinga', 'eduardo'] },
  { name: 'Tchouaméni', aliases: ['tchouameni', 'tchouaméni', 'aurelien'] },
  { name: 'Upamecano', aliases: ['upamecano', 'dayot'] },
  { name: 'Theo Hernandez', aliases: ['theo hernandez', 'theo hernández'] },
  { name: 'Maignan', aliases: ['maignan', 'mike maignan'] },
  { name: 'Dembélé', aliases: ['dembele', 'dembélé', 'ousmane'] },
  // Argentina
  { name: 'Messi', aliases: ['messi', 'leo', 'goat', 'lionel'] },
  { name: 'Di María', aliases: ['di maria', 'di maría', 'angel di'] },
  { name: 'Álvarez', aliases: ['alvarez', 'álvarez', 'julian alvarez'] },
  { name: 'De Paul', aliases: ['de paul', 'rodrigo de paul'] },
  { name: 'Mac Allister', aliases: ['mac allister', 'macallister', 'alexis'] },
  { name: 'Martínez', aliases: ['dibu', 'emi martinez', 'emiliano'] },
  // England
  { name: 'Bellingham', aliases: ['bellingham', 'jude'] },
  { name: 'Saka', aliases: ['saka', 'bukayo'] },
  { name: 'Kane', aliases: ['kane', 'harry kane'] },
  { name: 'Foden', aliases: ['foden', 'phil foden'] },
  { name: 'Walker', aliases: ['walker', 'kyle walker'] },
  { name: 'Trippier', aliases: ['trippier', 'kieran trippier'] },
  { name: 'Pickford', aliases: ['pickford', 'jordan pickford'] },
  { name: 'Mainoo', aliases: ['mainoo', 'kobbie'] },
  { name: 'Palmer', aliases: ['palmer', 'cole palmer'] },
  // Brazil
  { name: 'Vinicius Jr', aliases: ['vini', 'vinicius', 'vini jr'] },
  { name: 'Rodrygo', aliases: ['rodrygo'] },
  { name: 'Endrick', aliases: ['endrick'] },
  { name: 'Paquetá', aliases: ['paqueta', 'paquetá', 'lucas paqueta'] },
  { name: 'Militão', aliases: ['militao', 'militão', 'eder militao'] },
  { name: 'Marquinhos', aliases: ['marquinhos'] },
  { name: 'Alisson', aliases: ['alisson'] },
  // Spain
  { name: 'Yamal', aliases: ['yamal', 'lamine'] },
  { name: 'Pedri', aliases: ['pedri'] },
  { name: 'Williams', aliases: ['nico williams', 'williams'] },
  { name: 'Morata', aliases: ['morata', 'alvaro morata'] },
  { name: 'Rodri', aliases: ['rodri', 'rodrigo hernandez'] },
  { name: 'Carvajal', aliases: ['carvajal', 'dani carvajal'] },
  // Germany
  { name: 'Musiala', aliases: ['musiala', 'jamal'] },
  { name: 'Wirtz', aliases: ['wirtz', 'florian wirtz'] },
  { name: 'Rüdiger', aliases: ['rudiger', 'rüdiger', 'antonio rudiger'] },
  { name: 'Ter Stegen', aliases: ['ter stegen', 'terstegen'] },
  { name: 'Kimmich', aliases: ['kimmich', 'joshua kimmich'] },
  { name: 'Havertz', aliases: ['havertz', 'kai havertz'] },
  // Portugal
  { name: 'Ronaldo', aliases: ['ronaldo', 'cr7', 'cristiano'] },
  { name: 'Bruno Fernandes', aliases: ['bruno fernandes', 'bruno'] },
  { name: 'Leão', aliases: ['leao', 'leão', 'rafael leao'] },
  { name: 'Rúben Dias', aliases: ['ruben dias', 'rúben dias'] },
  // USA
  { name: 'Pulisic', aliases: ['pulisic', 'captain america', 'christian pulisic'] },
  { name: 'Balogun', aliases: ['balogun', 'folarin'] },
  { name: 'Reyna', aliases: ['reyna', 'gio reyna', 'giovanni'] },
  { name: 'Turner', aliases: ['matt turner', 'turner'] },
  { name: 'McKennie', aliases: ['mckennie', 'weston'] },
  { name: 'Musah', aliases: ['musah', 'yunus'] },
  // Canada
  { name: 'Davies', aliases: ['davies', 'phonzy', 'alphonso'] },
  { name: 'Larin', aliases: ['larin', 'cyle'] },
  { name: 'David', aliases: ['jonathan david', 'j. david'] },
  { name: 'Buchanan', aliases: ['buchanan', 'tajon'] },
  // Mexico
  { name: 'Lozano', aliases: ['lozano', 'chucky', 'hirving'] },
  { name: 'Álvarez Mx', aliases: ['edson alvarez', 'edson'] },
  { name: 'Raúl', aliases: ['raul jimenez', 'jimenez'] },
  // Morocco
  { name: 'Hakimi', aliases: ['hakimi', 'achraf'] },
  { name: 'En-Nesyri', aliases: ['en-nesyri', 'youssef'] },
  { name: 'Ounahi', aliases: ['ounahi', 'azzedine'] },
  { name: 'Bounou', aliases: ['bounou', 'bono'] },
  // Netherlands
  { name: 'Van Dijk', aliases: ['van dijk', 'virgil'] },
  { name: 'Gakpo', aliases: ['gakpo', 'cody'] },
  { name: 'Depay', aliases: ['depay', 'memphis'] },
  { name: 'De Jong', aliases: ['de jong', 'frenkie'] },
  // Other notable
  { name: 'Osimhen', aliases: ['osimhen', 'victor osimhen'] },
  { name: 'Salah', aliases: ['salah', 'mo salah', 'mohamed salah'] },
  { name: 'Son', aliases: ['son', 'son heung-min', 'heung-min'] },
  { name: 'Hwang', aliases: ['hwang in-beom', 'hwang'] },
  { name: 'Szczesny', aliases: ['szczesny', 'wojciech'] },
  { name: 'Lewandowski', aliases: ['lewandowski', 'robert lewandowski', 'lewy'] },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RedditPost {
  id: string;
  title: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
}

export interface RedditComment {
  id: string;
  body: string;
  score: number;
  author: string;
  thread_title?: string;
}

export interface PerformerEntry {
  name: string;
  mentionCount: number;
  weightedScore: number;
  topComment: RedditComment;
}

export interface RedditData {
  fetchedAt: string;
  threads: RedditPost[];
  // Keyed by simplified "home vs away" string
  matchComments: Record<string, RedditComment[]>;
  // Keyed by player name — top comment with min score threshold
  playerComments: Record<string, RedditComment>;
  // Reddit-driven performers (anyone fans are raving about)
  performers: PerformerEntry[];
  // Top varied comments for Fan Voice section
  fanVoiceComments: RedditComment[];
}

// ── Content filtering ─────────────────────────────────────────────────────────

const INSULT_PATTERNS = [
  /\bn+i+g+[aehr]/i,
  /\bf+a+g+/i,
  /\bk+i+k+e/i,
  /\bsp+i+c+/i,
  /\bkill yourself/i,
  /\bkys\b/i,
  /go back to/i,
];

function isAcceptable(body: string): boolean {
  if (!body || body.length < 30) return false;
  if (body === '[deleted]' || body === '[removed]') return false;
  for (const pattern of INSULT_PATTERNS) {
    if (pattern.test(body)) return false;
  }
  return true;
}

function isSubstantive(body: string): boolean {
  if (!isAcceptable(body)) return false;
  if (body.length < 40) return false;
  const lower = body.toLowerCase();
  if (lower.includes('automoderator')) return false;
  if (lower.includes('starting xi') && lower.includes('formation')) return false;
  // Pure quoted reply chains
  const lines = body.split('\n').filter(l => l.trim());
  if (lines.length > 0 && lines.every(l => l.trim().startsWith('>'))) return false;
  return true;
}

// ── Reddit fetchers ───────────────────────────────────────────────────────────

async function redditFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: REDDIT_HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function searchPosts(query: string, subreddit: string, limit = 10): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&restrict_sr=on&t=week&limit=${limit}`;
  const data = await redditFetch<{ data: { children: { data: RedditPost }[] } }>(url);
  return (data?.data?.children ?? []).map(c => ({ ...c.data, subreddit: c.data.subreddit ?? subreddit }));
}

async function fetchComments(postId: string, subreddit: string, threadTitle: string): Promise<RedditComment[]> {
  const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?sort=top&limit=100&depth=1`;
  const data = await redditFetch<[unknown, { data: { children: { data: RedditComment }[] } }]>(url);
  if (!data?.[1]?.data?.children) return [];
  return data[1].data.children
    .map(c => ({ ...c.data, thread_title: threadTitle }))
    .filter(c => isAcceptable(c.body))
    .sort((a, b) => b.score - a.score);
}

// ── Thread discovery ──────────────────────────────────────────────────────────

async function discoverThreads(): Promise<RedditPost[]> {
  const seen = new Set<string>();
  const all: RedditPost[] = [];

  const searches = [
    { q: 'title:"Match Thread" World Cup 2026', sub: 'soccer' },
    { q: 'title:"Post Match Thread" World Cup 2026', sub: 'soccer' },
    { q: 'title:"Match Thread" World Cup', sub: 'worldcup' },
    { q: 'title:"Post Match Thread" World Cup', sub: 'worldcup' },
    { q: 'World Cup 2026', sub: 'soccer' },
  ];

  for (const { q, sub } of searches) {
    const posts = await searchPosts(q, sub, 10);
    for (const p of posts) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        all.push(p);
      }
    }
  }

  return all
    .sort((a, b) => b.created_utc - a.created_utc)
    .slice(0, 12);
}

// ── Key helper: normalize team name for matching ──────────────────────────────

function normalizeTeam(name: string): string {
  const map: Record<string, string> = {
    'United States': 'USA',
    'United States of America': 'USA',
    'Korea Republic': 'South Korea',
    'Bosnia & Herzegovina': 'Bosnia',
    "Côte d'Ivoire": 'Ivory Coast',
    'IR Iran': 'Iran',
  };
  return (map[name] ?? name).toLowerCase();
}

export function matchKey(home: string, away: string): string {
  return `${normalizeTeam(home)} vs ${normalizeTeam(away)}`;
}

// ── Player mention analysis ───────────────────────────────────────────────────

interface MentionAccumulator {
  count: number;
  totalScore: number;
  topComment: RedditComment;
}

function detectMentions(comments: RedditComment[]): Map<string, MentionAccumulator> {
  const map = new Map<string, MentionAccumulator>();
  for (const c of comments) {
    const lower = c.body.toLowerCase();
    for (const player of TRACKED_PLAYERS) {
      if (!player.aliases.some(a => lower.includes(a))) continue;
      const existing = map.get(player.name);
      if (!existing) {
        map.set(player.name, { count: 1, totalScore: c.score, topComment: c });
      } else {
        existing.count++;
        existing.totalScore += c.score;
        if (c.score > existing.topComment.score) existing.topComment = c;
      }
    }
  }
  return map;
}

// ── Main data fetch ───────────────────────────────────────────────────────────

export async function getRedditData(
  fixtures: Array<{ id: number; homeTeam: string; awayTeam: string; isFinished: boolean }>
): Promise<RedditData> {
  const threads = await discoverThreads();

  // Fetch all comments from all threads (cached, runs once per hour)
  const threadCommentMap = new Map<string, RedditComment[]>();
  for (const thread of threads) {
    const comments = await fetchComments(thread.id, thread.subreddit ?? 'soccer', thread.title);
    threadCommentMap.set(thread.id, comments);
  }

  const allComments = Array.from(threadCommentMap.values()).flat();

  // ── Match comments: match threads to fixtures by team name ────────────────
  const matchComments: Record<string, RedditComment[]> = {};

  for (const fix of fixtures) {
    const key = matchKey(fix.homeTeam, fix.awayTeam);
    const homeNorm = normalizeTeam(fix.homeTeam);
    const awayNorm = normalizeTeam(fix.awayTeam);

    // Find threads whose title contains both team names
    const relevantThreads = threads.filter(t => {
      const title = t.title.toLowerCase();
      return (title.includes(homeNorm) || title.includes(fix.homeTeam.toLowerCase())) &&
             (title.includes(awayNorm) || title.includes(fix.awayTeam.toLowerCase()));
    });

    if (relevantThreads.length === 0) continue;

    const comments: RedditComment[] = [];
    for (const t of relevantThreads) {
      comments.push(...(threadCommentMap.get(t.id) ?? []));
    }

    // Pick 3 best: substantive, score >= 10, varied (don't repeat same author)
    const seen = new Set<string>();
    const best: RedditComment[] = [];
    for (const c of comments.filter(c => isSubstantive(c.body) && c.score >= 10)) {
      if (best.length >= 3) break;
      if (!seen.has(c.author)) {
        seen.add(c.author);
        best.push(c);
      }
    }
    if (best.length > 0) matchComments[key] = best;
  }

  // ── Player comments: highest-scored comment mentioning each player ─────────
  const playerComments: Record<string, RedditComment> = {};
  const globalMentions = detectMentions(allComments.filter(c => isSubstantive(c.body)));

  for (const [playerName, data] of globalMentions) {
    // Only surface if the comment has meaningful upvotes (popular opinion)
    if (data.topComment.score >= 25) {
      playerComments[playerName] = data.topComment;
    }
  }

  // ── Performers: Reddit-driven, ranked by weighted score ───────────────────
  // Use only comments from the most recent match day's threads
  const sortedThreads = [...threads].sort((a, b) => b.created_utc - a.created_utc);
  const recentCutoff = sortedThreads[0]?.created_utc ?? 0;
  const recentDayTs = recentCutoff - 24 * 60 * 60; // within 24h of most recent thread
  const recentThreadIds = new Set(
    sortedThreads.filter(t => t.created_utc >= recentDayTs).map(t => t.id)
  );

  const recentComments: RedditComment[] = [];
  for (const [id, comments] of threadCommentMap) {
    if (recentThreadIds.has(id)) recentComments.push(...comments);
  }

  const recentMentions = detectMentions(recentComments.filter(c => isSubstantive(c.body)));
  const performers: PerformerEntry[] = Array.from(recentMentions.entries())
    .filter(([, d]) => d.topComment.score >= 10)
    .map(([name, d]) => ({
      name,
      mentionCount: d.count,
      weightedScore: d.count * (d.totalScore / d.count),
      topComment: d.topComment,
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 8);

  // ── Fan Voice: top varied comments — banter, jokes, takes all welcome ─────
  const fanVoiceComments = allComments
    .filter(c => isSubstantive(c.body) && c.score >= 50 && c.body.length <= 600)
    .sort((a, b) => b.score - a.score)
    .reduce((acc: RedditComment[], c) => {
      // Keep variety — no two from same author, no two from same thread
      const usedAuthors = new Set(acc.map(x => x.author));
      const usedThreads = new Set(acc.map(x => x.thread_title));
      if (!usedAuthors.has(c.author) && (!usedThreads.has(c.thread_title) || acc.length < 3)) {
        acc.push(c);
      }
      return acc;
    }, [])
    .slice(0, 6);

  return {
    fetchedAt: new Date().toISOString(),
    threads,
    matchComments,
    playerComments,
    performers,
    fanVoiceComments,
  };
}
