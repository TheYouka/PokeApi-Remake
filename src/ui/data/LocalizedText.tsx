// Texto de la API con su idioma (§14): lang={toBcp47} y una insignia (aria-hidden) si no es español.
import type { ElementType, ReactNode } from 'react';
import { toBcp47 } from '../../api/localize';
import { es } from '../../i18n/es';
import styles from './blocks.module.css';

export interface LocalizedTextProps {
  text: ReactNode;
  /** Código de la PokeAPI (null = slug formateado, sin atributo lang). */
  lang: string | null;
  as?: ElementType;
  className?: string;
}

export function LocalizedText({ text, lang, as: Tag = 'span', className }: LocalizedTextProps) {
  return (
    <Tag className={className} lang={lang ? toBcp47(lang) : undefined}>
      {text}
      {lang && lang !== 'es' ? <LangBadge code={lang} /> : null}
    </Tag>
  );
}

export function LangBadge({ code }: { code: string }) {
  return (
    <span className={styles.langBadge} aria-hidden="true" title={es.app.langBadge(code)}>
      {es.blocks.langBadge(code)}
    </span>
  );
}
