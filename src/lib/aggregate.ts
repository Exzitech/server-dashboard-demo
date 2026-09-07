import type { Service } from '../types';

export interface OverviewPoint {
  t: number;
  /** Latence p95 pondérée par le trafic nominal, en ms. */
  latency: number;
  /** Usage CPU moyen des services en ligne, en %. */
  cpu: number;
  /** Usage mémoire moyen des services en ligne, en %. */
  memory: number;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Réduit les 10 historiques en une seule série de 144 points.
 *
 * Les historiques partagent la même grille de timestamps : ils sont générés
 * puis décalés ensemble, on peut donc les parcourir par index.
 *
 * La latence est pondérée par le trafic, comme la carte de synthèse — une
 * moyenne simple laisserait `worker-billing` et ses 940 req/min peser autant
 * que `cdn-edge` et ses 214 000.
 */
export function buildOverviewSeries(services: Service[]): OverviewPoint[] {
  const reference = services[0];
  if (!reference) return [];

  const points: OverviewPoint[] = [];

  for (let i = 0; i < reference.history.length; i++) {
    let weight = 0;
    let weightedLatency = 0;
    let cpu = 0;
    let memory = 0;
    let online = 0;

    for (const service of services) {
      const point = service.history[i];
      if (!point) continue;

      // Un service hors ligne ne pèse ni sur la latence ni sur la charge :
      // ses zéros tireraient les moyennes vers le bas sans rien signifier.
      if (point.latency > 0) {
        const w = service.baseline.requests;
        weight += w;
        weightedLatency += point.latency * w;
      }
      if (point.cpu > 0) {
        cpu += point.cpu;
        memory += point.memory;
        online += 1;
      }
    }

    points.push({
      t: reference.history[i].t,
      latency: weight > 0 ? round1(weightedLatency / weight) : 0,
      cpu: online > 0 ? round1(cpu / online) : 0,
      memory: online > 0 ? round1(memory / online) : 0,
    });
  }

  return points;
}
