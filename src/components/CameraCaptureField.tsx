import { useEffect, useRef, useState } from 'react';
import { uploadImage } from '../lib/uploadImage';
import { useToastStore } from '../store/toastStore';
import { MaskIcon } from './MaskIcon';
import { ICONS } from '../constants/assets';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  userId: string;
  hint?: string;
}

type Mode = 'idle' | 'starting' | 'live' | 'captured' | 'uploading' | 'denied';

/**
 * Ao contrário de um <input type="file">, isso nunca oferece a opção de
 * escolher uma foto já existente na galeria — a câmera é aberta direto
 * dentro da página via getUserMedia, e a única forma de sair com uma
 * imagem é tirando uma foto de verdade agora.
 */
export function CameraCaptureField({ label, value, onChange, userId, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const push = useToastStore((s) => s.push);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => stopStream, []);

  async function openCamera() {
    setMode('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setMode('live');
      // O <video> só existe depois do próximo render (mode === 'live'); conecta em seguida.
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setMode('denied');
    }
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Espelha a imagem (como um espelho/selfie) para ficar natural.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedPreview(URL.createObjectURL(blob));
        stopStream();
        setMode('captured');
      },
      'image/jpeg',
      0.9
    );
  }

  function handleRetake() {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(null);
    setCapturedPreview(null);
    openCamera();
  }

  async function handleConfirm() {
    if (!capturedBlob) return;
    setMode('uploading');
    try {
      const file = new File([capturedBlob], 'selfie.jpg', { type: 'image/jpeg' });
      const url = await uploadImage('avatars', userId, file);
      onChange(url);
      setMode('idle');
      if (capturedPreview) URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
      setCapturedBlob(null);
    } catch (err) {
      push({
        type: 'error',
        title: 'Não foi possível enviar a foto',
        description: err instanceof Error ? err.message : undefined,
      });
      setMode('captured');
    }
  }

  function handleCancel() {
    stopStream();
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedPreview(null);
    setCapturedBlob(null);
    setMode('idle');
  }

  return (
    <div>
      <span className="text-sm font-medium text-chalk-300">{label}</span>

      {mode === 'idle' && (
        <div className="mt-1.5 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-800">
            {value ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MaskIcon src={ICONS.profile} className="h-8 w-8 text-chalk-600" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openCamera}
            className="rounded-xl border border-ink-600 px-4 py-2 text-sm font-semibold text-chalk-100 hover:border-signal-yellow"
          >
            📷 Abrir câmera
          </button>
        </div>
      )}

      {(mode === 'starting' || mode === 'live') && (
        <div className="mt-2 space-y-2">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-ink-600 bg-ink-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            {mode === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-600 border-t-signal-yellow" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCapture}
              disabled={mode !== 'live'}
              className="flex-1 rounded-xl bg-signal-yellow py-2.5 text-sm font-bold text-ink-950 disabled:opacity-60"
            >
              📸 Tirar foto
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-chalk-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(mode === 'captured' || mode === 'uploading') && capturedPreview && (
        <div className="mt-2 space-y-2">
          <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-ink-600 bg-ink-900">
            <img src={capturedPreview} alt="Foto capturada" className="h-full w-full object-cover" />
            {mode === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-600 border-t-signal-yellow" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={mode === 'uploading'}
              className="flex-1 rounded-xl bg-signal-yellow py-2.5 text-sm font-bold text-ink-950 disabled:opacity-60"
            >
              {mode === 'uploading' ? 'Enviando...' : '✅ Usar essa foto'}
            </button>
            <button
              type="button"
              onClick={handleRetake}
              disabled={mode === 'uploading'}
              className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm text-chalk-300 disabled:opacity-60"
            >
              Tirar de novo
            </button>
          </div>
        </div>
      )}

      {mode === 'denied' && (
        <div className="mt-2 space-y-2 rounded-xl border border-signal-red/40 bg-signal-red/10 p-3">
          <p className="text-xs text-signal-red">
            Não conseguimos acessar sua câmera. Verifique a permissão de câmera do navegador para este site e
            tente de novo.
          </p>
          <button
            type="button"
            onClick={openCamera}
            className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-semibold text-chalk-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {hint && mode === 'idle' && <p className="mt-1 text-xs text-chalk-500">{hint}</p>}
    </div>
  );
}
