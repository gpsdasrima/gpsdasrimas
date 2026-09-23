import type { BattleLiveState } from '../types';
import { liveStateColor, liveStateLabel } from '../utils/date';

export function StatusBadge({ state }: { state: BattleLiveState }) {
  const color = liveStateColor(state);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: color, color }}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${state === 'ao_vivo' ? 'pin-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
      {liveStateLabel(state)}
    </span>
  );
}
