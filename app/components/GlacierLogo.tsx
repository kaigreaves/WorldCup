import Image from 'next/image';

// Full wordmark — asset ratio 758 × 645
const RATIO = 758 / 645;

interface GlacierLogoProps {
  /** Logo height in px; width scales proportionally */
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlacierLogo({
  height = 56,
  className,
  style,
}: GlacierLogoProps) {
  const h = height;
  const w = Math.round(h * RATIO);

  return (
    <Image
      src="/glacier-logo-transparent.png"
      alt="Glacier"
      width={w}
      height={h}
      priority
      style={{
        height: h,
        width: 'auto',
        maxWidth: w,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
      className={className}
    />
  );
}
