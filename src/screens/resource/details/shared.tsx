// Piezas comunes de los renderers de detalle (§7.3). Texto de la API siempre como texto de React.
import type { ReactNode } from 'react';
import { pickDescription } from '../../../api/localize';
import type { APIResource, Description, NamedAPIResource } from '../../../api/types/common';
import type { AbilityEffectChange } from '../../../api/types/pokemon';
import { EffectText } from '../../../ui/data/EffectText';
import { RefLabel } from '../../../ui/data/RefLabel';
import { parseResourceUrl } from '../../../api/urls';
import { useDataLang } from '../../../data/hooks';
import { es } from '../../../i18n/es';
import { formatNumber } from '../../../i18n/format';
import type { LabelMode } from '../../../registry/resources';
import { LocalizedText } from '../../../ui/data/LocalizedText';
import { RefChips } from '../../../ui/data/RefChips';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import styles from './details.module.css';

export const dash = es.app.dash;
export const num = (n: number | null | undefined): string => (n === null || n === undefined ? dash : formatNumber(n));
export const yesNo = (b: boolean): string => (b ? es.app.yes : es.app.no);
export const pct = (n: number): string => es.detail.percent(formatNumber(n, { maximumFractionDigits: 1 }));
export const idOf = (r: { url: string }): number => parseResourceUrl(r.url)?.id ?? 0;
export const byId = (a: { url: string }, b: { url: string }): number => idOf(a) - idOf(b);

/** Enlace a una referencia o "—". */
export function RefOr({ r, mode }: { r: NamedAPIResource | APIResource | null | undefined; mode?: LabelMode }) {
  return r ? <ResourceLink resource={r} labelMode={mode} /> : <>{dash}</>;
}

/** Descripción localizada (cadena de idiomas) o "Sin texto disponible". */
export function DescriptionText({ entries }: { entries: Description[] | undefined }) {
  const lang = useDataLang();
  const d = pickDescription(entries, lang);
  if (!d) return <p className={styles.muted}>{es.blocks.noText}</p>;
  return <LocalizedText as="p" text={d.text} lang={d.lang} className={styles.prose} />;
}

/** Sección "Descripción" solo si hay entradas. */
export function DescriptionSection({ entries, title = es.detail.descriptions }: { entries: Description[] | undefined; title?: string }) {
  if (!entries || entries.length === 0) return null;
  return <Section title={title}><DescriptionText entries={entries} /></Section>;
}

/** Sección con chips de referencias (pliegue de 48 + "Ver todos (N)"). */
export function ChipsSection({ title, refs, mode, sort = false }: {
  title: string; refs: readonly (NamedAPIResource | APIResource)[]; mode?: LabelMode; sort?: boolean;
}) {
  const list = sort ? [...refs].sort(byId) : refs;
  return (
    <Section title={title}>
      <RefChips refs={list} label={title} labelMode={mode} />
    </Section>
  );
}

/** Rango "mín–máx" con nulos (los dos nulos → "—"). */
export function nullableRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return dash;
  return es.detail.range(min ?? max ?? 0, max ?? min ?? 0);
}

/** `effect_changes` (habilidades y movimientos): efecto anterior por grupo de versiones. */
export function EffectChangesSection({ changes }: { changes: readonly AbilityEffectChange[] }) {
  if (changes.length === 0) return null;
  return (
    <Section title={es.detail.ability.effectChanges}>
      <ul role="list" className={styles.stack}>
        {[...changes].sort((a, b) => idOf(a.version_group) - idOf(b.version_group)).map((c) => (
          <li key={c.version_group.name} className={styles.stack}>
            <strong><RefLabel resource={c.version_group} mode="versions" /></strong>
            <EffectText entries={c.effect_entries} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

export { styles };
