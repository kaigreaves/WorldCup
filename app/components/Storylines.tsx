import type { Storyline } from '../lib/api';
import { PlayerFanComment } from './RedditShell';

export default function Storylines({ storylines }: { storylines: Storyline[] }) {
  if (storylines.length === 0) return null;

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

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {storylines.map((story, i) => (
          <StoryCard key={story.id} story={story} isFirst={i === 0} />
        ))}
      </div>
    </section>
  );
}

function StoryCard({ story, isFirst }: { story: Storyline; isFirst: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 160px) 1fr',
      gap: '40px',
      padding: isFirst ? '0 0 36px 0' : '36px 0',
      borderBottom: '1px solid var(--gold-border)',
      alignItems: 'start',
    }}>
      {/* Tag */}
      <div style={{ paddingTop: '6px' }}>
        <span style={{
          fontSize: '9px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        }}>
          {story.tag}
        </span>
      </div>

      {/* Content */}
      <div>
        <h3 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
          fontWeight: 400,
          lineHeight: 1.3,
          color: 'var(--white)',
          margin: '0 0 10px 0',
          maxWidth: '640px',
        }}>
          {story.headline}
        </h3>
        <p style={{
          fontSize: '13px',
          color: 'var(--muted)',
          lineHeight: '1.75',
          margin: '0 0 14px 0',
          maxWidth: '560px',
          fontStyle: 'italic',
        }}>
          {story.context}
        </p>
        <PlayerFanComment playerName={story.playerName} />
      </div>
    </div>
  );
}
