import Image from 'next/image';
import type { Storyline } from '../lib/api';
import { PlayerFanComment } from './RedditShell';
import LeaderboardLink from './LeaderboardLink';

function getSectionHeadline(storylines: Storyline[]): string {
  const top = storylines[0];
  const second = storylines[1];
  if (!top) return 'The Story So Far';

  const topShort = top.playerName.split(' ').pop() ?? top.playerName;
  const secondShort = second?.playerName.split(' ').pop() ?? '';

  // Two players statistically level at the top
  if (second && top.goals === second.goals && top.assists === second.assists && top.goals >= 2) {
    return `${topShort} and ${secondShort} Are Running Away With This`;
  }
  if (top.goals >= 4) return `${topShort} Is Defining This Tournament`;
  if (top.goals >= 2 && top.assists >= 1) return `${topShort} Is the Complete Package Right Now`;
  if (top.goals >= 2) return `${topShort} Is Leading the Golden Boot Race`;
  if (top.goals >= 1 && top.assists >= 1 && second && second.goals >= 1) {
    return `${topShort} and ${secondShort} Setting the Early Pace`;
  }
  return 'Every Match Changes Everything';
}

export default function Storylines({ storylines }: { storylines: Storyline[] }) {
  if (storylines.length === 0) return null;

  const [hero, ...rest] = storylines;
  const headline = getSectionHeadline(storylines);

  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Narrative</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>{headline}</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          The arcs defining World Cup 2026 — tracked by the fans who are living it
        </p>
        <LeaderboardLink style={{ marginTop: '12px' }}>See the full Legacy Leaderboard →</LeaderboardLink>
      </div>

      {/* Hero card — top performer */}
      {hero && <HeroCard story={hero} />}

      {/* Remaining cards */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px' }}>
        {rest.map(story => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}

function HeroCard({ story }: { story: Storyline }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '200px 1fr',
      gap: 0,
      background: 'var(--navy-2)',
      border: '1px solid var(--gold-border)',
      borderRadius: '2px',
      overflow: 'hidden',
      marginBottom: '2px',
    }}>
      {/* Photo panel */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: '260px' }}>
        {story.playerPhoto ? (
          <Image
            src={story.playerPhoto}
            alt={story.playerName}
            fill
            sizes="200px"
            style={{
              objectFit: 'cover',
              objectPosition: 'top center', filter: 'brightness(0.85)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--navy-3)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, var(--navy-2) 100%)' }} />
        <div style={{ position: 'absolute', top: '14px', left: '12px' }}>
          <span style={{
            fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--gold)', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            background: 'rgba(0,17,43,0.75)', padding: '4px 8px', borderRadius: '1px',
          }}>
            {story.tag}
          </span>
        </div>
        {story.teamLogo && (
          <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
            <Image src={story.teamLogo} alt={story.teamName} width={28} height={28} style={{ objectFit: 'contain', opacity: 0.9 }} />
          </div>
        )}
      </div>

      {/* Content panel */}
      <div style={{ padding: '28px 28px 24px' }}>
        <h3 style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
          fontWeight: 400, lineHeight: 1.25, color: 'var(--white)', margin: '0 0 14px 0',
        }}>
          {story.headline}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7', margin: '0 0 18px 0', fontStyle: 'italic' }}>
          {story.context}
        </p>
        <PlayerFanComment playerName={story.playerName} />
      </div>
    </div>
  );
}

function StoryCard({ story }: { story: Storyline }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0,
      borderBottom: '1px solid var(--gold-border)', overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', minHeight: '160px', overflow: 'hidden' }}>
        {story.playerPhoto ? (
          <Image
            src={story.playerPhoto}
            alt={story.playerName}
            fill
            sizes="120px"
            style={{
              objectFit: 'cover',
              objectPosition: 'top center', filter: 'brightness(0.8)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--navy-3)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, var(--navy) 100%)' }} />
        <div style={{ position: 'absolute', top: '10px', left: '8px' }}>
          <span style={{
            fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--gold)', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            background: 'rgba(0,17,43,0.8)', padding: '3px 6px', borderRadius: '1px',
          }}>
            {story.tag}
          </span>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
          {story.teamLogo && (
            <Image src={story.teamLogo} alt={story.teamName} width={18} height={18}
              style={{ objectFit: 'contain', marginTop: '4px', flexShrink: 0, opacity: 0.9 }} />
          )}
          <h3 style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
            fontWeight: 400, lineHeight: 1.3, color: 'var(--white)', margin: 0,
          }}>
            {story.headline}
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6', margin: '0 0 12px 0' }}>
          {story.context}
        </p>
        <PlayerFanComment playerName={story.playerName} />
      </div>
    </div>
  );
}
