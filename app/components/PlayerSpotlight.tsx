import Image from 'next/image';
import type { ApiScorer, ApiFixture, SpotlightConfig } from '../lib/api';
import { findSpotlightStats, getTeamFixtures } from '../lib/api';
import { PlayerFanComment } from './RedditShell';
import LeaderboardLink from './LeaderboardLink';

interface Props {
  players: SpotlightConfig[];
  scorers: ApiScorer[];
  assists: ApiScorer[];
  fixtures: ApiFixture[];
  headless?: boolean;
}

function getRatingLabel(goals: number, assists: number, matches: number): { text: string; level: number } {
  const perGame = matches > 0 ? (goals * 2 + assists) / matches : 0;
  if (goals >= 5) return { text: 'Tournament defining', level: 5 };
  if (goals >= 3 || perGame >= 1.5) return { text: 'Exceptional', level: 4 };
  if (goals >= 2 || assists >= 2 || perGame >= 1) return { text: 'Influential', level: 3 };
  if (goals >= 1 || assists >= 1) return { text: 'Contributing', level: 2 };
  if (matches > 0) return { text: 'Present', level: 1 };
  return { text: 'Yet to feature', level: 0 };
}

function TournamentBar({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ height: '3px', flex: 1, background: i <= level ? 'var(--gold)' : 'var(--gold-border)', borderRadius: '1px' }} />
      ))}
    </div>
  );
}

function SpotlightCard({ player, scorers, assists, fixtures }: {
  player: SpotlightConfig;
  scorers: ApiScorer[];
  assists: ApiScorer[];
  fixtures: ApiFixture[];
}) {
  const stats = findSpotlightStats(player, scorers, assists);
  const teamFixtures = getTeamFixtures(fixtures, player.teamName);
  const { text: ratingLabel, level } = getRatingLabel(stats.goals, stats.assists, stats.matches);

  return (
    <div style={{ background: 'var(--navy-2)', border: '1px solid var(--gold-border)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '4px', background: `linear-gradient(to right, ${player.color}, transparent)`, opacity: 0.8 }} />
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {/* Headshot */}
          {player.playerPhoto && (
            <div style={{ flexShrink: 0, width: '56px', height: '56px', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--gold-border)' }}>
              <Image
                src={player.playerPhoto}
                alt={player.fullName}
                width={56}
                height={56}
                style={{ objectFit: 'cover', objectPosition: 'top center', width: '100%', height: '100%', filter: 'brightness(0.9)' }}
              />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
              {player.teamLogo && (
                <Image src={player.teamLogo} alt={player.teamName} width={16} height={16} style={{ objectFit: 'contain', flexShrink: 0 }} />
              )}
              <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: 0 }}>
                {player.teamTla} · {player.role}
              </p>
            </div>
            <h3 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '1.5rem', fontWeight: 400, margin: 0, color: 'var(--white)' }}>
              {player.fullName}
            </h3>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Tournament so far</span>
            <span style={{ fontSize: '12px', color: 'var(--gold)', fontStyle: 'italic' }}>{ratingLabel}</span>
          </div>
          <TournamentBar level={level} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[['Goals', stats.goals], ['Assists', stats.assists], ['Apps', stats.matches]].map(([label, value]) => (
            <div key={String(label)} style={{ background: 'var(--navy-3)', padding: '10px 12px', borderRadius: '2px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
            What fans are saying
          </p>
          <PlayerFanComment playerName={player.fullName} />
        </div>

        {!/mbapp|messi/i.test(player.fullName) && (
          <LeaderboardLink style={{ marginBottom: '4px' }}>
            See where {player.fullName.split(' ').pop()} ranks →
          </LeaderboardLink>
        )}

        {teamFixtures.length > 0 && (
          <div style={{ borderTop: '1px solid var(--gold-border)', paddingTop: '16px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              {player.teamName} — Recent
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {teamFixtures.map(f => {
                const isHome = f.teams.home.name.toLowerCase().includes(player.teamName.toLowerCase());
                const teamGoals = isHome ? f.goals.home ?? 0 : f.goals.away ?? 0;
                const oppGoals = isHome ? f.goals.away ?? 0 : f.goals.home ?? 0;
                const opp = isHome ? f.teams.away.name : f.teams.home.name;
                const won = isHome ? f.teams.home.winner : f.teams.away.winner;
                const lost = isHome ? f.teams.away.winner : f.teams.home.winner;
                return (
                  <div key={f.fixture.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: 'var(--muted)' }}>{new Date(f.fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span style={{ color: 'rgba(255,255,255,0.65)' }}>vs {opp}</span>
                    <span style={{ color: won ? '#4ade80' : lost ? 'var(--red)' : 'var(--gold)', fontWeight: 500 }}>{teamGoals}–{oppGoals}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayerSpotlight({ players, scorers, assists, fixtures, headless }: Props) {
  return (
    <section>
      {!headless && (
        <div className="mb-8">
          <p className="label mb-3">Under The Lens</p>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Player Spotlight</h2>
          <div className="gold-line mt-4" />
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
            Mbappé and Messi always. The other three go to whoever the tournament is talking about.
          </p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {players.map(player => (
          <SpotlightCard key={player.nameFragment} player={player} scorers={scorers} assists={assists} fixtures={fixtures} />
        ))}
      </div>
    </section>
  );
}
