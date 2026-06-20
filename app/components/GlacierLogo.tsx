import Image from 'next/image';

type LogoVariant = 'header' | 'splash' | 'footer';

// Asset ratio: 1290 × 1083 (padded) = 1.191
const RATIO = 1290 / 1083;

const VARIANTS: Record<LogoVariant, { height: number }> = {
  header:  { height: 52  },
  splash:  { height: 140 },
  footer:  { height: 28  },
};

interface GlacierLogoProps {
  variant?: LogoVariant;
  /** Override height; width scales proportionally (2:1 ratio) */
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlacierLogo({
  variant = 'header',
  height,
  className,
  style,
}: GlacierLogoProps) {
  const base = VARIANTS[variant];
  const h = height ?? base.height;
  const w = Math.round(h * RATIO);

  return (
    <Image
      src="/glacier-logo-transparent.png"
      alt="Glacier"
      width={w}
      height={h}
      priority={variant === 'header' || variant === 'splash'}
      style={{
        height: h,
        width: 'auto',
        maxWidth: w,
        objectFit: 'contain',
        objectPosition: 'center center',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
      className={className}
    />
  );
}
