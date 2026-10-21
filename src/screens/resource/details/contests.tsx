// Renderers del grupo Concursos (§7.3 filas 4–6).
import { toBcp47 } from '../../../api/localize';
import type { ContestEffect, ContestType, SuperContestEffect } from '../../../api/types/contests';
import { es } from '../../../i18n/es';
import { POKEMON_COLORS, type PokemonColorName } from '../../../ui/colors';
import { EffectText } from '../../../ui/data/EffectText';
import { FactGrid } from '../../../ui/data/FactGrid';
import { FlavorTextPicker } from '../../../ui/data/FlavorTextPicker';
import { MiniTable } from '../../../ui/data/MiniTable';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { ChipsSection, num, styles } from './shared';

const c = es.detail.contest;

/** Muestra de color: el `color` en inglés ("Red", "Blue"…) se busca en la paleta del original. */
const swatchOf = (english: string | undefined): string | null => {
  const k = (english ?? '').trim().toLowerCase();
  return Object.hasOwn(POKEMON_COLORS, k) ? POKEMON_COLORS[k as PokemonColorName] : null;
};

export function ContestTypeDetail({ data }: { data: ContestType }) {
  const swatch = swatchOf(data.names.find((n) => n.language.name === 'en')?.color);
  const rows = data.names.map((n, i) => ({
    key: `${n.language.name}|${i}`,
    cells: [
      <RefLabel key="l" resource={n.language} mode="slug" />,
      <span key="n" lang={toBcp47(n.language.name)}>{n.name}</span>,
      <span key="c" className={styles.inline} lang={toBcp47(n.language.name)}>
        {swatch ? <span className={styles.swatch} style={{ background: swatch }} aria-hidden="true" /> : null}
        {n.color}
      </span>,
    ],
  }));
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: c.berryFlavor, value: <ResourceLink resource={data.berry_flavor} /> }]} />
      </Section>
      <Section title={c.colorNames}>
        <MiniTable
          caption={c.colorNames}
          captionHidden
          columns={[{ key: 'lang', label: es.detail.language }, { key: 'name', label: es.detail.name }, { key: 'color', label: c.color }]}
          rows={rows}
        />
      </Section>
    </>
  );
}

export function ContestEffectDetail({ data }: { data: ContestEffect }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: c.appeal, value: num(data.appeal) }, { label: c.jam, value: num(data.jam) }]} />
      </Section>
      <Section title={es.detail.effect}><EffectText entries={data.effect_entries} /></Section>
      <Section title={es.detail.flavor}><FlavorTextPicker entries={data.flavor_text_entries} /></Section>
    </>
  );
}

export function SuperContestEffectDetail({ data }: { data: SuperContestEffect }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: c.appeal, value: num(data.appeal) }]} />
      </Section>
      <Section title={es.detail.flavor}><FlavorTextPicker entries={data.flavor_text_entries} /></Section>
      <ChipsSection title={es.detail.moves} refs={data.moves} />
    </>
  );
}
