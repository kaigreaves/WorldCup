import type { RedditData } from '../lib/reddit';

interface Props {
  data: RedditData;
}

function truncate(text: string, max = 400): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function FanVoice({ data }: Props) {
  const { fanVoiceComments, threads, fetchedAt } = data;

  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Crowd</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Fan Voice</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          Top comments from r/soccer &amp; r/worldcup · {threads.length} threads tracked · Updated {timeAgo(fetchedAt)}
        </p>
      </div>

      {fanVoiceComments.length === 0 ? (
        <div style={{ padding: '40px', border: '1px solid var(--gold-border)', borderRadius: '2px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>
            The crowd will speak once matches begin.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {fanVoiceComments.map((c, i) => (
            <div
              key={c.id ?? i}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr',
                gap: '20px',
                alignItems: 'start',
                padding: '22px 24px',
                background: i === 0 ? 'var(--navy-2)' : 'transparent',
                border: i === 0 ? '1px solid var(--gold-border)' : '1px solid transparent',
                borderRadius: '2px',
              }}
            >
              <span style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '2rem',
                fontWeight: 300,
                color: 'var(--gold)',
                opacity: i === 0 ? 0.6 : 0.25,
                lineHeight: 1,
                paddingTop: '4px',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>

              <div>
                <p style={{
                  fontSize: '14px',
                  color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.72)',
                  fontStyle: 'italic',
                  lineHeight: '1.7',
                  margin: '0 0 10px 0',
                }}>
                  &ldquo;{truncate(c.body)}&rdquo;
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--gold)', letterSpacing: '0.03em' }}>
                    ↑ {c.score.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>u/{c.author}</span>
                  {c.thread_title && (
                    <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.5 }}>
                      {c.thread_title.replace(/\s*\|.*/, '').trim()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
