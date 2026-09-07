import type {
  Incident,
  PendingOperation,
  Service,
  ServiceAction,
} from '../types';

export const ACTION_LABEL: Record<ServiceAction, string> = {
  deploy: 'Redeploy',
  stop: 'Stop',
  start: 'Start',
};

/** Libellé porté par le badge tant que l'opération n'est pas terminée. */
export const ACTION_PENDING_LABEL: Record<ServiceAction, string> = {
  deploy: 'Deploying',
  stop: 'Stopping',
  start: 'Starting',
};

/**
 * Durées choisies pour être visibles sans être pénibles : assez longues pour
 * qu'on lise les étapes défiler, assez courtes pour qu'on réessaie.
 */
export const ACTION_DURATION: Record<ServiceAction, number> = {
  deploy: 9000,
  stop: 4000,
  start: 7000,
};

const ACTION_STEPS: Record<ServiceAction, string[]> = {
  deploy: ['Building image', 'Rolling out', 'Verifying health checks'],
  stop: ['Draining connections', 'Terminating instances'],
  start: ['Starting instances', 'Health checks', 'Rejoining load balancer'],
};

/** Une action n'est proposée que si elle a un sens dans l'état courant. */
export function canRun(service: Service, action: ServiceAction): boolean {
  if (service.pending) return false;
  switch (action) {
    case 'start':
      return service.status === 'offline';
    case 'stop':
    case 'deploy':
      return service.status !== 'offline';
  }
}

export function beginAction(
  service: Service,
  action: ServiceAction,
  now: number,
): Service {
  const pending: PendingOperation = {
    action,
    startedAt: now,
    endsAt: now + ACTION_DURATION[action],
    steps: ACTION_STEPS[action],
  };
  return { ...service, pending };
}

/** Étape courante, déduite de la progression dans la durée totale. */
export function currentStep(pending: PendingOperation, now: number): string {
  const total = pending.endsAt - pending.startedAt;
  const elapsed = Math.min(total, Math.max(0, now - pending.startedAt));
  const index = Math.min(
    pending.steps.length - 1,
    Math.floor((elapsed / total) * pending.steps.length),
  );
  return pending.steps[index];
}

/** Progression 0–1, pour la barre du badge. */
export function progress(pending: PendingOperation, now: number): number {
  const total = pending.endsAt - pending.startedAt;
  return Math.min(1, Math.max(0, (now - pending.startedAt) / total));
}

/**
 * Incrémente le dernier nombre d'une version, quelle que soit sa forme :
 * « v2.14.3 » → « v2.14.4 », « PostgreSQL 16.2 » → « PostgreSQL 16.3 ».
 */
function bumpVersion(version: string): string {
  return version.replace(/(\d+)(?!.*\d)/, (n) => String(Number(n) + 1));
}

export interface CompletionResult {
  service: Service;
  incidents: Incident[];
}

/**
 * Applique l'effet d'une opération arrivée à terme.
 *
 * Le panneau d'incidents suit : arrêter un service en ouvre un, le redémarrer
 * clôt celui qui était ouvert dessus. Sans ça, un testeur qui éteint
 * `redis-cache` verrait une carte « Hors ligne » à 1 et aucun incident en face.
 */
export function completeAction(
  service: Service,
  incidents: Incident[],
  now: number,
  newIncidentId: string,
): CompletionResult {
  const pending = service.pending;
  if (!pending) return { service, incidents };

  const settled = { ...service, pending: null };

  switch (pending.action) {
    case 'deploy':
      return {
        service: {
          ...settled,
          version: bumpVersion(service.version),
          lastDeploy: now,
        },
        incidents,
      };

    case 'stop': {
      const stopped: Service = {
        ...settled,
        status: 'offline',
        instancesHealthy: 0,
        requestsPerMin: 0,
        latency: 0,
        cpu: 0,
        memory: 0,
        errorRate: 100,
      };
      const incident: Incident = {
        id: newIncidentId,
        title: `${service.name} stopped manually`,
        serviceId: service.id,
        severity: 'minor',
        status: 'identified',
        startedAt: now,
        resolvedAt: null,
        updates: [
          {
            t: now,
            status: 'identified',
            message:
              'Shutdown triggered from the monitoring console. The service no longer receives traffic.',
          },
        ],
      };
      return { service: stopped, incidents: [incident, ...incidents] };
    }

    case 'start': {
      const started: Service = {
        ...settled,
        status: 'operational',
        instancesHealthy: service.instances,
        // On repart de zéro : la remontée en charge se voit dans les courbes.
        requestsPerMin: 0,
        latency: 0,
        cpu: 0,
        memory: 0,
        errorRate: 0,
      };
      return {
        service: started,
        incidents: resolveOpenIncidents(incidents, service.id, now),
      };
    }
  }
}

/** Clôt les incidents encore ouverts sur un service qui vient de redémarrer. */
function resolveOpenIncidents(
  incidents: Incident[],
  serviceId: string,
  now: number,
): Incident[] {
  return incidents.map((incident) => {
    if (incident.serviceId !== serviceId || incident.resolvedAt !== null) {
      return incident;
    }
    return {
      ...incident,
      status: 'resolved',
      resolvedAt: now,
      updates: [
        ...incident.updates,
        {
          t: now,
          status: 'resolved' as const,
          message:
            'Service restarted from the console. Health checks passing, traffic restored.',
        },
      ],
    };
  });
}
