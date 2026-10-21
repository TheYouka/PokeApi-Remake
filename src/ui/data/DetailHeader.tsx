// DetailHeader (§7.2): grupo como caption, h1 con el nombre localizado y chip con slug e ID.
import type { ReactNode } from 'react';
import { toBcp47 } from '../../api/localize';
import { LangBadge } from './LocalizedText';
import styles from './blocks.module.css';

export interface DetailHeaderProps {
  caption: string;
  title: string;
  /** Idioma del título (null = slug formateado). */
  lang: string | null;
  /** Chip con slug e ID ("pikachu · #25"). */
  chip?: string;
  media?: ReactNode;
  children?: ReactNode;
}

export function DetailHeader({ caption, title, lang, chip, media, children }: DetailHeaderProps) {
  return (
    <header className={styles.detailHeader}>
      {media ? <div className={styles.detailMedia}>{media}</div> : null}
      <div className={styles.detailText}>
        <p className="caption">{caption}</p>
        <h1 tabIndex={-1} data-focus-start="" lang={lang ? toBcp47(lang) : undefined}>
          {title}
          {lang && lang !== 'es' ? <LangBadge code={lang} /> : null}
        </h1>
        {chip ? <span className={`${styles.chip} tabular`}>{chip}</span> : null}
        {children}
      </div>
    </header>
  );
}
