import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, placeholder, autoFocus }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-ink-600 bg-ink-800 px-4 py-3 focus-within:border-signal-yellow">
      <Search className="h-4 w-4 shrink-0 text-chalk-500" strokeWidth={2} />
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Procure uma batalha, cidade ou bairro...'}
        className="w-full bg-transparent text-sm text-chalk-100 placeholder:text-chalk-500 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="text-chalk-500 hover:text-chalk-100"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
