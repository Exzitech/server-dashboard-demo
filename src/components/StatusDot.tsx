import type { ServiceStatus } from '../types';

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  offline: 'Offline',
};

const DOT_CLASS: Record<ServiceStatus, string> = {
  operational: 'bg-ok',
  degraded: 'bg-warn',
  offline: 'bg-crit',
};

const TEXT_CLASS: Record<ServiceStatus, string> = {
  operational: 'text-muted',
  degraded: 'text-warn',
  offline: 'text-crit',
};

interface Props {
  status: ServiceStatus;
  /** Affiche le libellé à côté de la pastille. */
  withLabel?: boolean;
  className?: string;
}

/**
 * Pastille de statut. Pas de pulsation : la couleur suffit, et une animation
 * sur dix lignes transformerait le tableau en sapin de Noël.
 */
export default function StatusDot({
  status,
  withLabel = false,
  className = '',
}: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`size-2 shrink-0 rounded-full ${DOT_CLASS[status]}`}
        role="img"
        aria-label={STATUS_LABEL[status]}
      />
      {withLabel && (
        <span className={`text-xs ${TEXT_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      )}
    </span>
  );
}
