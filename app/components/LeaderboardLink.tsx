'use client';

export default function LeaderboardLink({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  function go() {
    const target = window.innerWidth >= 900
      ? document.getElementById('leaderboard')
      : document.getElementById('mobile-rankings');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return (
    <button onClick={go} className="leaderboard-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...style }}>
      {children}
    </button>
  );
}
