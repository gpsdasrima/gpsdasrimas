import type { Battle, BattleLiveState } from '../types';

/** Converte 'YYYY-MM-DD' + 'HH:mm' em Date local. */
export function toDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
}

export function formatDateBR(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isTomorrow(a: Date, now: Date): boolean {
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  return isSameDay(a, t);
}

export function isThisWeek(a: Date, now: Date): boolean {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return a >= start && a <= end;
}

/**
 * Determina o estado "ao vivo" de uma batalha com base na data/hora simulada
 * de "agora" (passada explicitamente para permitir dados de demonstração
 * consistentes com a data atual do sistema).
 */
export function getBattleLiveState(battle: Battle, now: Date): BattleLiveState {
  const start = toDateTime(battle.date, battle.time);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // duração estimada: 3h

  if (now >= start && now <= end) return 'ao_vivo';
  if (isSameDay(start, now) && now < start) return 'hoje';
  if (start > now) return 'proxima';
  return 'encerrada';
}

export function liveStateLabel(state: BattleLiveState): string {
  switch (state) {
    case 'ao_vivo':
      return 'Ao vivo agora';
    case 'hoje':
      return 'Hoje';
    case 'proxima':
      return 'Próxima batalha';
    case 'encerrada':
      return 'Encerrada';
  }
}

export function liveStateColor(state: BattleLiveState): string {
  switch (state) {
    case 'ao_vivo':
      return '#FF3B5C'; // vermelho sinal
    case 'hoje':
      return '#3DDC84'; // verde
    case 'proxima':
      return '#3D8BFF'; // azul GPS
    case 'encerrada':
      return '#5A5A63'; // cinza
  }
}

export function frequencyLabel(freq: Battle['frequency']): string {
  switch (freq) {
    case 'semanal':
      return 'Toda semana';
    case 'quinzenal':
      return 'A cada 15 dias';
    case 'mensal':
      return 'Mensal';
    case 'unico':
      return 'Evento único';
  }
}
