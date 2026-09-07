import type {
  Incident,
  Service,
  ServiceBaseline,
  ServiceKind,
  ServiceStatus,
} from '../types';
import { generateHistory, type HistoryOptions } from './history';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface ServiceSeed {
  id: string;
  kind: ServiceKind;
  region: string;
  version: string;
  status: ServiceStatus;
  uptime: number;
  requestsPerMin: number;
  instances: number;
  instancesHealthy: number;
  /** Ancienneté du dernier déploiement, en ms. */
  deployedAgo: number;
  /** Le débit nominal est repris depuis `requestsPerMin`, pas redéclaré ici. */
  baseline: Omit<ServiceBaseline, 'requests'>;
  /** Le service se dégrade au début de son incident ouvert. */
  degrades?: boolean;
  /** Multiplicateur atteint en régime dégradé. */
  degradedFactor?: number;
  /** Le service tombe au début de son incident ouvert. */
  goesOffline?: boolean;
}

/**
 * Les statuts sont figés : un service qui clignoterait entre vert et rouge
 * ferait accident, pas démonstration. Ce qui bouge, ce sont les métriques.
 * Les deux services non nominaux correspondent aux incidents ouverts ci-dessous.
 */
const SERVICE_SEEDS: ServiceSeed[] = [
  {
    id: 'api-gateway',
    kind: 'api',
    region: 'eu-west-1',
    version: 'v2.14.3',
    status: 'degraded',
    uptime: 99.94,
    requestsPerMin: 18420,
    instances: 6,
    instancesHealthy: 5,
    deployedAgo: 5 * HOUR,
    baseline: { latency: 84, cpu: 47, memory: 61, jitter: 0.12 },
    degrades: true,
    degradedFactor: 2.4,
  },
  {
    id: 'auth-service',
    kind: 'api',
    region: 'eu-west-1',
    version: 'v1.9.0',
    status: 'operational',
    uptime: 99.99,
    requestsPerMin: 6240,
    instances: 4,
    instancesHealthy: 4,
    deployedAgo: 3 * DAY,
    baseline: { latency: 41, cpu: 28, memory: 44, jitter: 0.09 },
  },
  {
    id: 'worker-billing',
    kind: 'worker',
    region: 'eu-west-1',
    version: 'v3.2.1',
    status: 'operational',
    uptime: 99.97,
    requestsPerMin: 940,
    instances: 3,
    instancesHealthy: 3,
    deployedAgo: 26 * HOUR,
    baseline: { latency: 312, cpu: 58, memory: 52, jitter: 0.16 },
  },
  {
    id: 'worker-notifications',
    kind: 'worker',
    region: 'eu-central-1',
    version: 'v2.7.4',
    status: 'operational',
    uptime: 99.82,
    requestsPerMin: 2130,
    instances: 3,
    instancesHealthy: 3,
    deployedAgo: 11 * HOUR,
    baseline: { latency: 176, cpu: 39, memory: 48, jitter: 0.18 },
  },
  {
    id: 'db-primary',
    kind: 'database',
    region: 'eu-west-1',
    version: 'PostgreSQL 16.2',
    status: 'operational',
    uptime: 99.998,
    requestsPerMin: 41200,
    instances: 1,
    instancesHealthy: 1,
    deployedAgo: 17 * DAY,
    baseline: { latency: 12, cpu: 63, memory: 74, jitter: 0.07 },
  },
  {
    id: 'db-replica-02',
    kind: 'database',
    region: 'eu-central-1',
    version: 'PostgreSQL 16.2',
    status: 'offline',
    uptime: 98.71,
    requestsPerMin: 0,
    instances: 1,
    instancesHealthy: 0,
    deployedAgo: 17 * DAY,
    baseline: { latency: 14, cpu: 55, memory: 70, jitter: 0.07 },
    degrades: true,
    goesOffline: true,
  },
  {
    id: 'redis-cache',
    kind: 'cache',
    region: 'eu-west-1',
    version: 'v7.2.5',
    status: 'operational',
    uptime: 99.96,
    requestsPerMin: 88600,
    instances: 3,
    instancesHealthy: 3,
    deployedAgo: 6 * DAY,
    baseline: { latency: 3, cpu: 34, memory: 66, jitter: 0.11 },
  },
  {
    id: 'queue-events',
    kind: 'queue',
    region: 'eu-west-1',
    version: 'v3.13.2',
    status: 'operational',
    uptime: 99.99,
    requestsPerMin: 12750,
    instances: 3,
    instancesHealthy: 3,
    deployedAgo: 9 * DAY,
    baseline: { latency: 22, cpu: 31, memory: 57, jitter: 0.13 },
  },
  {
    id: 'object-storage',
    kind: 'storage',
    region: 'eu-west-1',
    version: 'v4.1.0',
    status: 'operational',
    uptime: 99.95,
    requestsPerMin: 5310,
    instances: 4,
    instancesHealthy: 4,
    deployedAgo: 2 * DAY,
    baseline: { latency: 128, cpu: 22, memory: 38, jitter: 0.14 },
  },
  {
    id: 'cdn-edge',
    kind: 'edge',
    region: 'global',
    version: 'v5.0.2',
    status: 'operational',
    uptime: 99.999,
    requestsPerMin: 214000,
    instances: 28,
    instancesHealthy: 28,
    deployedAgo: 4 * DAY,
    baseline: { latency: 19, cpu: 26, memory: 41, jitter: 0.1 },
  },
];

/** Décalages des incidents par rapport à `now`, en ms. */
const GATEWAY_INCIDENT_AGO = 3 * HOUR + 10 * MIN;
const REPLICA_INCIDENT_AGO = 38 * MIN;

export function createServices(now: number): Service[] {
  return SERVICE_SEEDS.map((seed) => {
    // L'historique doit raconter la même chose que le panneau d'incidents :
    // la dégradation démarre à l'ouverture de l'incident du service.
    const historyOptions: HistoryOptions = {};
    if (seed.degrades) {
      historyOptions.degradedSince = seed.goesOffline
        ? // Le réplica prend du retard avant de décrocher tout à fait.
          now - REPLICA_INCIDENT_AGO - 25 * MIN
        : now - GATEWAY_INCIDENT_AGO;
    }
    if (seed.degradedFactor !== undefined) {
      historyOptions.degradedFactor = seed.degradedFactor;
    }
    if (seed.goesOffline) {
      historyOptions.offlineSince = now - REPLICA_INCIDENT_AGO;
    }

    const baseline: ServiceBaseline = {
      ...seed.baseline,
      requests: seed.requestsPerMin,
    };
    const history = generateHistory(seed.id, baseline, now, historyOptions);
    const last = history[history.length - 1];

    return {
      id: seed.id,
      name: seed.id,
      kind: seed.kind,
      region: seed.region,
      version: seed.version,
      status: seed.status,
      uptime: seed.uptime,
      latency: last.latency,
      cpu: last.cpu,
      memory: last.memory,
      requestsPerMin: seed.requestsPerMin,
      errorRate: last.errorRate,
      instances: seed.instances,
      instancesHealthy: seed.instancesHealthy,
      lastDeploy: now - seed.deployedAgo,
      history,
      baseline,
      pending: null,
    };
  });
}

export function createIncidents(now: number): Incident[] {
  const replicaStart = now - REPLICA_INCIDENT_AGO;
  const gatewayStart = now - GATEWAY_INCIDENT_AGO;

  return [
    {
      id: 'INC-2418',
      title: 'Replication halted on db-replica-02',
      serviceId: 'db-replica-02',
      severity: 'critical',
      status: 'identified',
      startedAt: replicaStart,
      resolvedAt: null,
      updates: [
        {
          t: replicaStart,
          status: 'investigating',
          message:
            'Replica no longer answering health checks. Replication lag above 900s.',
        },
        {
          t: replicaStart + 9 * MIN,
          status: 'investigating',
          message:
            'Read traffic failed over to db-primary. No customer impact observed.',
        },
        {
          t: replicaStart + 21 * MIN,
          status: 'identified',
          message:
            'WAL volume full on the eu-central-1 node. Volume expansion under way.',
        },
      ],
    },
    {
      id: 'INC-2417',
      title: 'Elevated p95 latency on api-gateway',
      serviceId: 'api-gateway',
      severity: 'major',
      status: 'monitoring',
      startedAt: gatewayStart,
      resolvedAt: null,
      updates: [
        {
          t: gatewayStart,
          status: 'investigating',
          message:
            'p95 latency above the 150 ms threshold on /v2/orders routes.',
        },
        {
          t: gatewayStart + 34 * MIN,
          status: 'identified',
          message:
            'Connection pool exhaustion introduced by the v2.14.3 rollout.',
        },
        {
          t: gatewayStart + 52 * MIN,
          status: 'monitoring',
          message:
            'Pool size raised from 40 to 120. Latency trending down, one instance still degraded.',
        },
      ],
    },
    {
      id: 'INC-2415',
      title: 'Notification queue processing delay',
      serviceId: 'worker-notifications',
      severity: 'minor',
      status: 'resolved',
      startedAt: now - 9 * HOUR,
      resolvedAt: now - 8 * HOUR - 5 * MIN,
      updates: [
        {
          t: now - 9 * HOUR,
          status: 'investigating',
          message: 'Backlog of 42,000 pending messages on queue-events.',
        },
        {
          t: now - 8 * HOUR - 40 * MIN,
          status: 'identified',
          message: 'Rate limiting enforced by the third-party SMTP provider.',
        },
        {
          t: now - 8 * HOUR - 5 * MIN,
          status: 'resolved',
          message:
            'Backlog cleared after scaling to 3 workers. Nominal throughput restored.',
        },
      ],
    },
    {
      id: 'INC-2412',
      title: 'Abnormal memory eviction on redis-cache',
      serviceId: 'redis-cache',
      severity: 'major',
      status: 'resolved',
      startedAt: now - 19 * HOUR,
      resolvedAt: now - 18 * HOUR + 12 * MIN,
      updates: [
        {
          t: now - 19 * HOUR,
          status: 'investigating',
          message: 'Cache hit rate down to 61%. Rising load on db-primary.',
        },
        {
          t: now - 18 * HOUR - 25 * MIN,
          status: 'identified',
          message: 'Session keys written without a TTL by the auth service.',
        },
        {
          t: now - 18 * HOUR + 12 * MIN,
          status: 'resolved',
          message:
            'Fix shipped in v1.9.0, 24h TTL applied. Hit rate back to 97%.',
        },
      ],
    },
  ];
}
