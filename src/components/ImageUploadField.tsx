import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { uploadImage, type StorageBucket } from '../lib/uploadImage';
import { useToastStore } from '../store/toastStore';
import { MaskIcon } from './MaskIcon';
import { ICONS } from '../constants/assets';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucket: StorageBucket;
  userId: string;
  shape?: 'circle' | 'banner';
  hint?: string;
}

export function ImageUploadField({ label, value, onChange, bucket, userId, shape = 'banner', hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const push = useToastStore((s) => s.push);

  const displaySrc = preview ?? value;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const url = await uploadImage(bucket, userId, file);
      onChange(url);
    } catch (err) {
      push({
        type: 'error',
        title: 'Não foi possível enviar a imagem',
        description: err instanceof Error ? err.message : undefined,
      });
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <span className="text-sm font-medium text-chalk-300">{label}</span>

      <div className={shape === 'circle' ? 'mt-1.5 flex items-center gap-4' : 'mt-1.5 space-y-2'}>
        <div
          className={
            shape === 'circle'
              ? 'relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-800'
              : 'relative h-36 w-full overflow-hidden rounded-xl border border-ink-600 bg-ink-800'
          }
        >
          {displaySrc ? (
            <img src={displaySrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-chalk-600">
              {shape === 'circle' ? (
                <MaskIcon src={ICONS.profile} className="h-8 w-8" />
              ) : (
                <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
              )}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70">
              <Loader2 className="h-5 w-5 animate-spin text-signal-yellow" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-ink-600 px-4 py-2 text-sm font-semibold text-chalk-100 hover:border-signal-yellow disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" strokeWidth={2} />
          {uploading ? 'Enviando...' : displaySrc ? 'Trocar foto' : 'Escolher da galeria'}
        </button>
      </div>

      {hint && <p className="mt-1 text-xs text-chalk-500">{hint}</p>}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
