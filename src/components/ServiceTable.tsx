import { useMemo, useState } from 'react';
import type { Service, ServiceAction, ServiceStatus } from '../types';
import ServiceRow from './ServiceRow';
import ServiceCard from './ServiceCard';
import { IconCaret } from './Icons';

type SortKey =
  | 'name'
  | 'status'
  | 'uptime'
  | 'latency'
  | 'cpu'
  | 'memory'
  | 'requests';

type Direction = 'asc' | 'desc';

interface Column {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
  /** Sens appliqué au premier clic : les métriques se lisent du pire au mieux. */
  initial: Direction;
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Service', align: 'left', initial: 'asc' },
  { key: 'status', label: 'Status', align: 'left', initial: 'asc' },
  { key: 'uptime', label: 'Uptime', align: 'right', initial: 'asc' },
  { key: 'latency', label: 'Latency', align: 'right', initial: 'desc' },
  { key: 'cpu', label: 'CPU', align: 'left', initial: 'desc' },
  { key: 'memory', label: 'Mem.', align: 'left', initial: 'desc' },
  { key: 'requests', label: 'Req/min', align: 'right', initial: 'desc' },
];

/** Ce qui va mal remonte en tête. */
const STATUS_ORDER: Record<ServiceStatus, number> = {
  offline: 0,
  degraded: 1,
  operational: 2,
};

function compare(a: Service, b: Service, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'status':
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case 'uptime':
      return a.uptime - b.uptime;
    case 'latency':
      return a.latency - b.latency;
    case 'cpu':
      return a.cpu - b.cpu;
    case 'memory':
      return a.memory - b.memory;
    case 'requests':
      return a.requestsPerMin - b.requestsPerMin;
  }
}

interface Props {
  services: Service[];
  now: number;
  selectedId: string | null;
  onSelect: (serviceId: string) => void;
  onRun: (serviceId: string, action: ServiceAction) => void;
}

export default function ServiceTable({
  services,
  now,
  selectedId,
  onSelect,
  onRun,
}: Props) {
  // Tri par défaut sur le statut : à l'ouverture, les deux services en cause
  // sont les deux premières lignes. C'est ce qu'un prospect doit voir d'abord.
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [direction, setDirection] = useState<Direction>('asc');

  const sorted = useMemo(() => {
    const factor = direction === 'asc' ? 1 : -1;
    return [...services].sort((a, b) => {
      const primary = compare(a, b, sortKey) * factor;
      // Départage stable : sans ça, deux services à égalité changeraient de
      // place à chaque tick.
      return primary !== 0 ? primary : a.name.localeCompare(b.name);
    });
  }, [services, sortKey, direction]);

  const toggleSort = (column: Column) => {
    if (column.key === sortKey) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setDirection(column.initial);
    }
  };

  return (
    <section>
      {/* Contrôle de tri mobile : les en-têtes de colonnes n'existent pas ici. */}
      <div className="mb-2 flex items-center gap-2 md:hidden">
        <label
          htmlFor="sort-services"
          className="text-2xs uppercase tracking-wide text-faint"
        >
          Sort by
        </label>
        <select
          id="sort-services"
          value={sortKey}
          onChange={(e) => {
            const column = COLUMNS.find((c) => c.key === e.target.value);
            if (!column) return;
            setSortKey(column.key);
            setDirection(column.initial);
          }}
          className="rounded border border-line-strong bg-surface px-2 py-1 text-2xs text-fg"
        >
          {COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="inline-flex items-center gap-1 rounded border border-line-strong px-2 py-1 text-2xs text-muted transition-colors hover:text-fg"
          aria-label={direction === 'asc' ? 'Ascending' : 'Descending'}
        >
          <IconCaret className={direction === 'asc' ? 'rotate-180' : ''} />
          {direction === 'asc' ? 'Asc' : 'Desc'}
        </button>
      </div>

      {/* Sous 768 px : une carte par service, aucun défilement latéral. */}
      <div className="space-y-2 md:hidden">
        {sorted.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            now={now}
            selected={s.id === selectedId}
            onSelect={onSelect}
            onRun={onRun}
          />
        ))}
      </div>

      {/* À partir de 768 px : le tableau dense. */}
      <div className="hidden overflow-x-auto rounded border border-line bg-surface md:block">
        <table className="w-full min-w-[880px] text-xs">
          <thead>
            <tr className="border-b border-line">
              {COLUMNS.map((c) => {
                const active = c.key === sortKey;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active
                        ? direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={`px-3 py-2 font-medium ${
                      c.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c)}
                      className={`inline-flex items-center gap-1 text-2xs uppercase tracking-wide transition-colors hover:text-fg ${
                        active ? 'text-fg' : 'text-faint'
                      } ${c.align === 'right' ? 'flex-row-reverse' : ''}`}
                    >
                      {c.label}
                      <IconCaret
                        className={`transition-transform ${
                          active
                            ? direction === 'asc'
                              ? 'rotate-180'
                              : ''
                            : 'invisible'
                        }`}
                      />
                    </button>
                  </th>
                );
              })}
              <th
                scope="col"
                className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-faint"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="tnum">
            {sorted.map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                now={now}
                selected={s.id === selectedId}
                onSelect={onSelect}
                onRun={onRun}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
