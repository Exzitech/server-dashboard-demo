import type { KeyboardEvent } from 'react';
import type { Service, ServiceAction } from '../types';
import StatusDot from './StatusDot';
import MetricBar from './MetricBar';
import ServiceActions from './ServiceActions';
import OperationBadge from './OperationBadge';
import { formatLatency, formatRate, formatUptime } from '../lib/format';

interface Props {
  service: Service;
  now: number;
  selected: boolean;
  onSelect: (serviceId: string) => void;
  onRun: (serviceId: string, action: ServiceAction) => void;
}

/** Rendu tableau, à partir de 768 px. La version mobile est `ServiceCard`. */
export default function ServiceRow({
  service,
  now,
  selected,
  onSelect,
  onRun,
}: Props) {
  const s = service;

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(s.id);
    }
  };

  return (
    <tr
      onClick={() => onSelect(s.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Details for ${s.name}`}
      aria-selected={selected}
      className={`cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-hover focus-visible:bg-surface-hover ${
        selected ? 'bg-surface-hover' : ''
      }`}
    >
      <td className="px-3 py-1.5">
        <div className="font-mono text-xs text-fg">{s.name}</div>
        <div className="text-2xs text-faint">
          {s.region} · {s.version}
        </div>
      </td>
      <td className="w-56 px-3 py-1.5">
        {s.pending ? (
          <OperationBadge pending={s.pending} now={now} />
        ) : (
          <StatusDot status={s.status} withLabel />
        )}
      </td>
      <td className="px-3 py-1.5 text-right">{formatUptime(s.uptime)}</td>
      <td className="px-3 py-1.5 text-right">{formatLatency(s.latency)}</td>
      <td className="px-3 py-1.5">
        <MetricBar value={s.cpu} showValue className="w-16" />
      </td>
      <td className="px-3 py-1.5">
        <MetricBar value={s.memory} showValue className="w-16" />
      </td>
      <td className="px-3 py-1.5 text-right">{formatRate(s.requestsPerMin)}</td>
      <td className="px-3 py-1.5">
        <ServiceActions service={s} onRun={onRun} className="justify-end" />
      </td>
    </tr>
  );
}
