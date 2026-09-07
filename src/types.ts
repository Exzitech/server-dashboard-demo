export type ServiceStatus = 'operational' | 'degraded' | 'offline';

export type ServiceKind =
  | 'api'
  | 'worker'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'edge';

/** Un échantillon d'historique. Pas de 10 min simulées, 144 points sur 24 h. */
export interface MetricPoint {
  /** Timestamp en ms. */
  t: number;
  /** Latence p95, en ms. */
  latency: number;
  /** Usage CPU, 0–100. */
  cpu: number;
  /** Usage mémoire, 0–100. */
  memory: number;
  /** Taux d'erreur, en %. */
  errorRate: number;
}

/** Cible de la marche aléatoire. Non affichée. */
export interface ServiceBaseline {
  latency: number;
  cpu: number;
  memory: number;
  /** Débit nominal, requêtes/min. Repris de la valeur de départ du service. */
  requests: number;
  /** Amplitude du bruit, relative à la baseline (0–1). */
  jitter: number;
}

export type ServiceAction = 'deploy' | 'stop' | 'start';

/**
 * Opération déclenchée depuis la console et encore en cours. Les actions ne
 * sont pas instantanées : c'est l'attente qui rend la manipulation crédible.
 */
export interface PendingOperation {
  action: ServiceAction;
  startedAt: number;
  endsAt: number;
  /** Étapes traversées, affichées l'une après l'autre pendant l'opération. */
  steps: string[];
}

export interface Service {
  id: string;
  name: string;
  kind: ServiceKind;
  region: string;
  version: string;
  status: ServiceStatus;
  /** Disponibilité sur 30 jours, en %. */
  uptime: number;
  /** Latence p95 courante, en ms. */
  latency: number;
  cpu: number;
  memory: number;
  requestsPerMin: number;
  errorRate: number;
  instances: number;
  instancesHealthy: number;
  lastDeploy: number;
  history: MetricPoint[];
  baseline: ServiceBaseline;
  /** Opération en cours, ou `null` si le service est au repos. */
  pending: PendingOperation | null;
}

export type IncidentSeverity = 'critical' | 'major' | 'minor';

export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved';

export interface IncidentUpdate {
  t: number;
  status: IncidentStatus;
  message: string;
}

export interface Incident {
  id: string;
  title: string;
  serviceId: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: number;
  resolvedAt: number | null;
  updates: IncidentUpdate[];
}
