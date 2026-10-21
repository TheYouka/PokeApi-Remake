// SpriteImage (§8.2, §16, §17): solo carga URLs de raw.githubusercontent.com/PokeAPI/; con null o
// cualquier otra URL pinta el marcador sin pedir nada. width/height siempre; lazy + async salvo
// `priority` (fetchpriority="high"). Si falla, se sustituye UNA vez por el marcador (RF-ERR-4).
import { useState } from 'react';
import { SPRITE_PREFIX } from '../state/recent';
import { PokeballMark } from './PokeballMark';
import styles from './SpriteImage.module.css';

export { SPRITE_PREFIX };
export const isSpriteUrl = (src: string | null | undefined): src is string =>
  typeof src === 'string' && src.startsWith(SPRITE_PREFIX);

export interface SpriteImageProps {
  src: string | null;
  /** Obligatorio: vacío si es decorativa. */
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  pixelated?: boolean;
  className?: string;
}

export function SpriteImage({ src, alt, width, height, priority = false, pixelated = false, className }: SpriteImageProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const ok = isSpriteUrl(src) && failed !== src;
  if (!ok) {
    return (
      <span
        className={`${styles.placeholder} ${className ?? ''}`}
        style={{ width, height }}
        {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      >
        <PokeballMark variant="outline" size="62%" strokeWidth={5} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${styles.img} ${pixelated ? styles.pixelated : ''} ${className ?? ''}`}
      {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
      decoding="async"
      draggable={false}
      onError={() => setFailed(src)}
    />
  );
}
