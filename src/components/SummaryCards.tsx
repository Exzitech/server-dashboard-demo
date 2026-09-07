import { useMemo, type ReactNode } from 'react';
import type { Service } from '../types';
import { formatLatency, formatRate } from '../lib/format';

interface CardProps {
  label: string;
  value: string;
  sub: ReactNode;
  /** Teinte de la valeur. Neutre par défaut : on ne colore que ce qui alerte. */
  tone?: 'neutral' | 'ok' | 'warn' | 'crit';
}

const TONE_CLASS: Record<NonNullable<CardProps['tone']>, string> = {
  neutral: 'text-fg',
  ok: 'text-ok',
  warn: 'text-warn',
  crit: 'text-crit',
};

function Card({ label, value, sub, tone = 'neutral' }: CardProps) {
  return (
    <div className="rounded border border-line bg-surface px-3 py-2.5">
      <div className="text-2xs font-medium uppercase tracking-wide text-faint">
        {label}
      </div>
      <div
        className={`tnum mt-1 text-2xl font-semibold leading-none ${TONE_CLASS[tone]}`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-2xs text-muted">{sub}</div>
    </div>
  );
}

interface Props {
  services: Service[];
}

export default function SummaryCards({ services }: Props) {
  const stats = useMemo(() => {
    const total = services.length;
    let operational = 0;
    let degraded = 0;
    let offline = 0;
    let requests = 0;
    let weightedLatency = 0;

    for (const s of services) {
      if (s.status === 'operational') operational++;
      else if (s.status === 'degraded') degraded++;
      else offline++;

      // Un service sans trafic ne doit pas peser sur la latence globale.
      if (s.status !== 'offline') {
        requests += s.requestsPerMin;
        weightedLatency += s.latency * s.requestsPerMin;
      }
    }

    return {
      total,
      operational,
      degraded,
      offline,
      requests,
      latency: requests > 0 ? weightedLatency / requests : 0,
    };
  }, [services]);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Services up"
        value={`${stats.operational}/${stats.total}`}
        sub="Health checks passing"
        tone={stats.operational === stats.total ? 'ok' : 'neutral'}
      />
      <Card
        label="Degraded"
        value={String(stats.degraded)}
        sub={stats.degraded > 0 ? 'Degradation detected' : 'No degradation'}
        tone={stats.degraded > 0 ? 'warn' : 'neutral'}
      />
      <Card
        label="Offline"
        value={String(stats.offline)}
        sub={stats.offline > 0 ? 'Not answering probes' : 'All reachable'}
        tone={stats.offline > 0 ? 'crit' : 'neutral'}
      />
      <Card
        label="p95 latency"
        value={formatLatency(stats.latency)}
        sub={`${formatRate(stats.requests)} req/min`}
      />
    </div>
  );
}
