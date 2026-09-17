import type { BattleLiveState } from '../types';
import { liveStateColor, liveStateLabel } from '../utils/date';

const DOT_EMOJI: Record<BattleLiveState, string> = {
  ao_vivo: '🔴',
  hoje: '🟢',
  proxima: '🔵',
  encerrada: '⚪',
};

export function StatusBadge({ state }: { state: BattleLiveState }) {
  const color = liveStateColor(state);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: color, color }}
    >
      <span className={state === 'ao_vivo' ? 'pin-pulse' : ''}>{DOT_EMOJI[state]}</span>
      {liveStateLabel(state)}
    </span>
  );
}
