import { useToastStore } from '../store/toastStore';

const ICONS: Record<string, string> = {
  success: '🔥',
  error: '⚠️',
  info: '📍',
};

const BORDER: Record<string, string> = {
  success: 'border-l-signal-green',
  error: 'border-l-signal-red',
  info: 'border-l-gps-blue',
};

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex w-full max-w-sm flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 rounded-xl border-l-4 bg-ink-800/95 px-4 py-3 shadow-card backdrop-blur ${BORDER[t.type]} animate-[fadeIn_0.2s_ease-out]`}
        >
          <span className="text-lg leading-none">{ICONS[t.type]}</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-chalk-100">{t.title}</p>
            {t.description && <p className="mt-0.5 text-chalk-300">{t.description}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-chalk-500 hover:text-chalk-100"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
