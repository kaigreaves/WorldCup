'use client';

import { useState, useEffect } from 'react';
import { fetchRedditData, matchKey } from '../lib/reddit-client';
import type { RedditClientData, RedditComment, PerformerEntry } from '../lib/reddit-client';

// ── Shared ────────────────────────────────────────────────────────────────────

function truncate(text: string, max = 280): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
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
    const cached = sessionStorage.getItem('reddit_data_v4');
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

  if (comments === null) return (
    <div style={{ borderTop: '1px solid var(--gold-border)', paddingTop: '16px' }}>
      <p className="label" style={{ marginBottom: '8px', color: 'var(--muted)' }}>{label}</p>
      <Loading />
    </div>
  );

  return (
    <div style={{ borderTop: '1px solid var(--gold-border)', paddingTop: '16px' }}>
      <p className="label" style={{ marginBottom: '12px', color: 'var(--muted)' }}>{label}</p>
      {comments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comments.map((c, i) => <CommentBlock key={c.id ?? i} comment={c} />)}
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: 0 }}>
          No Reddit thread found yet.
        </p>
      )}
    </div>
  );
}

// ── Player comment (leaderboard + spotlight) ──────────────────────────────────

export function PlayerFanComment({
  playerName,
  fallback,
}: {
  playerName: string;
  fallback?: string;
}) {
  const [comment, setComment] = useState<RedditComment | null | undefined>(undefined);

  const findComment = (data: RedditClientData) => {
    // Try playerComments first (tracked players with detected mentions)
    const lastName = playerName.toLowerCase().split(' ').pop() ?? '';
    const key = Object.keys(data.playerComments).find(k =>
      k.toLowerCase().includes(lastName) ||
      playerName.toLowerCase().includes(k.toLowerCase())
    );
    if (key) { setComment(data.playerComments[key]); return; }

    // Fallback: search fan voice comments for any mention of the player's last name
    if (lastName.length >= 4) {
      const found = data.fanVoiceComments.find(c => c.body.toLowerCase().includes(lastName));
      if (found) { setComment(found); return; }
    }

    setComment(null);
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v4');
    if (cached) { findComment(JSON.parse(cached)); return; }
  }, [playerName]);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => findComment(e.detail);
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, [playerName]);

  if (comment === undefined) return (
    <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', margin: '4px 0 0 0', lineHeight: '1.4' }}>
      <Loading />
    </p>
  );

  if (!comment) return (
    <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', margin: '4px 0 0 0', lineHeight: '1.4' }}>
      {fallback}
    </p>
  );

  return (
    <div style={{ marginTop: '8px' }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', fontStyle: 'italic', lineHeight: '1.55', margin: '0 0 4px 0' }}>
        &ldquo;{truncate(comment.body, 200)}&rdquo;
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

export function PerformersSection() {
  const [performers, setPerformers] = useState<PerformerEntry[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  const apply = (data: RedditClientData) => {
    setPerformers(data.performers);
    setFetchedAt(data.fetchedAt);
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v4');
    if (cached) { apply(JSON.parse(cached)); return; }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => apply(e.detail);
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, []);

  return (
    <section>
      <div className="mb-8">
        <p className="label mb-3">The Standouts</p>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--white)' }}>Performers of the Day</h2>
        <div className="gold-line mt-4" />
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', fontStyle: 'italic' }}>
          Driven by Reddit — whoever fans are raving about most
          {fetchedAt && ` · Updated ${timeAgo(fetchedAt)}`}
        </p>
      </div>

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
            return (
              <div key={p.name} style={{
                background: 'var(--navy-2)', border: '1px solid var(--gold-border)',
                borderRadius: '2px', padding: '24px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--gold)', opacity: 0.6 }} />
                <div style={{ paddingLeft: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', margin: 0 }}>
                      {ACCOLADES[i] ?? 'Standout'}
                    </p>
                    <span style={{ fontSize: '10px', color: buzzColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {buzz} buzz
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 400, margin: '0 0 6px 0', color: 'var(--white)' }}>
                    {p.name}
                  </h3>
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

export function FanVoiceSection() {
  const [data, setData] = useState<{ comments: RedditComment[]; threads: number; fetchedAt: string } | null>(null);

  const apply = (d: RedditClientData) => setData({ comments: d.fanVoiceComments, threads: d.threads.length, fetchedAt: d.fetchedAt });

  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v4');
    if (cached) { apply(JSON.parse(cached)); return; }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<RedditClientData>) => apply(e.detail);
    window.addEventListener('reddit-data-ready', handler as EventListener);
    return () => window.removeEventListener('reddit-data-ready', handler as EventListener);
  }, []);

  return (
    <section>
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

export function RedditDataLoader({
  fixtures,
}: {
  fixtures: Array<{ homeTeam: string; awayTeam: string; isFinished: boolean }>;
}) {
  useEffect(() => {
    const cached = sessionStorage.getItem('reddit_data_v4');
    const cacheTime = sessionStorage.getItem('reddit_data_v4_time');
    const ONE_HOUR = 60 * 60 * 1000;

    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < ONE_HOUR) {
      const data = JSON.parse(cached);
      window.dispatchEvent(new CustomEvent('reddit-data-ready', { detail: data }));
      return;
    }

    fetchRedditData(fixtures).then(data => {
      console.log('[Reddit] threads found:', data.threads.length, data.threads.map(t => t.title));
      console.log('[Reddit] playerComments keys:', Object.keys(data.playerComments));
      console.log('[Reddit] performers:', data.performers.map(p => p.name));
      console.log('[Reddit] fanVoice count:', data.fanVoiceComments.length);
      sessionStorage.setItem('reddit_data_v4', JSON.stringify(data));
      sessionStorage.setItem('reddit_data_v4_time', Date.now().toString());
      window.dispatchEvent(new CustomEvent('reddit-data-ready', { detail: data }));
    });
  }, []);

  return null;
}
