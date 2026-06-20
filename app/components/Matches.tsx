'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { ApiFixture } from '../lib/api';
import { MatchFanComments } from './RedditShell';

function LiveRefresher({ hasLive }: { hasLive: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasLive) return;
    // Only poll while the tab is visible; refresh once on return so a
    // backgrounded tab never silently hammers the server.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hasLive, router]);
  return null;
}

function formatDate(utcDate: string) {
  const d = new Date(utcDate);
  return {
    date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
  };
}

function TeamBadge({ team, dim, align = 'left' }: { team: ApiFixture['teams']['home']; dim?: boolean; align?: 'left' | 'right' }) {
  const isRight = align === 'right';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0,
      opacity: dim ? 0.4 : 1,
      flexDirection: isRight ? 'row-reverse' : 'row',
      justifyContent: isRight ? 'flex-end' : 'flex-start',
    }}>
      {team.logo && <Image src={team.logo} alt={team.name} width={26} height={26} style={{ objectFit: 'contain', flexShrink: 0 }} />}
      <span style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '0.95rem', fontWeight: 500,
        color: 'var(--white)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: isRight ? 'right' : 'left',
      }}>
        {team.name}
      </span>
    </div>
  );
}

function LiveCard({ fix }: { fix: ApiFixture }) {
  const home = fix.goals.home ?? 0;
  const away = fix.goals.away ?? 0;
  const elapsed = fix.fixture.status.elapsed;
  const statusLabel = fix.fixture.status.short === 'HT' ? 'Half Time' : elapsed ? `${elapsed}'` : fix.fixture.status.short;
  return (
    <div className="card card-live" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="label" style={{ marginBottom: '4px' }}>{fix.league.round}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 600, letterSpacing: '0.1em' }}>{statusLabel}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TeamBadge team={fix.teams.home} />
        <div style={{ textAlign: 'center', minWidth: '66px', flexShrink: 0 }}>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {home}<span style={{ color: 'var(--red)', opacity: 0.5, margin: '0 3px', fontWeight: 300 }}>–</span>{away}
          </div>
        </div>
        <TeamBadge team={fix.teams.away} align="right" />
      </div>
      <MatchFanComments
        homeTeam={fix.teams.home.name}
        awayTeam={fix.teams.away.name}
        label="Fan reaction"
        isFinished={false}
      />
    </div>
  );
}

function UpcomingCard({ fix }: { fix: ApiFixture }) {
  const { date, time } = formatDate(fix.fixture.date);
  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="label" style={{ marginBottom: '4px' }}>{fix.league.round}</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{date} · {time}</p>
        </div>
        {fix.fixture.venue && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', maxWidth: '140px', lineHeight: 1.4 }}>
            {fix.fixture.venue.city}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TeamBadge team={fix.teams.home} />
        <span style={{ color: 'var(--muted)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '13px', flexShrink: 0, letterSpacing: '0.06em' }}>vs</span>
        <TeamBadge team={fix.teams.away} align="right" />
      </div>
      <MatchFanComments
        homeTeam={fix.teams.home.name}
        awayTeam={fix.teams.away.name}
        label="What fans are saying"
        isFinished={false}
      />
    </div>
  );
}

function FinishedCard({ fix, teamRanks = {} }: { fix: ApiFixture; teamRanks?: Record<string, number> }) {
  const { date } = formatDate(fix.fixture.date);
  const home = fix.goals.home ?? 0;
  const away = fix.goals.away ?? 0;

  // Upset: the team that won has a worse group rank than the team that lost
  const homeRank = teamRanks[fix.teams.home.name.toLowerCase()] ?? 0;
  const awayRank = teamRanks[fix.teams.away.name.toLowerCase()] ?? 0;
  const homeWon = fix.teams.home.winner === true;
  const awayWon = fix.teams.away.winner === true;
  const isUpset = homeRank > 0 && awayRank > 0 && (
    (homeWon && homeRank > awayRank) || (awayWon && awayRank > homeRank)
  );

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p className="label" style={{ marginBottom: '4px' }}>{fix.league.round}</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{date}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingTop: '2px' }}>
          {isUpset && (
            <span style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--red)', textTransform: 'uppercase', border: '0.5px solid rgba(237,41,57,0.35)', padding: '2px 8px', borderRadius: '999px', background: 'rgba(237,41,57,0.07)' }}>
              Upset
            </span>
          )}
          <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', border: '0.5px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
            {fix.fixture.status.short}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <TeamBadge team={fix.teams.home} dim={fix.teams.away.winner === true} />
        <div style={{ textAlign: 'center', minWidth: '66px', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '2rem', fontWeight: 700,
            lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ color: fix.teams.away.winner ? 'rgba(255,255,255,0.28)' : 'var(--white)' }}>{home}</span>
            <span style={{ color: 'var(--gold)', opacity: 0.4, margin: '0 3px', fontWeight: 300 }}>–</span>
            <span style={{ color: fix.teams.home.winner ? 'rgba(255,255,255,0.28)' : 'var(--white)' }}>{away}</span>
          </div>
        </div>
        <TeamBadge team={fix.teams.away} dim={fix.teams.home.winner === true} align="right" />
      </div>
      <MatchFanComments
        homeTeam={fix.teams.home.name}
        awayTeam={fix.teams.away.name}
        label="Fan reaction"
        isFinished={true}
      />
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface Props {
  upcoming: ApiFixture[];
  finished: ApiFixture[];
  live: ApiFixture[];
  teamRanks?: Record<string, number>;
}

export default function Matches({ upcoming, finished, live, teamRanks = {} }: Props) {
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' };
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  const todayFinished = finished.filter(f => isSameDay(new Date(f.fixture.date), now));
  const yesterdayFinished = finished.filter(f => isSameDay(new Date(f.fixture.date), yesterday));
  const olderFinished = finished.filter(f => {
    const d = new Date(f.fixture.date);
    return !isSameDay(d, now) && !isSameDay(d, yesterday);
  });

  const groups = [
    { label: 'Live now', color: 'var(--red)', items: live, type: 'live' as const },
    { label: "Today's results", color: 'var(--gold)', items: todayFinished, type: 'finished' as const },
    { label: 'Up next', color: 'var(--gold)', items: upcoming, type: 'upcoming' as const },
    { label: 'Yesterday', color: 'var(--muted)', items: yesterdayFinished, type: 'finished' as const },
    { label: 'Earlier results', color: 'var(--muted)', items: olderFinished, type: 'finished' as const },
  ].filter(g => g.items.length > 0);

  const hasLive = live.length > 0;

  if (groups.length === 0) {
    return (
      <section>
        <div className="mb-8">
          <p className="label mb-3">The Stage</p>
          <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--white)', margin: 0 }}>Matches</h2>
          <div className="gold-line mt-4" />
        </div>
        <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Match data will appear as the tournament gets underway.</p>
      </section>
    );
  }

  return (
    <section>
      <LiveRefresher hasLive={hasLive} />
      <div className="mb-8">
        <p className="label mb-3">The Stage</p>
        <h2 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--white)', margin: 0 }}>Matches</h2>
        <div className="gold-line mt-4" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {groups.map(g => (
          <div key={g.label}>
            <p className="section-eyebrow" style={{ color: g.color, marginBottom: '20px' }}>{g.label}</p>
            <div style={grid}>
              {g.items.map(f =>
                g.type === 'live' ? <LiveCard key={f.fixture.id} fix={f} /> :
                g.type === 'upcoming' ? <UpcomingCard key={f.fixture.id} fix={f} /> :
                <FinishedCard key={f.fixture.id} fix={f} teamRanks={teamRanks} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
