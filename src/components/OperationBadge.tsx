import type { PendingOperation } from '../types';
import {
  ACTION_PENDING_LABEL,
  currentStep,
  progress,
} from '../data/actions';

interface Props {
  pending: PendingOperation;
  now: number;
  className?: string;
}

/**
 * Indicateur d'opération en cours : libellé, étape courante, avancement.
 * La barre n'est pas décorative — elle dit au testeur combien de temps
 * il lui reste à attendre.
 */
export default function OperationBadge({ pending, now, className = '' }: Props) {
  const pct = Math.round(progress(pending, now) * 100);

  return (
    <div className={`min-w-0 ${className}`} aria-live="polite">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-info">
          {ACTION_PENDING_LABEL[pending.action]}
        </span>
        <span className="truncate text-2xs text-muted">
          {currentStep(pending, now)}
        </span>
      </div>
      <div className="mt-1 h-0.5 w-full overflow-hidden rounded-sm bg-line-strong">
        <div
          className="h-full bg-info transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
