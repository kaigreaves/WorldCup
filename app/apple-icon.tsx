import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: '#00112B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {/* Glacier mountain mark */}
      <svg width="96" height="72" viewBox="0 0 96 72" fill="none">
        {/* Outer peaks */}
        <polygon points="48,4 88,68 8,68" fill="none" stroke="#29B6F6" strokeWidth="3.5" strokeLinejoin="round"/>
        {/* Inner fill — icy core */}
        <polygon points="48,18 72,68 24,68" fill="#29B6F6" opacity="0.22"/>
        {/* Peak detail lines */}
        <line x1="28" y1="50" x2="48" y2="18" stroke="#29B6F6" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="68" y1="50" x2="48" y2="18" stroke="#29B6F6" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Secondary peak left */}
        <polyline points="8,68 22,40 36,52" stroke="#29B6F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.6"/>
        {/* Secondary peak right */}
        <polyline points="88,68 74,40 60,52" stroke="#29B6F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.6"/>
      </svg>
      {/* Wordmark */}
      <span style={{
        fontFamily: '-apple-system, Helvetica Neue, Arial',
        fontSize: 22,
        fontWeight: 300,
        letterSpacing: '0.18em',
        color: '#29B6F6',
        textTransform: 'uppercase',
        marginTop: 2,
      }}>GLACIER</span>
    </div>,
    { ...size }
  );
}
