// Fondo (§10.2): capa fija aria-hidden. Gradientes de acento bajo un blur(80px) ESTÁTICO (se
// rasteriza una vez); lo que deriva (60 s) es el transform del contenedor, quieto con movimiento
// reducido. Ruido feTurbulence como data: URI al 4 % y una Pokébola de contorno al 5 %. Nada de red.
import { PokeballMark } from './PokeballMark';
import styles from './Background.module.css';

export function Background() {
  return (
    <div className={styles.background} aria-hidden="true">
      <div className={styles.drift}>
        <div className={styles.blur}>
          <span className={styles.glowA} />
          <span className={styles.glowB} />
        </div>
      </div>
      <div className={styles.noise} />
      <PokeballMark variant="outline" className={styles.mark} size={900} strokeWidth={1.2} />
    </div>
  );
}
