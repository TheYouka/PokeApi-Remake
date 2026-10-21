// EffectText (§7.2): efecto localizado con $effect_chance sustituido ("—" si es null).
import { normalizeEffectText, pickEffect } from '../../api/localize';
import type { Effect } from '../../api/types/common';
import { useDataLang } from '../../data/hooks';
import { es } from '../../i18n/es';
import { LocalizedText } from './LocalizedText';
import styles from './blocks.module.css';

export interface EffectTextProps {
  entries: readonly (Effect & { short_effect?: string })[] | undefined;
  effectChance?: number | null;
  /** Usa `short_effect` si existe. */
  short?: boolean;
  as?: 'p' | 'span';
}

export function EffectText({ entries, effectChance = null, short = false, as = 'p' }: EffectTextProps) {
  const lang = useDataLang();
  const effect = pickEffect(entries, lang, effectChance);
  if (!effect) return <span className={styles.muted}>{es.blocks.noText}</span>;
  const text = normalizeEffectText(short && effect.short ? effect.short : effect.text);
  return <LocalizedText as={as} text={text} lang={effect.lang} className={styles.effect} />;
}
