interface Props {
  src: string;
  className?: string;
  alt?: string;
}

/**
 * Renderiza um ícone monocromático (PNG com fundo transparente) como uma
 * máscara CSS preenchida com `currentColor` — assim dá pra colorir o ícone
 * dinamicamente com classes normais de texto (text-signal-yellow,
 * text-chalk-500 etc.), igual eu faria com um SVG inline.
 */
export function MaskIcon({ src, className = '', alt }: Props) {
  return (
    <span
      role={alt ? 'img' : 'presentation'}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}
