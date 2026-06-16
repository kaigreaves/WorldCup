'use client';

export default function HeroCTA() {
  return (
    <a
      href="#performers"
      onClick={e => {
        e.preventDefault();
        document.getElementById('performers')?.scrollIntoView({ behavior: 'smooth' });
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--gold)', textDecoration: 'none',
        borderBottom: '1px solid rgba(201,168,76,0.4)', paddingBottom: '2px',
      }}
    >
      See who&apos;s delivering →
    </a>
  );
}
