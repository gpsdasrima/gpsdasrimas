interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl border border-ink-600 bg-ink-800 p-6 sm:rounded-2xl">
        <h3 className="font-display text-lg text-chalk-100">{title}</h3>
        {description && <p className="mt-2 text-sm text-chalk-300">{description}</p>}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-ink-600 py-2.5 text-sm font-semibold text-chalk-300 hover:bg-ink-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-ink-950 ${
              danger ? 'bg-signal-red' : 'bg-signal-yellow'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
