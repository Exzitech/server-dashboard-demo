import type { MouseEvent } from 'react';
import type { Service, ServiceAction } from '../types';
import { ACTION_LABEL, canRun } from '../data/actions';
import { IconDeploy, IconStart, IconStop } from './Icons';

interface Props {
  service: Service;
  onRun: (serviceId: string, action: ServiceAction) => void;
  /** Les boutons occupent toute la largeur disponible — cartes mobiles. */
  fullWidth?: boolean;
  className?: string;
}

const BASE_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded ' +
  'border border-line-strong px-2 py-1 text-2xs text-muted ' +
  'transition-colors hover:bg-surface-hover hover:text-fg ' +
  'disabled:cursor-not-allowed disabled:opacity-35 ' +
  'disabled:hover:bg-transparent disabled:hover:text-muted';

/**
 * Actions disponibles sur un service. Un service hors ligne se démarre, les
 * autres s'arrêtent : on n'affiche jamais les deux, le testeur n'a pas à
 * choisir entre un bouton actif et un bouton grisé qui dit la même chose.
 */
export default function ServiceActions({
  service,
  onRun,
  fullWidth = false,
  className = '',
}: Props) {
  const toggle: ServiceAction = service.status === 'offline' ? 'start' : 'stop';

  // Largeur figée en tableau, pas dimensionnée sur le texte : « Redeploy » et
  // « Start » n'ont pas la même longueur, et sans ça les boutons décrochent
  // d'une ligne à l'autre au lieu de former deux colonnes nettes.
  const sizing = fullWidth ? 'flex-1 py-1.5' : 'w-[92px]';

  const run = (action: ServiceAction) => (event: MouseEvent) => {
    // La ligne entière est cliquable : sans ça, agir sur un service ouvrirait
    // aussi son panneau de détail.
    event.stopPropagation();
    onRun(service.id, action);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        className={`${BASE_CLASS} ${sizing}`}
        disabled={!canRun(service, 'deploy')}
        onClick={run('deploy')}
      >
        <IconDeploy />
        {ACTION_LABEL.deploy}
      </button>
      <button
        type="button"
        className={`${BASE_CLASS} ${sizing} ${
          toggle === 'stop' ? 'hover:!text-crit' : 'hover:!text-ok'
        }`}
        disabled={!canRun(service, toggle)}
        onClick={run(toggle)}
      >
        {toggle === 'stop' ? <IconStop /> : <IconStart />}
        {ACTION_LABEL[toggle]}
      </button>
    </div>
  );
}
