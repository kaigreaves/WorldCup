'use client';

import { useState, useEffect } from 'react';
import { fetchRedditData, matchKey } from '../lib/reddit-client';
import type { RedditClientData, RedditComment, PerformerEntry } from '../lib/reddit-client';

// ── Shared ────────────────────────────────────────────────────────────────────

function truncate(text: string, max = 280): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  // Try to end at a sentence boundary rather than mid-word
  const lastEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastEnd > max * 0.55) return text.slice(0, lastEnd + 1);
  // Fall back to last word boundary
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
    <blockquote style={{
      margin: 0,
      padding: '12px 14px',
      background: 'rgba(0,0,0,0.2)',
      borderLeft: '2px solid var(--gold-border)',
      borderRadius: '1px',
    }}>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', fontStyle: 'italic', lineHeight: '1.65', margin: '0 0 8px 0' }}>
        &ldquo;{truncate(comment.body)}&rdquo;
      </p>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--gold)', opacity: 0.8 }}>↑ {comment.score.toLocaleString()}</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>u/{comment.author}</span>
        {comment.thread_title && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.5 }}>
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

// ── Match comments ────────────────────────────────────────────────────────────

export function MatchFanComments({
  homeTeam, awayTeam, label, isFinished,
}: {
  homeTeam: string;
  awayTeam: string;
  label: string;
  isFinished: boolean;
}) {
  const [comments, setComments] = useState<RedditComment[] | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v6');
    if (cached) {
      const data: RedditClientData = JSON.parse(cached);
      const key = matchKey(homeTeam, awayTeam);
      setComments(data.matchComments[key] ?? []);
      return;
    }
    // Data not yet loaded — RedditDataLoader will handle it
  }, [homeTeam, awayTeam]);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => {
      const key = matchKey(homeTeam, awayTeam);
      setComments(e.detail.matchComments[key] ?? []);
    };
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, [homeTeam, awayTeam, isFinished]);

  // Show nothing while comments are loading
  if (comments === null) return null;

  if (comments.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid var(--gold-border)', paddingTop: '16px', marginTop: '4px' }}>
      <p className="label" style={{ marginBottom: '12px', color: 'var(--muted)' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {comments.map((c, i) => <CommentBlock key={c.id ?? i} comment={c} />)}
      </div>
    </div>
  );
}

// ── Player comment (leaderboard + spotlight) ──────────────────────────────────

export function PlayerFanComment({ playerName }: { playerName: string }) {
  const [comment, setComment] = useState<RedditComment | null | undefined>(undefined);

  const findComment = (data: RedditClientData) => {
    const nameLower = playerName.toLowerCase();
    // last name, or for single-word names the full name
    const parts = playerName.split(' ');
    const lastName = (parts.pop() ?? '').toLowerCase();
    const firstName = (parts[0] ?? '').toLowerCase();

    // 1. Try pre-computed tracked playerComments
    const key = Object.keys(data.playerComments).find(k =>
      k.toLowerCase().includes(lastName) ||
      nameLower.includes(k.toLowerCase())
    );
    if (key) { setComment(data.playerComments[key]); return; }

    // 2. Search allComments for any mention of the player's last name (≥4 chars)
    const searchTerms = [lastName, firstName].filter(t => t.length >= 4);
    if (searchTerms.length > 0) {
      const pool = [...(data.allComments ?? []), ...data.fanVoiceComments];
      // prefer comments that explicitly mention the name
      const found = pool
        .filter(c => searchTerms.some(t => c.body.toLowerCase().includes(t)))
        .sort((a, b) => b.score - a.score)[0];
      if (found) { setComment(found); return; }
    }

    setComment(null);
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v6');
    if (cached) { findComment(JSON.parse(cached)); return; }
  }, [playerName]);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => findComment(e.detail);
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, [playerName]);

  // Show nothing while loading or if no comment found
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

const ACCOLADES = [
  'The Talk of the Tournament', "Everyone's Watching", "Name on Everyone's Lips",
  'Unavoidable', 'Making Noise', 'Rising', 'In Focus', 'Catching Eyes',
];

export function PerformersSection({ headless, playerMeta = {} }: { headless?: boolean; playerMeta?: Record<string, { photo?: string; teamLogo?: string }> } = {}) {
  const [performers, setPerformers] = useState<PerformerEntry[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  const apply = (data: RedditClientData) => {
    setPerformers(data.performers);
    setFetchedAt(data.fetchedAt);
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v6');
    if (cached) { apply(JSON.parse(cached)); return; }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => apply(e.detail);
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, []);

  return (
    <section>
      {!headless && (
        <div className="mb-8">
          <p className="label mb-3">The Standouts</p>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Performers of the Day</h2>
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
                background: isStar ? 'var(--navy-3)' : 'var(--navy-2)',
                border: isStar ? '1px solid var(--gold)' : '1px solid var(--gold-border)',
                borderRadius: '2px', padding: '24px', position: 'relative', overflow: 'hidden',
                boxShadow: isStar ? '0 0 24px rgba(201,168,76,0.12)' : 'none',
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
                      {isStar ? 'Performer of the Day' : (ACCOLADES[i] ?? 'Standout')}
                    </p>
                    <span style={{ fontSize: '10px', color: buzzColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {buzz} buzz
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                    {meta?.photo && (
                      <div style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--gold-border)' }}>
                        <img src={meta.photo} alt={p.name} width={44} height={44} style={{ objectFit: 'cover', objectPosition: 'top center', width: '100%', height: '100%' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        {meta?.teamLogo && (
                          <img src={meta.teamLogo} alt="" width={16} height={16} style={{ objectFit: 'contain', flexShrink: 0 }} />
                        )}
                        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 400, margin: 0, color: 'var(--white)' }}>
                          {p.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                    {[['mentions', p.mentionCount], ['fan score', Math.round(p.weightedScore).toLocaleString()]].map(([label, val]) => (
                      <div key={String(label)}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>{val}</div>
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

  const apply = (d: RedditClientData) => setData({ comments: d.fanVoiceComments, threads: d.threads.length, fetchedAt: d.fetchedAt });

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v6');
    if (cached) { apply(JSON.parse(cached)); return; }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => apply(e.detail);
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, []);

  return (
    <section>
      {!headless && (
        <div className="mb-8">
          <p className="label mb-3">The Crowd</p>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Fan Voice</h2>
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
                fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 300,
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

// ── Data loader — runs once, fires event, caches in sessionStorage ────────────

export function RedditLoadingBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v6');
    if (cached) { setReady(true); return; }
    const handler = () => setReady(true);
    window.addEventListener('reddit-data-ready', handler);
    return () => window.removeEventListener('reddit-data-ready', handler);
  }, []);

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

export function RedditDataLoader({
  fixtures,
}: {
  fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>;
}) {
  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v6');
    const cacheTime = sessionStorage.getItem('reddit_data_v6_time');
    const THIRTY_MIN = 30 * 60 * 1000;

    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < THIRTY_MIN) {
      const data = JSON.parse(cached);
      window.dispatchEvent(new CustomEvent('reddit-data-ready', { detail: data }));
      return;
    }

    fetchRedditData(fixtures).then(data => {
      console.log('[Reddit] threads found:', data.threads.length, data.threads.map(t => t.title));
      console.log('[Reddit] playerComments keys:', Object.keys(data.playerComments));
      console.log('[Reddit] performers:', data.performers.map(p => p.name));
      console.log('[Reddit] fanVoice count:', data.fanVoiceComments.length);
      sessionStorage.setItem('reddit_data_v6', JSON.stringify(data));
      sessionStorage.setItem('reddit_data_v6_time', Date.now().toString());
      window.dispatchEvent(new CustomEvent('reddit-data-ready', { detail: data }));
    });
  }, []);

  return null;
}
