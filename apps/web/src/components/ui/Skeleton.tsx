// PATH: apps/web/src/components/ui/Skeleton.tsx
// WHAT: Content-shaped skeleton placeholder for loading states
// WHY:  FR-006 запрещает спиннеры и пустые экраны; скелетоны = calm UX
// RELEVANT: apps/web/src/styles/tokens.css, apps/web/src/pages/HomePage.tsx

import type { CSSProperties, ReactNode } from 'react';

type Variant = 'text' | 'card' | 'list';

interface SkeletonProps {
  /** Форма скелетона */
  variant?: Variant;
  /** Ширина (CSS-значение). По умолчанию 100% */
  width?: string;
  /** Высота (CSS-значение). По умолчанию зависит от variant */
  height?: string;
  /** Количество строк (для variant="list") */
  rows?: number;
  children?: ReactNode;
}

const baseStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #eaecf0 25%, #f4f7fa 50%, #eaecf0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius-md)',
};

const heights: Record<Variant, string> = {
  text: '16px',
  card: '120px',
  list: '14px',
};

/** Shimmer-анимация инжектится один раз через <style> */
const shimmerCSS = `
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`;

let injected = false;
function injectShimmer() {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = shimmerCSS;
  document.head.appendChild(style);
  injected = true;
}

export function Skeleton({ variant = 'text', width = '100%', height, rows = 3 }: SkeletonProps) {
  injectShimmer();
  const h = height ?? heights[variant];

  if (variant === 'list') {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={{ ...baseStyle, width, height: h }} />
        ))}
      </div>
    );
  }

  return <div style={{ ...baseStyle, width, height: h }} />;
}
