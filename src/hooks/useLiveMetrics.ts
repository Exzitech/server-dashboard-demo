import { useCallback, useEffect, useRef, useState } from 'react';
import type { Incident, Service, ServiceAction } from '../types';
import { createIncidents, createServices } from '../data/seed';
import { tickServices } from '../data/simulate';
import { beginAction, canRun, completeAction } from '../data/actions';

/** Cadence de l'horloge interne. Assez fine pour animer les opérations. */
const FRAME_MS = 250;

/** Les métriques ne sont recalculées qu'une image sur huit, soit 2 s. */
const FRAMES_PER_METRIC_TICK = 8;

/** La fenêtre de 24 h glisse d'un point tous les 5 recalculs de métriques. */
const TICKS_PER_POINT = 5;

/** Premier numéro disponible pour un incident ouvert pendant la démonstration. */
const FIRST_INCIDENT_SEQ = 2419;

interface DemoState {
  services: Service[];
  incidents: Incident[];
  /** Prochain numéro d'incident à attribuer. */
  incidentSeq: number;
}

function createState(origin: number): DemoState {
  return {
    services: createServices(origin),
    incidents: createIncidents(origin),
    incidentSeq: FIRST_INCIDENT_SEQ,
  };
}

/**
 * Applique les opérations arrivées à terme. Fonction pure de l'état précédent :
 * elle peut être rejouée sans dédoubler un incident, ce que le mode strict de
 * React fait en développement.
 */
function applyDueOperations(prev: DemoState, now: number): DemoState {
  const hasDue = prev.services.some((s) => s.pending && s.pending.endsAt <= now);
  if (!hasDue) return prev;

  let incidents = prev.incidents;
  let seq = prev.incidentSeq;

  const services = prev.services.map((service) => {
    if (!service.pending || service.pending.endsAt > now) return service;

    const before = incidents.length;
    const result = completeAction(service, incidents, now, `INC-${seq}`);
    incidents = result.incidents;
    if (incidents.length > before) seq += 1;
    return result.service;
  });

  return { services, incidents, incidentSeq: seq };
}

export interface LiveMetrics {
  services: Service[];
  incidents: Incident[];
  /** Horloge courante, rafraîchie à chaque image utile. */
  now: number;
  /** Déclenche une opération sur un service, si elle a un sens. */
  runAction: (serviceId: string, action: ServiceAction) => void;
  /** Remet la démonstration dans son état initial. */
  reset: () => void;
}

export function useLiveMetrics(): LiveMetrics {
  // Un seul instant de référence pour tout l'état initial : services,
  // historiques et incidents doivent parler de la même seconde.
  const [origin] = useState(() => Date.now());
  const [state, setState] = useState<DemoState>(() => createState(origin));
  const [now, setNow] = useState(origin);

  const frame = useRef(0);
  const metricTicks = useRef(0);
  // Tant qu'aucune opération n'est en cours, inutile de réveiller le rendu
  // quatre fois par seconde : l'horloge ne bouge qu'au rythme des métriques.
  const hasPending = useRef(false);

  useEffect(() => {
    hasPending.current = state.services.some((s) => s.pending !== null);
  }, [state.services]);

  useEffect(() => {
    const id = window.setInterval(() => {
      // Onglet en arrière-plan : rien à animer, on laisse le processeur
      // tranquille. Le prospect a peut-être ouvert le lien puis changé d'onglet.
      if (document.hidden) return;

      const t = Date.now();
      frame.current += 1;
      const metricTick = frame.current % FRAMES_PER_METRIC_TICK === 0;

      if (hasPending.current) {
        setState((prev) => applyDueOperations(prev, t));
      }

      if (metricTick) {
        metricTicks.current += 1;
        const advance = metricTicks.current % TICKS_PER_POINT === 0;
        setState((prev) => ({
          ...prev,
          services: tickServices(prev.services, t, advance),
        }));
      }

      if (metricTick || hasPending.current) setNow(t);
    }, FRAME_MS);

    return () => window.clearInterval(id);
  }, []);

  const runAction = useCallback((serviceId: string, action: ServiceAction) => {
    const t = Date.now();
    setState((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.id === serviceId && canRun(s, action) ? beginAction(s, action, t) : s,
      ),
    }));
    setNow(t);
  }, []);

  const reset = useCallback(() => {
    const t = Date.now();
    frame.current = 0;
    metricTicks.current = 0;
    setState(createState(t));
    setNow(t);
  }, []);

  return {
    services: state.services,
    incidents: state.incidents,
    now,
    runAction,
    reset,
  };
}
