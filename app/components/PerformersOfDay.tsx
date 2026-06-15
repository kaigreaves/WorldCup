import type { PerformerEntry } from '../lib/reddit';

interface Props {
  performers: PerformerEntry[];
  fetchedAt: string;
}

function truncate(text: string, max = 260): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const ACCOLADES = [
  'The Talk of the Tournament',
  'Everyone\'s Watching',
  'The Name on Everyone\'s Lips',
  'Unavoidable',
  'Making Noise',
  'Rising',
  'In Focus',
  'Catching Eyes',
];

function PerformerCard({ entry, index }: { entry: PerformerEntry; index: number }) {
  const accolade = ACCOLADES[index] ?? 'Standout';
  const buzz = entry.mentionCount >= 15 ? 'Dominant' : entry.mentionCount >= 8 ? 'High' : 'Growing';
  const buzzColor = buzz === 'Dominant' ? '#4ade80' : buzz === 'High' ? 'var(--gold)' : 'var(--muted)';

  return (
    <div style={{
      background: 'var(--navy-2)',
      border: '1px solid var(--gold-border)',
      borderRadius: '2px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '3px', height: '100%',
        background: 'var(--gold)', opacity: 0.6,
      }} />

      <div style={{ paddingLeft: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: 0 }}>
            {accolade}
          </p>
          <span style={{ fontSize: '10px', color: buzzColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {buzz} buzz
          </span>
        </div>

        <h3 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.5rem',
          fontWeight: 400,
          margin: '0 0 6px 0',
          color: 'var(--white)',
        }}>
          {entry.name}
        </h3>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
              {entry.mentionCount}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
              mentions
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
              {Math.round(entry.weightedScore).toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
              fan score
            </div>
          </div>
        </div>

        {/* Top fan comment */}
        <blockquote style={{
          margin: 0,
          padding: '12px 14px',
          background: 'rgba(0,0,0,0.25)',
          borderLeft: '2px solid var(--gold-border)',
          borderRadius: '1px',
        }}>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)',
            fontStyle: 'italic',
            lineHeight: '1.6',
            margin: '0 0 8px 0',
          }}>
            &ldquo;{truncate(entry.topComment.body)}&rdquo;
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--gold)', opacity: 0.8 }}>
              ↑ {entry.topComment.score.toLocaleString()}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              u/{entry.topComment.author}
            </span>
            {entry.topComment.thread_title && (
              <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.5 }}>
                · {entry.topComment.thread_title.replace(/\|.*/,'').trim()}
              </span>
            )}
          </div>
        </blockquote>
      </div>
    </div>
  );
}

export default function PerformersOfDay({ performers, fetchedAt }: Props) {
  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Standouts</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Performers of the Day</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          Driven entirely by Reddit — whoever fans are raving about most · Updated {timeAgo(fetchedAt)}
        </p>
      </div>

      {performers.length === 0 ? (
        <div style={{ padding: '40px', border: '1px solid var(--gold-border)', borderRadius: '2px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>
            Checking r/soccer and r/worldcup for standout performances…
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {performers.map((p, i) => (
            <PerformerCard key={p.name} entry={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
