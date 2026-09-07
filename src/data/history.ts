import type { MetricPoint, ServiceBaseline } from '../types';

/** Pas entre deux points d'historique : 10 minutes simulées. */
export const POINT_INTERVAL_MS = 10 * 60 * 1000;

/** 24 h de fenêtre glissante. */
export const HISTORY_POINTS = 144;

/**
 * PRNG déterministe (mulberry32). L'historique doit être stable pendant la
 * session : on ne veut pas que les courbes se réécrivent à chaque rendu.
 */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash stable d'un id de service vers une graine. */
export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Courbe journalière : le trafic monte en journée et retombe la nuit.
 * Renvoie un facteur autour de 1 (creux ~0.72 vers 4 h, pic ~1.28 vers 16 h).
 */
export function diurnalFactor(t: number): number {
  const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
  return 1 + 0.28 * Math.sin(((hour - 10) / 24) * 2 * Math.PI);
}

export interface HistoryOptions {
  /**
   * Instant à partir duquel le service se dégrade. Les métriques dérivent
   * progressivement vers `degradedFactor` — une marche de latence nette est
   * moins crédible qu'une montée.
   */
  degradedSince?: number;
  /** Multiplicateur de latence / erreurs atteint en régime dégradé. */
  degradedFactor?: number;
  /** Le service tombe à cet instant : plus de trafic, métriques à zéro. */
  offlineSince?: number;
}

/**
 * Génère 24 h d'historique se terminant à `now`, aligné sur le pas de 10 min.
 * Marche aléatoire ancrée sur la baseline, modulée par la courbe journalière.
 */
export function generateHistory(
  id: string,
  baseline: ServiceBaseline,
  now: number,
  options: HistoryOptions = {},
): MetricPoint[] {
  const { degradedSince, degradedFactor = 2.6, offlineSince } = options;
  const rand = createRandom(seedFromId(id));
  const end = Math.floor(now / POINT_INTERVAL_MS) * POINT_INTERVAL_MS;
  const start = end - (HISTORY_POINTS - 1) * POINT_INTERVAL_MS;

  const points: MetricPoint[] = [];
  // Écarts courants à la baseline, en proportion. Ramenés vers 0 à chaque pas.
  let dLatency = 0;
  let dCpu = 0;
  let dMemory = 0;

  for (let i = 0; i < HISTORY_POINTS; i++) {
    const t = start + i * POINT_INTERVAL_MS;
    const j = baseline.jitter;

    // Retour à la moyenne : 82 % de l'écart précédent est conservé.
    dLatency = dLatency * 0.82 + (rand() - 0.5) * 2 * j;
    dCpu = dCpu * 0.82 + (rand() - 0.5) * 2 * j;
    dMemory = dMemory * 0.9 + (rand() - 0.5) * j;

    const day = diurnalFactor(t);

    // Montée progressive de la dégradation sur les 90 min qui suivent le début.
    let degrade = 1;
    if (degradedSince !== undefined && t >= degradedSince) {
      const ramp = Math.min(1, (t - degradedSince) / (90 * 60 * 1000));
      degrade = 1 + (degradedFactor - 1) * ramp;
    }

    if (offlineSince !== undefined && t >= offlineSince) {
      points.push({ t, latency: 0, cpu: 0, memory: 0, errorRate: 100 });
      continue;
    }

    const latency = baseline.latency * (1 + dLatency) * day * degrade;
    const cpu = baseline.cpu * (1 + dCpu) * day * Math.min(degrade, 1.6);
    const memory = baseline.memory * (1 + dMemory) * Math.min(degrade, 1.25);
    const errorRate = 0.04 * day * degrade * degrade * (0.5 + rand());

    points.push({
      t,
      latency: Math.max(1, Math.round(latency * 10) / 10),
      cpu: clampPct(cpu),
      memory: clampPct(memory),
      errorRate: Math.round(Math.min(errorRate, 100) * 100) / 100,
    });
  }

  return points;
}

function clampPct(v: number): number {
  return Math.round(Math.min(99, Math.max(1, v)) * 10) / 10;
}
