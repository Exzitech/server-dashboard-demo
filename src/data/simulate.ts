import type { MetricPoint, Service, ServiceStatus } from '../types';
import { diurnalFactor, HISTORY_POINTS, POINT_INTERVAL_MS } from './history';

/**
 * Pénalité appliquée à la cible selon le statut. Les statuts eux-mêmes ne
 * changent jamais : ce qui vit, ce sont les métriques.
 */
const STATUS_FACTOR: Record<ServiceStatus, number> = {
  operational: 1,
  degraded: 2.3,
  offline: 0,
};

/** Vitesse de convergence vers la cible à chaque tick. */
const PULL = 0.18;

/** Amplitude du bruit ajouté à chaque tick, relative à la baseline. */
const NOISE = 0.5;

function approach(
  current: number,
  target: number,
  jitter: number,
  rand: number,
): number {
  const noise = (rand - 0.5) * 2 * jitter * NOISE * target;
  return current + (target - current) * PULL + noise;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function clampPct(v: number): number {
  return round1(Math.min(99, Math.max(1, v)));
}

/**
 * Fait avancer un service d'un tick.
 *
 * `advanceHistory` pousse un nouveau point et retire le plus ancien. Le hook
 * l'active tous les 5 ticks : la fenêtre de 24 h glisse visiblement pendant la
 * démonstration au lieu d'attendre 10 minutes réelles par point.
 */
export function tickService(
  service: Service,
  now: number,
  advanceHistory: boolean,
): Service {
  const { baseline, status } = service;
  const factor = STATUS_FACTOR[status];

  if (factor === 0) {
    // Service hors ligne : rien ne circule, mais l'historique continue de
    // glisser pour que la coupure s'éloigne dans le temps.
    const point: MetricPoint = {
      t: now,
      latency: 0,
      cpu: 0,
      memory: 0,
      errorRate: 100,
    };
    return { ...service, history: nextHistory(service, point, advanceHistory) };
  }

  const day = diurnalFactor(now);
  const j = baseline.jitter;

  const latency = Math.max(
    1,
    round1(
      approach(
        service.latency,
        baseline.latency * day * factor,
        j,
        Math.random(),
      ),
    ),
  );
  const cpu = clampPct(
    approach(
      service.cpu,
      baseline.cpu * day * Math.min(factor, 1.6),
      j,
      Math.random(),
    ),
  );
  const memory = clampPct(
    approach(
      service.memory,
      baseline.memory * Math.min(factor, 1.25),
      j * 0.4,
      Math.random(),
    ),
  );

  const errorRate =
    Math.round(
      Math.min(100, 0.04 * day * factor * factor * (0.5 + Math.random())) * 100,
    ) / 100;

  // Le débit suit la même courbe journalière que la charge, ancré sur le
  // nominal : sans ancre, la marche aléatoire dériverait sur la durée.
  const requestsPerMin = Math.max(
    0,
    Math.round(
      approach(
        service.requestsPerMin,
        baseline.requests * day,
        j * 0.3,
        Math.random(),
      ),
    ),
  );

  const point: MetricPoint = { t: now, latency, cpu, memory, errorRate };

  return {
    ...service,
    latency,
    cpu,
    memory,
    errorRate,
    requestsPerMin,
    history: nextHistory(service, point, advanceHistory),
  };
}

/**
 * Le dernier point d'historique est réécrit à chaque tick ; il n'est figé et
 * remplacé par un nouveau que lorsque la fenêtre glisse.
 */
function nextHistory(
  service: Service,
  point: MetricPoint,
  advance: boolean,
): MetricPoint[] {
  const history = service.history;
  const last = history[history.length - 1];

  if (!advance) {
    // On garde le timestamp d'origine : l'axe des abscisses reste régulier.
    const merged = { ...point, t: last.t };
    return [...history.slice(0, -1), merged];
  }

  const next = { ...point, t: last.t + POINT_INTERVAL_MS };
  return [...history.slice(-(HISTORY_POINTS - 1)), next];
}

export function tickServices(
  services: Service[],
  now: number,
  advanceHistory: boolean,
): Service[] {
  return services.map((s) => tickService(s, now, advanceHistory));
}
