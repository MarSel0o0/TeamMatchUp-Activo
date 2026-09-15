import type { ReactNode } from 'react';

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="empty-state" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '🎮', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="stack-sm">
        <strong>{title}</strong>
        {description ? <span className="faint">{description}</span> : null}
      </div>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        ⚠️
      </span>
      <div className="stack-sm">
        <strong>No se pudo cargar la información</strong>
        <span className="faint">{message}</span>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonList({ rows = 3, height = 72 }: { rows?: number; height?: number }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}
