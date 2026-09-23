import { useState } from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  GitFork,
  MapPin,
  Navigation,
  RotateCw,
  Undo2,
} from 'lucide-react';
import { formatStepDistance, type ManeuverIconKey, type RouteStep } from '../utils/routing';

const MANEUVER_ICON: Record<ManeuverIconKey, typeof ArrowUp> = {
  depart: MapPin,
  arrive: Flag,
  roundabout: RotateCw,
  straight: ArrowUp,
  left: CornerUpLeft,
  'sharp-left': CornerUpLeft,
  'slight-left': ArrowUpLeft,
  right: CornerUpRight,
  'sharp-right': CornerUpRight,
  'slight-right': ArrowUpRight,
  uturn: Undo2,
  fork: GitFork,
  ramp: ArrowUpRight,
};

function StepIcon({ icon, className }: { icon: ManeuverIconKey; className?: string }) {
  const Icon = MANEUVER_ICON[icon];
  return <Icon className={className} strokeWidth={2} />;
}

interface Props {
  steps: RouteStep[];
  currentIndex: number;
  live: boolean;
  onToggleLive: () => void;
}

export function TurnByTurnPanel({ steps, currentIndex, live, onToggleLive }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  const current = steps[Math.min(currentIndex, steps.length - 1)];
  const remaining = steps.slice(currentIndex + 1);

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/95 shadow-card backdrop-blur">
      {/* Instrução atual, em destaque */}
      <div className="flex items-center gap-3 p-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            live ? 'bg-signal-yellow text-ink-950' : 'bg-ink-700 text-chalk-100'
          }`}
        >
          <StepIcon icon={current.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-chalk-100">{current.instruction}</p>
          <p className="text-xs text-chalk-500">
            {formatStepDistance(current.distanceM)}
            {live && ' · ao vivo'}
          </p>
        </div>
        <button
          onClick={onToggleLive}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
            live ? 'bg-signal-red/15 text-signal-red' : 'bg-signal-yellow text-ink-950'
          }`}
        >
          {!live && <Navigation className="h-3.5 w-3.5" />}
          {live ? 'Parar' : 'Navegar'}
        </button>
      </div>

      {/* Lista completa das próximas instruções */}
      {remaining.length > 0 && (
        <div className="border-t border-ink-700">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-semibold text-chalk-300"
          >
            {expanded ? 'Ocultar próximas instruções' : `Ver todas as instruções (${remaining.length})`}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && (
            <ul className="max-h-48 overflow-y-auto px-3.5 pb-3">
              {remaining.map((step, i) => (
                <li key={i} className="flex items-center gap-2.5 border-t border-ink-700/60 py-2 first:border-t-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-700">
                    <StepIcon icon={step.icon} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-chalk-200">{step.instruction}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-chalk-500">{formatStepDistance(step.distanceM)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
