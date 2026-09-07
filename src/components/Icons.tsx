import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
}

/**
 * Icônes en SVG inline plutôt qu'une librairie : trois glyphes ne justifient
 * pas une dépendance, et celles-ci pèsent quelques octets une fois compressées.
 * Tracé sur une grille de 12, épaisseur 1.5 pour rester net en 12 px.
 */
function Icon({
  className = '',
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`size-3 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Flèche montante sortant d'un socle : mise en production. */
export function IconDeploy({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 8V1.75" />
      <path d="M3.5 4.25 6 1.75l2.5 2.5" />
      <path d="M1.75 8.5v1.75h8.5V8.5" />
    </Icon>
  );
}

/** Carré plein : arrêt. */
export function IconStop({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="2.75" y="2.75" width="6.5" height="6.5" rx="1" />
    </Icon>
  );
}

/** Chevron : sens de tri d'une colonne. Pivoté par le composant appelant. */
export function IconCaret({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 4.5 6 7.5l3-3" />
    </Icon>
  );
}

/** Triangle de lecture : démarrage. */
export function IconStart({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 2.5 9.5 6l-6 3.5V2.5Z" />
    </Icon>
  );
}
