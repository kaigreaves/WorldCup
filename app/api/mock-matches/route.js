const ONE_HOUR = 60 * 60 * 1000;

let cache = {
  data: null,
  lastUpdated: 0
};

let snapshots = [];

let memory = {
  lastDominantTeam: null,
  lastTopPlayer: null,
  lastStoryTheme: null,
  trend: []
};

// ---------------- HELPERS ----------------
function getTodayDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------- FETCH ----------------
async function fetchFixtures() {
  const today = getTodayDate();

  // Fetch both live AND today's finished/upcoming matches
  const [liveRes, todayRes] = await Promise.all([
    fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY }
    }),
    fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY }
    })
  ]);

  const liveData = await liveRes.json();
  const todayData = await todayRes.json();

  const liveFixtures = liveData.response || [];
  const todayFixtures = todayData.response || [];

  // Merge and deduplicate by fixture ID
  const seen = new Set();
  const merged = [];

  for (const f of [...liveFixtures, ...todayFixtures]) {
    const id = f.fixture?.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      merged.push(f);
    }
  }

  return merged;
}

// ---------------- STATUS LABEL ----------------
function getStatusLabel(short) {
  const map = {
    "1H": "First Half",
    "HT": "Half Time",
    "2H": "Second Half",
    "ET": "Extra Time",
    "P": "Penalties",
    "FT": "Full Time",
    "AET": "After Extra Time",
    "PEN": "After Penalties",
    "NS": "Not Started",
    "TBD": "To Be Decided",
    "CANC": "Cancelled",
    "PST": "Postponed",
    "SUSP": "Suspended",
    "INT": "Interrupted",
    "ABD": "Abandoned",
    "AWD": "Awarded",
    "WO": "Walkover",
    "LIVE": "Live"
  };
  return map[short] || short;
}

// ---------------- MATCH SUMMARY ----------------
function summarizeMatch(home, away, hg, ag, statusShort) {
  const diff = Math.abs(hg - ag);
  const finished = ["FT", "AET", "PEN", "AWD", "WO"].includes(statusShort);
  const live = ["1H", "2H", "ET", "P", "HT", "LIVE"].includes(statusShort);
  const notStarted = statusShort === "NS";

  if (notStarted) {
    return `${home} vs ${away} — yet to kick off.`;
  }

  if (hg === 0 && ag === 0) {
    return finished
      ? `${home} and ${away} played out a goalless draw.`
      : `${home} and ${away} are locked in a tactical stalemate.`;
  }

  const leader = hg > ag ? home : away;
  const loser = hg > ag ? away : home;
  const [lg, ll] = hg > ag ? [hg, ag] : [ag, hg];

  if (finished) {
    if (diff >= 3) return `${leader} ran out convincing winners over ${loser}, ${lg}-${ll}.`;
    if (diff === 2) return `${leader} were comfortable in the end against ${loser}, ${lg}-${ll}.`;
    if (diff === 1) return `${leader} edged past ${loser} in a tight contest, ${lg}-${ll}.`;
    return `${home} and ${away} shared the spoils, ${hg}-${ag}.`;
  }

  if (live) {
    if (diff >= 3) return `${leader} are dominating ${loser} with authority.`;
    if (diff === 1) return `${leader} hold a narrow advantage over ${loser}.`;
    return `${leader} are applying pressure on ${loser}.`;
  }

  return `${home} vs ${away} — ${hg}-${ag}.`;
}

// ---------------- TEAM SCORE ENGINE ----------------
// Scores teams by goals — higher is better
function addTeamScore(map, name, goals) {
  if (!name) return;
  if (!map[name]) {
    map[name] = { name, score: 0, goals: 0 };
  }
  map[name].score += goals * 3;
  map[name].goals += goals;
}

// ---------------- STORY ENGINE ----------------
function computeStory(matches, teamList) {
  const finishedOrLive = matches.filter(m =>
    !["NS", "TBD", "CANC", "PST"].includes(m.statusShort)
  );

  const matchCount = finishedOrLive.length;

  const goals = finishedOrLive.reduce((sum, m) => {
    const [a, b] = (m.score || "0-0").split("-").map(Number);
    return sum + (a || 0) + (b || 0);
  }, 0);

  const maxGoalMatch = finishedOrLive.length
    ? Math.max(
        ...finishedOrLive.map(m => {
          const [a, b] = (m.score || "0-0").split("-").map(Number);
          return (a || 0) + (b || 0);
        })
      )
    : 0;

  const avgGoals = goals / Math.max(matchCount, 1);
  const top = teamList[0];

  let headline = "";
  let theme = "neutral";

  if (maxGoalMatch >= 6) {
    headline = "A dominant attacking performance has reshaped today's narrative.";
    theme = "explosive";
    memory.lastDominantTeam = top?.name || memory.lastDominantTeam;
  } else if (matchCount >= 8 && avgGoals >= 2.2) {
    headline = "Today is defined by attacking football and rising momentum.";
    theme = "attacking";
  } else if (matchCount >= 8) {
    headline = "A structured tactical rhythm is forming across today's fixtures.";
    theme = "structured";
  } else if (top) {
    headline = `${top.name} leads the scoring charts and is driving today's momentum.`;
    theme = "emerging";
  } else {
    headline = "Today's fixtures are beginning to take shape.";
    theme = "neutral";
  }

  // Memory enrichment
  if (memory.lastDominantTeam && theme !== "explosive") {
    headline += ` ${memory.lastDominantTeam}'s earlier dominance is still shaping perception.`;
  }

  if (
    memory.lastTopPlayer &&
    top &&
    memory.lastTopPlayer !== top.name
  ) {
    headline += ` A shift in standout performers is emerging.`;
  }

  memory.lastTopPlayer = top?.name || memory.lastTopPlayer;
  memory.lastStoryTheme = theme;

  memory.trend.push(theme);
  if (memory.trend.length > 10) memory.trend.shift();

  return { headline, theme };
}

// ---------------- MAIN ----------------
export async function GET() {
  const now = Date.now();

  // Return cached data if still fresh
  if (cache.data && now - cache.lastUpdated < ONE_HOUR) {
    return Response.json(cache.data);
  }

  let fixtures = [];

  try {
    fixtures = await fetchFixtures();
  } catch (err) {
    console.error("Failed to fetch fixtures:", err);
    // Return stale cache rather than crash if available
    if (cache.data) {
      return Response.json({ ...cache.data, stale: true });
    }
    return Response.json(
      { error: "Failed to fetch fixture data." },
      { status: 500 }
    );
  }

  const matches = [];
  const teams = {};

  for (const f of fixtures) {
    const home = f.teams?.home?.name;
    const away = f.teams?.away?.name;
    const hg = f.goals?.home ?? 0;
    const ag = f.goals?.away ?? 0;
    const statusShort = f.fixture?.status?.short || "NS";
    const statusLabel = getStatusLabel(statusShort);
    const score = `${hg}-${ag}`;
    const league = f.league?.name || "Unknown League";
    const country = f.league?.country || "";

    addTeamScore(teams, home, hg);
    addTeamScore(teams, away, ag);

    matches.push({
      id: f.fixture?.id,
      match: `${home} vs ${away}`,
      home,
      away,
      score,
      homeGoals: hg,
      awayGoals: ag,
      statusShort,
      status: statusLabel,
      league,
      country,
      kickoff: f.fixture?.date || null,
      narrative: summarizeMatch(home, away, hg, ag, statusShort)
    });
  }

  // Sort: live first, then finished, then not started
  const statusOrder = { live: 0, finished: 1, upcoming: 2 };

  function getMatchPriority(m) {
    const live = ["1H", "2H", "ET", "P", "HT", "LIVE"];
    const finished = ["FT", "AET", "PEN", "AWD", "WO"];
    if (live.includes(m.statusShort)) return 0;
    if (finished.includes(m.statusShort)) return 1;
    return 2;
  }

  matches.sort((a, b) => getMatchPriority(a) - getMatchPriority(b));

  const teamList = Object.values(teams)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  const story = computeStory(matches, teamList);

  const snapshot = {
    timestamp: now,
    story,
    matchCount: matches.length,
    memory: {
      lastDominantTeam: memory.lastDominantTeam,
      lastTopPlayer: memory.lastTopPlayer,
      themeTrend: [...memory.trend]
    }
  };

  snapshots.push(snapshot);
  if (snapshots.length > 24) snapshots.shift();

  const result = {
    generatedAt: new Date(now).toISOString(),
    story,
    matches,
    topTeams: teamList,
    snapshots: snapshots.slice(-5),
    memory: {
      lastDominantTeam: memory.lastDominantTeam,
      lastTopPlayer: memory.lastTopPlayer,
      themeTrend: [...memory.trend]
    }
  };

  cache = {
    data: result,
    lastUpdated: now
  };

  return Response.json(result);
}