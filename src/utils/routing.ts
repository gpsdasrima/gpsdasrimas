/**
 * Roteamento real usando o servidor público e gratuito do OSRM
 * (Open Source Routing Machine, projeto do OpenStreetMap — sem chave de API).
 *
 * Isso permite desenhar a rota de verdade dentro do próprio app (em vez de
 * só abrir um site externo), com instruções passo a passo (siga reto, vire
 * à esquerda, rotatória...) com base na localização exata (lat/lng) do
 * usuário e da batalha.
 */
import { distanceKm } from './geo';

export type ManeuverType =
  | 'depart'
  | 'turn'
  | 'new name'
  | 'merge'
  | 'on ramp'
  | 'off ramp'
  | 'fork'
  | 'end of road'
  | 'continue'
  | 'roundabout'
  | 'rotary'
  | 'roundabout turn'
  | 'notification'
  | 'arrive';

export type ManeuverModifier =
  | 'uturn'
  | 'sharp right'
  | 'right'
  | 'slight right'
  | 'straight'
  | 'slight left'
  | 'left'
  | 'sharp left';

/** Chave semântica da manobra — a UI mapeia isso para um ícone de verdade (lucide-react). */
export type ManeuverIconKey =
  | 'depart'
  | 'arrive'
  | 'roundabout'
  | 'straight'
  | 'left'
  | 'sharp-left'
  | 'slight-left'
  | 'right'
  | 'sharp-right'
  | 'slight-right'
  | 'uturn'
  | 'fork'
  | 'ramp';

export interface RouteStep {
  /** Instrução já traduzida e pronta para exibir, ex.: "Vire à esquerda na Rua X". */
  instruction: string;
  /** Chave do ícone da manobra (ver ManeuverIconKey) — não é emoji nem HTML. */
  icon: ManeuverIconKey;
  distanceM: number;
  durationS: number;
  /** Ponto [lat, lng] onde a manobra acontece — usado para navegação ao vivo. */
  location: [number, number];
  maneuverType: ManeuverType;
  modifier?: ManeuverModifier;
  streetName?: string;
}

export interface RouteResult {
  /** Pontos [lat, lng] da geometria da rota, prontos para desenhar no mapa. */
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  /** Instruções passo a passo, na ordem da rota. */
  steps: RouteStep[];
}

export type RouteProfile = 'driving' | 'walking' | 'cycling';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

const MODIFIER_LABEL: Record<ManeuverModifier, string> = {
  uturn: 'Faça o retorno',
  'sharp right': 'Vire acentuadamente à direita',
  right: 'Vire à direita',
  'slight right': 'Mantenha-se à direita',
  straight: 'Siga em frente',
  'slight left': 'Mantenha-se à esquerda',
  left: 'Vire à esquerda',
  'sharp left': 'Vire acentuadamente à esquerda',
};

const MODIFIER_ICON: Record<ManeuverModifier, ManeuverIconKey> = {
  uturn: 'uturn',
  'sharp right': 'sharp-right',
  right: 'right',
  'slight right': 'slight-right',
  straight: 'straight',
  'slight left': 'slight-left',
  left: 'left',
  'sharp left': 'sharp-left',
};

interface OsrmManeuver {
  type: ManeuverType;
  modifier?: ManeuverModifier;
  location: [number, number]; // [lng, lat]
  exit?: number;
}

interface OsrmStep {
  maneuver: OsrmManeuver;
  distance: number;
  duration: number;
  name?: string;
}

function buildInstruction(step: OsrmStep): { instruction: string; icon: ManeuverIconKey } {
  const { maneuver, name } = step;
  const street = name ? ` na ${name}` : '';
  const modifierLabel = maneuver.modifier ? MODIFIER_LABEL[maneuver.modifier] : 'Continue';
  const modifierIcon: ManeuverIconKey = maneuver.modifier ? MODIFIER_ICON[maneuver.modifier] : 'straight';

  switch (maneuver.type) {
    case 'depart':
      return { instruction: `Siga em frente${street}`, icon: 'depart' };
    case 'arrive':
      return { instruction: 'Você chegou ao destino', icon: 'arrive' };
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return {
        instruction: `Entre na rotatória${maneuver.exit ? ` e saia na ${maneuver.exit}ª saída` : ''}${street}`,
        icon: 'roundabout',
      };
    case 'merge':
      return { instruction: `Entre${street}`, icon: modifierIcon };
    case 'on ramp':
      return { instruction: `Pegue a rampa de acesso${street}`, icon: 'ramp' };
    case 'off ramp':
      return { instruction: `Saia pela rampa${street}`, icon: 'ramp' };
    case 'fork':
      return { instruction: `${modifierLabel}${street} (bifurcação)`, icon: 'fork' };
    case 'end of road':
      return { instruction: `${modifierLabel}${street} (fim da via)`, icon: modifierIcon };
    case 'new name':
    case 'continue':
      return { instruction: `Continue${street}`, icon: 'straight' };
    case 'turn':
    default:
      return { instruction: `${modifierLabel}${street}`, icon: modifierIcon };
  }
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number],
  profile: RouteProfile = 'driving'
): Promise<RouteResult> {
  const url = `${OSRM_BASE}/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true&alternatives=false`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Não foi possível calcular a rota agora.');
  }
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('Nenhuma rota encontrada entre os dois pontos.');
  }

  const route = data.routes[0];
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  const rawSteps: OsrmStep[] = (route.legs ?? []).flatMap((leg: { steps: OsrmStep[] }) => leg.steps ?? []);
  const steps: RouteStep[] = rawSteps.map((step) => {
    const { instruction, icon } = buildInstruction(step);
    return {
      instruction,
      icon,
      distanceM: step.distance,
      durationS: step.duration,
      location: [step.maneuver.location[1], step.maneuver.location[0]],
      maneuverType: step.maneuver.type,
      modifier: step.maneuver.modifier,
      streetName: step.name || undefined,
    };
  });

  return {
    coordinates,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    steps,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatStepDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Monta links precisos (lat/lng, não endereço) para apps externos de navegação. */
export function externalNavLinks(to: [number, number], from?: [number, number] | null) {
  const [lat, lng] = to;
  return {
    googleMaps: from
      ? `https://www.google.com/maps/dir/?api=1&origin=${from[0]},${from[1]}&destination=${lat},${lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}${from ? `&saddr=${from[0]},${from[1]}` : ''}`,
  };
}

/**
 * Para o modo de navegação ao vivo: dado onde o usuário está agora e o
 * índice do passo atual, decide se já é hora de avançar para o próximo
 * passo da rota (quando chega perto o suficiente do ponto da manobra).
 * Nunca volta o índice para trás.
 */
export function advanceStepIndex(
  userLocation: [number, number],
  steps: RouteStep[],
  currentIndex: number,
  thresholdMeters = 35
): number {
  let idx = currentIndex;
  for (let i = currentIndex; i < steps.length - 1; i++) {
    const distanceMeters = distanceKm(userLocation[0], userLocation[1], steps[i].location[0], steps[i].location[1]) * 1000;
    if (distanceMeters < thresholdMeters) {
      idx = i + 1;
    } else {
      break;
    }
  }
  return idx;
}
