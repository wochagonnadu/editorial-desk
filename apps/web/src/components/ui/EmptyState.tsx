// PATH: apps/web/src/components/ui/EmptyState.tsx
// WHAT: Пустое состояние с иконкой, сообщением и CTA
// WHY:  FR-005 — пустые состояния направляют к следующему действию
// RELEVANT: apps/web/src/styles/tokens.css, apps/web/src/pages/HomePage.tsx

import type { CSSProperties, ReactNode } from 'react';

interface EmptyStateProps {
  /** Иконка или иллюстрация (ReactNode — можно передать emoji или SVG) */
  icon?: ReactNode;
  /** Основной текст в editorial-тоне */
  message: string;
  /** Подтекст (опционально) */
  description?: string;
  /** Единственная CTA-кнопка */
  action?: { label: string; onClick: () => void };
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-8)',
  textAlign: 'center',
  color: 'var(--color-text-muted)',
};

const iconStyle: CSSProperties = {
  fontSize: 'var(--text-2xl)',
  marginBottom: 'var(--space-3)',
};

const msgStyle: CSSProperties = {
  fontSize: 'var(--text-base)',
  fontWeight: 500,
  color: 'var(--color-text)',
  marginBottom: 'var(--space-2)',
};

const descStyle: CSSProperties = {
  fontSize: 'var(--text-sm)',
  marginBottom: 'var(--space-4)',
};

const btnStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  color: '#fff',
  backgroundColor: 'var(--color-primary)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
};

export function EmptyState({ icon, message, description, action }: EmptyStateProps) {
  return (
    <div style={containerStyle}>
      {icon && <div style={iconStyle}>{icon}</div>}
      <p style={msgStyle}>{message}</p>
      {description && <p style={descStyle}>{description}</p>}
      {action && (
        <button style={btnStyle} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
