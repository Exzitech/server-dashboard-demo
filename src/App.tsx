import { lazy, Suspense, useMemo, useState } from 'react';
import { useLiveMetrics } from './hooks/useLiveMetrics';
import SummaryCards from './components/SummaryCards';
import ServiceTable from './components/ServiceTable';
import { buildOverviewSeries } from './lib/aggregate';
import { formatAgo, formatClock } from './lib/format';

// Recharts et d3 pèsent 45 ko compressés : le tableau et les chiffres
// s'affichent sans les attendre, les courbes arrivent juste après.
const LatencyChart = lazy(() => import('./components/LatencyChart'));
const LoadChart = lazy(() => import('./components/LoadChart'));

/** Réserve la hauteur exacte des graphiques : aucun décalage à leur arrivée. */
function ChartSkeleton() {
  return <div className="h-[249px] rounded border border-line bg-surface" />;
}

export default function App() {
  const { services, incidents, now, runAction, reset } = useLiveMetrics();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const overview = useMemo(() => buildOverviewSeries(services), [services]);

  return (
    <div className="min-h-screen bg-base text-fg">
      <div className="mx-auto max-w-[2000px] px-3 py-4 sm:px-6">
        {/* <Header /> */}
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
          <h1 className="text-sm font-semibold tracking-tight">ServerWatch</h1>
          <div className="flex items-center gap-3">
            <span className="tnum text-2xs text-muted">
              updated {formatClock(now)}
            </span>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-line-strong px-2 py-1 text-2xs text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            >
              Reset
            </button>
          </div>
        </header>

        <SummaryCards services={services} />

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <ServiceTable
              services={services}
              now={now}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRun={runAction}
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <Suspense
                fallback={
                  <>
                    <ChartSkeleton />
                    <ChartSkeleton />
                  </>
                }
              >
                <LatencyChart data={overview} />
                <LoadChart data={overview} />
              </Suspense>
            </div>
          </div>

          {/* <IncidentPanel /> — provisoire */}
          <aside className="rounded border border-line bg-surface p-3">
            <h2 className="text-2xs font-medium uppercase tracking-wide text-faint">
              Recent incidents
            </h2>
            <ul className="mt-2 space-y-2 text-xs">
              {incidents.map((i) => (
                <li
                  key={i.id}
                  className="border-b border-line pb-2 last:border-0"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-2xs text-muted">
                      {i.id}
                    </span>
                    <span className="text-2xs text-muted">{i.status}</span>
                  </div>
                  <p className="mt-0.5 leading-snug">{i.title}</p>
                  <p className="mt-0.5 text-2xs text-faint">
                    {formatAgo(i.startedAt, now)}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* <ServiceDetail /> — le clic sur une ligne alimente déjà `selectedId` */}

        <footer className="mt-6 border-t border-line pt-3 text-2xs text-faint">
          Demonstration — simulated data.
        </footer>
      </div>
    </div>
  );
}
