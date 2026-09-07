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

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-faint">{label}</div>
      <div className="tnum mt-0.5 text-xs text-fg">{children}</div>
    </div>
  );
}

/**
 * Rendu mobile, sous 768 px. Le tableau à huit colonnes ne se réduit pas : il
 * se transpose. Un prospect qui ouvre le lien depuis son téléphone doit lire,
 * pas faire défiler latéralement.
 */
export default function ServiceCard({
  service,
  now,
  selected,
  onSelect,
  onRun,
}: Props) {
  const s = service;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Details for ${s.name}`}
      onClick={() => onSelect(s.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(s.id);
        }
      }}
      className={`cursor-pointer rounded border p-3 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover ${
        selected
          ? 'border-line-strong bg-surface-hover'
          : 'border-line bg-surface'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-xs text-fg">{s.name}</div>
          <div className="text-2xs text-faint">
            {s.region} · {s.version}
          </div>
        </div>
        {s.pending ? (
          <OperationBadge pending={s.pending} now={now} className="w-32" />
        ) : (
          <StatusDot status={s.status} withLabel className="shrink-0" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Field label="Latency">{formatLatency(s.latency)}</Field>
        <Field label="Uptime">{formatUptime(s.uptime)}</Field>
        <Field label="Req/min">{formatRate(s.requestsPerMin)}</Field>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xs uppercase tracking-wide text-faint">CPU</div>
          <MetricBar value={s.cpu} showValue className="mt-0.5" />
        </div>
        <div>
          <div className="text-2xs uppercase tracking-wide text-faint">
            Memory
          </div>
          <MetricBar value={s.memory} showValue className="mt-0.5" />
        </div>
      </div>

      <ServiceActions service={s} onRun={onRun} fullWidth className="mt-3" />
    </div>
  );
}
