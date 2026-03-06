// PATH: apps/web/src/components/TeamPortrait.tsx
// WHAT: Renders team portraits with AVIF/WebP sources and JPG fallback
// WHY:  Reduces landing image weight while keeping broad browser support
// RELEVANT: apps/web/src/components/TeamCarousel.tsx,apps/web/src/components/HeroInteractive.tsx,apps/web/src/lib/teamPortraits.ts

type TeamPortraitSource = {
  avif: string;
  webp: string;
  jpg: string;
};

type TeamPortraitProps = {
  source: TeamPortraitSource;
  alt: string;
  className: string;
};

export function TeamPortrait({ source, alt, className }: TeamPortraitProps) {
  return (
    <picture>
      <source srcSet={source.avif} type="image/avif" />
      <source srcSet={source.webp} type="image/webp" />
      <img src={source.jpg} alt={alt} className={className} loading="lazy" decoding="async" />
    </picture>
  );
}
