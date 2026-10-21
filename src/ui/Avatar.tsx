// Avatar circular del perfil: silueta SVG original o el sprite del Pokémon elegido (§10.6).
import { pokemonSprite } from '../data/sprites';
import { es } from '../i18n/es';
import type { Avatar as AvatarSetting } from '../state/settings';
import { SpriteImage } from './SpriteImage';
import styles from './Avatar.module.css';

export function Avatar({ avatar, size = 40 }: { avatar: AvatarSetting; size?: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden="true">
      {avatar === 'default' ? (
        <svg viewBox="0 0 40 40" width={size} height={size} focusable="false">
          <title>{es.topbar.avatarSilhouette}</title>
          <circle cx="20" cy="15" r="7" fill="currentColor" />
          <path d="M6 37c1.5-8 7-12 14-12s12.5 4 14 12z" fill="currentColor" />
        </svg>
      ) : (
        <SpriteImage src={pokemonSprite(avatar.pokemonId)} alt="" width={size} height={size} pixelated className={styles.sprite} />
      )}
    </span>
  );
}
