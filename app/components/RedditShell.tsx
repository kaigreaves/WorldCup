'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { matchKey } from '../lib/reddit-client';
import { initRedditStore, subscribeReddit } from '../lib/reddit-store';
import type { RedditClientData, RedditComment, PerformerEntry } from '../lib/reddit-client';

// ── Shared ────────────────────────────────────────────────────────────────────

function truncate(text: string, max = 280): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastEnd > max * 0.55) return text.slice(0, lastEnd + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function CommentBlock({ comment }: { comment: RedditComment }) {
  return (
    <blockquote className="comment-block" style={{ margin: 0 }}>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: '1.7', margin: '0 0 10px 0' }}>
        &ldquo;{truncate(comment.body)}&rdquo;
      </p>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 500 }}>↑ {comment.score.toLocaleString()}</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>u/{comment.author}</span>
        {comment.thread_title && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
            · {comment.thread_title.replace(/\s*\|.*/, '').trim()}
          </span>
        )}
      </div>
    </blockquote>
  );
}

function Loading() {
  return (
    <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
      Loading fan comments…
    </span>
  );
}

// Shared hook — returns data once available, null while loading
function useRedditData<T>(select: (d: RedditClientData) => T): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    return subscribeReddit(data => setValue(select(data)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

// ── Match comments ────────────────────────────────────────────────────────────

export function MatchFanComments({
  homeTeam, awayTeam, label,
}: {
  homeTeam: string;
  awayTeam: string;
  label: string;
  isFinished: boolean;
}) {
  const [comments, setComments] = useState<RedditComment[] | null>(null);

  useEffect(() => {
    const key = matchKey(homeTeam, awayTeam);
    return subscribeReddit(data => setComments(data.matchComments[key] ?? []));
  }, [homeTeam, awayTeam]);

  if (comments === null || comments.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid var(--gold-border)', paddingTop: '18px', marginTop: '8px' }}>
      <p className="label" style={{ marginBottom: '14px' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {comments.map((c, i) => <CommentBlock key={c.id ?? i} comment={c} />)}
      </div>
    </div>
  );
}

// ── Player comment (leaderboard + spotlight) ──────────────────────────────────

export function PlayerFanComment({ playerName }: { playerName: string }) {
  const [comment, setComment] = useState<RedditComment | null | undefined>(undefined);

  useEffect(() => {
    const lower = playerName.toLowerCase();
    const lastName = lower.split(' ').pop() ?? lower;
    return subscribeReddit(data => {
      const allComments: RedditComment[] = (data as RedditClientData & { allComments?: RedditComment[] }).allComments ?? [];
      // Try direct player comment lookup first
      const direct = data.playerComments[lower] ?? data.playerComments[lastName];
      if (direct) { setComment(direct); return; }
      // Fallback: search all comments for name mention
      const found = allComments.find(c => {
        const b = c.body.toLowerCase();
        return b.includes(lower) || b.includes(lastName);
      });
      setComment(found ?? null);
    });
  }, [playerName]);

  if (comment === undefined) return null; // loading
  if (!comment) return null;

  return (
    <div style={{ marginTop: '8px' }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', fontStyle: 'italic', lineHeight: '1.55', margin: '0 0 4px 0' }}>
        &ldquo;{truncate(comment.body, 220)}&rdquo;
      </p>
      <span style={{ fontSize: '10px', color: 'var(--gold)', opacity: 0.7 }}>
        ↑ {comment.score.toLocaleString()} · u/{comment.author}
      </span>
    </div>
  );
}

// ── Performers section ────────────────────────────────────────────────────────

// Labels for performer cards: first is featured, rest show "Buzzing"

export function PerformersSection({ headless, playerMeta = {} }: { headless?: boolean; playerMeta?: Record<string, { photo?: string; teamLogo?: string }> } = {}) {
  const [performers, setPerformers] = useState<PerformerEntry[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  useEffect(() => {
    return subscribeReddit(data => {
      setPerformers(data.performers);
      setFetchedAt(data.fetchedAt);
    });
  }, []);

  return (
    <section>
      {!headless && (
        <div className="mb-8">
          <p className="label mb-3">The Standouts</p>
          <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--white)', margin: 0 }}>Performers of the Day</h2>
          <div className="gold-line mt-4" />
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
            Driven by Reddit — whoever fans are raving about most
            {fetchedAt && ` · Updated ${timeAgo(fetchedAt)}`}
          </p>
        </div>
      )}

      {!performers ? (
        <div style={{ padding: '40px', border: '1px solid var(--gold-border)', borderRadius: '2px', textAlign: 'center' }}>
          <Loading />
        </div>
      ) : performers.length === 0 ? (
        <div style={{ padding: '40px', border: '1px solid var(--gold-border)', borderRadius: '2px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>No standout performers found yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {performers.map((p, i) => {
            const buzz = p.mentionCount >= 15 ? 'Dominant' : p.mentionCount >= 8 ? 'High' : 'Growing';
            const buzzColor = buzz === 'Dominant' ? '#4ade80' : buzz === 'High' ? 'var(--gold)' : 'var(--muted)';
            const lastName = p.name.split(' ').pop()?.toLowerCase() ?? '';
            const meta = playerMeta[p.name.toLowerCase()] ?? playerMeta[lastName];
            const isStar = i === 0;
            return (
              <div key={p.name} style={{
                background: isStar ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                border: isStar ? '0.5px solid rgba(201,168,76,0.35)' : '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '20px', position: 'relative', overflow: 'hidden',
                boxShadow: isStar ? '0 4px 24px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(201,168,76,0.1) inset' : '0 2px 12px rgba(0,0,0,0.15)',
              }}>
                {isStar && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(to right, var(--gold), transparent)' }} />
                )}
                {!isStar && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--gold)', opacity: 0.4 }} />
                )}
                <div style={{ paddingLeft: isStar ? '0' : '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: 0, fontWeight: isStar ? 600 : 400 }}>
                      {isStar ? 'Talk of the Town' : 'Buzzing'}
                    </p>
                    <span style={{ fontSize: '10px', color: buzzColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {buzz} buzz
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {meta?.teamLogo && (
                      <Image src={meta.teamLogo} alt="" width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }} />
                    )}
                    <h3 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '1.4rem', fontWeight: 500, margin: 0, color: 'var(--white)', letterSpacing: '-0.01em' }}>
                      {p.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                    {[['mentions', p.mentionCount], ['fan score', Math.round(p.weightedScore).toLocaleString()]].map(([label, val]) => (
                      <div key={String(label)}>
                        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <CommentBlock comment={p.topComment} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Fan Voice section ─────────────────────────────────────────────────────────

export function FanVoiceSection({ headless }: { headless?: boolean } = {}) {
  const [data, setData] = useState<{ comments: RedditComment[]; threads: number; fetchedAt: string } | null>(null);

  useEffect(() => {
    return subscribeReddit(d => setData({ comments: d.fanVoiceComments, threads: d.threads.length, fetchedAt: d.fetchedAt }));
  }, []);

  return (
    <section>
      {!headless && (
        <div className="mb-8">
          <p className="label mb-3">The Crowd</p>
          <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--white)', margin: 0 }}>Fan Voice</h2>
          <div className="gold-line mt-4" />
          {data && (
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
              Top comments from r/soccer &amp; r/worldcup · {data.threads} threads · Updated {timeAgo(data.fetchedAt)}
            </p>
          )}
        </div>
      )}

      {!data ? (
        <div style={{ padding: '40px', border: '1px solid var(--gold-border)', borderRadius: '2px', textAlign: 'center' }}>
          <Loading />
        </div>
      ) : data.comments.length === 0 ? (
        <div style={{ padding: '40px', border: '1px solid var(--gold-border)', borderRadius: '2px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>The crowd will speak once matches begin.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {data.comments.map((c, i) => (
            <div key={c.id ?? i} style={{
              display: 'grid', gridTemplateColumns: '52px 1fr', gap: '20px', alignItems: 'start',
              padding: '22px 24px',
              background: i === 0 ? 'var(--navy-2)' : 'transparent',
              border: i === 0 ? '1px solid var(--gold-border)' : '1px solid transparent',
              borderRadius: '2px',
            }}>
              <span style={{
                fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '2rem', fontWeight: 300,
                color: 'var(--gold)', opacity: i === 0 ? 0.6 : 0.25, lineHeight: 1, paddingTop: '4px',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p style={{
                  fontSize: '14px', color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.72)',
                  fontStyle: 'italic', lineHeight: '1.7', margin: '0 0 10px 0',
                }}>
                  &ldquo;{truncate(c.body, 400)}&rdquo;
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--gold)' }}>↑ {c.score.toLocaleString()}</span>
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

// ── Tournament Favourites — cumulative all-time fan buzz ─────────────────────

export function TournamentFavourites() {
  const [favs, setFavs] = useState<PerformerEntry[] | null>(null);

  useEffect(() => {
    return subscribeReddit(data => setFavs(data.tournamentFavourites ?? []));
  }, []);

  if (!favs) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <Loading />
    </div>
  );

  if (favs.length === 0) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>Fan verdict still forming.</p>
    </div>
  );

  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">Fan Verdict</p>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--white)', margin: '0 0 0 0' }}>Tournament Favourites</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          Who fans have talked about most across every thread this tournament
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {favs.map((p, i) => (
          <div key={p.name} style={{
            display: 'grid', gridTemplateColumns: '44px 1fr auto',
            gap: '16px', alignItems: 'center',
            padding: '16px 20px',
            background: i < 3 ? 'var(--navy-2)' : 'transparent',
            borderLeft: i === 0 ? '2px solid var(--gold)' : i < 3 ? '2px solid rgba(201,168,76,0.3)' : '2px solid transparent',
            borderRadius: '1px',
          }}>
            <span style={{
              fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '2rem', fontWeight: 300,
              color: 'var(--gold)', opacity: i === 0 ? 0.7 : 0.3, lineHeight: 1,
            }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '1.15rem', fontWeight: i < 3 ? 500 : 400,
                color: i < 3 ? 'var(--white)' : 'rgba(255,255,255,0.7)',
              }}>
                {p.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontStyle: 'italic' }}>
                &ldquo;{truncate(p.topComment.body, 120)}&rdquo;
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
                {p.mentionCount}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
                mentions
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Loading banner (shown until data arrives) ─────────────────────────────────

export function RedditLoadingBanner() {
  const [ready, setReady] = useState(false);
  useEffect(() => subscribeReddit(() => setReady(true)), []);
  if (ready) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
      background: 'var(--navy-2)', border: '1px solid var(--gold-border)',
      borderRadius: '2px', padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: 'var(--gold)', animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.08em' }}>Loading fan comments…</span>
    </div>
  );
}

// ── Data loader — call once at app root to start the fetch ────────────────────

export function RedditDataLoader({
  fixtures,
}: {
  fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>;
}) {
  useEffect(() => {
    initRedditStore(fixtures);
  // fixtures is stable (server-rendered), intentionally omitting from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
