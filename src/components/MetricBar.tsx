import { formatPercent } from '../lib/format';

interface Props {
  /** Usage en %, 0–100. 0 signifie « pas de mesure » (service hors ligne). */
  value: number;
  /** Seuil d'alerte. */
  warn?: number;
  /** Seuil critique. */
  crit?: number;
  /** Affiche la valeur chiffrée au-dessus de la barre. */
  showValue?: boolean;
  className?: string;
}

/**
 * Barre d'usage CPU / mémoire. La couleur ne sert qu'à signaler un seuil
 * franchi : en dessous, la barre reste neutre, sinon dix lignes vertes
 * dilueraient les deux qui comptent.
 */
export default function MetricBar({
  value,
  warn = 75,
  crit = 90,
  showValue = false,
  className = '',
}: Props) {
  const offline = value <= 0;
  const fill = offline
    ? 'bg-transparent'
    : value >= crit
      ? 'bg-crit'
      : value >= warn
        ? 'bg-warn'
        : 'bg-info/60';

  return (
    <div className={className}>
      {showValue && (
        <div className="tnum mb-1 text-xs text-fg">
          {offline ? '—' : formatPercent(value)}
        </div>
      )}
      <div
        className="h-1 w-full overflow-hidden rounded-sm bg-line-strong"
        role="meter"
        aria-valuenow={offline ? undefined : Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${fill}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
