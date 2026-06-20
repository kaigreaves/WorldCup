// Client-side "follow a player" store. No backend — the moat here is permission:
// a returning visitor is shown exactly what changed for the players they care
// about ("since your last visit"), which is what makes the app worth reopening.
//
// Two keys:
//   glacier_following_v1      — array of followed players
//   glacier_following_seen_v1 — name → the rank the user last saw, so we can
//                               compute movement across sessions.

export interface FollowedPlayer {
  playerId: number;
  name: string;
}

const FOLLOW_KEY = 'glacier_following_v1';
const SEEN_KEY = 'glacier_following_seen_v1';
export const FOLLOW_CHANGE_EVENT = 'glacier-follow-change';

export function getFollowed(): FollowedPlayer[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function isFollowed(playerId: number): boolean {
  return getFollowed().some(p => p.playerId === playerId);
}

// Returns the new follow state (true = now following).
export function toggleFollow(player: FollowedPlayer): boolean {
  const list = getFollowed();
  const idx = list.findIndex(p => p.playerId === player.playerId);
  let nowFollowing: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    nowFollowing = false;
  } else {
    list.push({ playerId: player.playerId, name: player.name });
    nowFollowing = true;
  }
  try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(list)); } catch {}
  try { window.dispatchEvent(new Event(FOLLOW_CHANGE_EVENT)); } catch {}
  return nowFollowing;
}

export function getSeenRanks(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

export function saveSeenRanks(map: Record<string, number>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch {}
}
