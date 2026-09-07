import { formatHour } from '../lib/format';

interface Entry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface Props {
  active?: boolean;
  payload?: Entry[];
  label?: number | string;
  /** Mise en forme de la valeur, propre à chaque graphique. */
  format: (v: number) => string;
}

/**
 * Infobulle des graphiques. Celle de Recharts est blanche par défaut et
 * trouerait le thème sombre.
 */
export default function ChartTooltip({ active, payload, label, format }: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded border border-line-strong bg-base px-2 py-1.5 shadow-lg">
      <div className="tnum text-2xs text-faint">
        {typeof label === 'number' ? formatHour(label) : label}
      </div>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey)}
            className="flex items-center gap-2 text-2xs"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="tnum ml-auto text-fg">
              {typeof entry.value === 'number' ? format(entry.value) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
