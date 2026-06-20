import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: '#00112B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
      }}
    >
      {/* Glacier mountain mark — geometric abstraction of the brand mark */}
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <polygon points="11,2 20,18 2,18" fill="none" stroke="#29B6F6" strokeWidth="1.6" strokeLinejoin="round"/>
        <polygon points="11,7 16,18 6,18" fill="#29B6F6" opacity="0.35"/>
        <line x1="7" y1="13" x2="11" y2="7" stroke="#29B6F6" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="15" y1="13" x2="11" y2="7" stroke="#29B6F6" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>,
    { ...size }
  );
}
