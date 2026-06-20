import Image from 'next/image';

// Mountain icon mark — asset ratio 729 × 392
const RATIO = 729 / 392;

interface GlacierLogoProps {
  /** Icon height in px; width scales proportionally */
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlacierLogo({
  height = 34,
  className,
  style,
}: GlacierLogoProps) {
  const h = height;
  const w = Math.round(h * RATIO);

  return (
    <Image
      src="/glacier-icon.png"
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
