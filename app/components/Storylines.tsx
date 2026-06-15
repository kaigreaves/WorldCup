import type { Storyline } from '../lib/api';
import { PlayerFanComment } from './RedditShell';

export default function Storylines({ storylines }: { storylines: Storyline[] }) {
  if (storylines.length === 0) return null;

  const [hero, ...rest] = storylines;

  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Narrative</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>The Story So Far</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          The arcs defining World Cup 2026 — tracked by the fans who are living it
        </p>
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
      borderBottom: '1px solid var(--gold-border)',
      marginBottom: '0',
      background: 'var(--navy-2)',
      border: '1px solid var(--gold-border)',
      borderRadius: '2px',
      overflow: 'hidden',
      marginBottom: '2px',
    }}>
      {/* Photo panel */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: '260px' }}>
        {story.playerPhoto ? (
          <img
            src={story.playerPhoto}
            alt={story.playerName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
              filter: 'brightness(0.85)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--navy-3)' }} />
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, transparent 60%, var(--navy-2) 100%)',
        }} />
        {/* Tag label over photo */}
        <div style={{ position: 'absolute', top: '14px', left: '12px' }}>
          <span style={{
            fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--gold)', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            background: 'rgba(0,17,43,0.75)', padding: '4px 8px', borderRadius: '1px',
          }}>
            {story.tag}
          </span>
        </div>
        {/* Team logo bottom-left */}
        {story.teamLogo && (
          <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
            <img src={story.teamLogo} alt={story.teamName} width={28} height={28} style={{ objectFit: 'contain', opacity: 0.9 }} />
          </div>
        )}
      </div>

      {/* Content panel */}
      <div style={{ padding: '28px 28px 24px' }}>
        <h3 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
          fontWeight: 400,
          lineHeight: 1.25,
          color: 'var(--white)',
          margin: '0 0 14px 0',
        }}>
          {story.headline}
        </h3>
        <p style={{
          fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7',
          margin: '0 0 18px 0', fontStyle: 'italic',
        }}>
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
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      gap: 0,
      borderBottom: '1px solid var(--gold-border)',
      overflow: 'hidden',
    }}>
      {/* Photo */}
      <div style={{ position: 'relative', minHeight: '160px', overflow: 'hidden' }}>
        {story.playerPhoto ? (
          <img
            src={story.playerPhoto}
            alt={story.playerName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
              filter: 'brightness(0.8)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--navy-3)' }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, transparent 50%, var(--navy) 100%)',
        }} />
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

      {/* Content */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
          {story.teamLogo && (
            <img src={story.teamLogo} alt={story.teamName} width={18} height={18}
              style={{ objectFit: 'contain', marginTop: '4px', flexShrink: 0, opacity: 0.9 }} />
          )}
          <h3 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
            fontWeight: 400,
            lineHeight: 1.3,
            color: 'var(--white)',
            margin: 0,
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
