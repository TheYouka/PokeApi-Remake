// Pestaña Naturaleza y Pokéathlon (§13.2, RF-POK-12 / A-3): Picker de las 25 naturalezas; aplica
// ×1,1 / ×0,9 a las stats que suben y bajan (▲▼), cambios Pokéathlon y sabores; Parque Compi.
import { useState } from 'react';
import type { NamedAPIResource } from '../../../api/types/common';
import type { Pokemon, PokemonSpecies } from '../../../api/types/pokemon';
import { useListAll, useRefData } from '../../../data/hooks';
import { es } from '../../../i18n/es';
import { formatSlug } from '../../../i18n/format';
import { FactGrid } from '../../../ui/data/FactGrid';
import { MiniTable } from '../../../ui/data/MiniTable';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { Picker } from '../../../ui/Picker';
import { Skeleton } from '../../../ui/Skeleton';
import { STAT_KEYS, StatBars, statValues, type StatKey } from '../../../ui/StatBars';
import styles from '../PokemonScreen.module.css';

const NONE = '';

export function Naturaleza({ pokemon, species }: { pokemon: Pokemon; species: PokemonSpecies | undefined }) {
  const natures = useListAll('nature');
  const [chosen, setChosen] = useState(NONE);
  const ref: NamedAPIResource<'nature'> | null = natures.data?.results.find((n) => n.name === chosen) ?? null;
  const nature = useRefData(ref, { priority: 'high' });
  const n = nature.data;

  const base = statValues(pokemon.stats);
  const up = n?.increased_stat?.name as StatKey | undefined;
  const down = n?.decreased_stat?.name as StatKey | undefined;
  const neutral = n !== undefined && (up === undefined || up === down);
  const values = STAT_KEYS.map((k, i) => {
    const v = base[i] ?? 0;
    if (!n || neutral) return v;
    if (k === up) return Math.floor(v * 1.1);
    if (k === down) return Math.floor(v * 0.9);
    return v;
  });
  const modifiers: Partial<Record<StatKey, 'up' | 'down'>> = {};
  if (n && !neutral) {
    if (up) modifiers[up] = 'up';
    if (down) modifiers[down] = 'down';
  }
  const list = natures.data?.results ?? [];
  const byName = new Map(list.map((r) => [r.name, r]));
  const t = es.pokemon.nature;

  return (
    <div className={styles.tabGrid}>
      <Section title={es.pokemon.sections.nature}>
        <Picker
          label={t.picker}
          value={chosen}
          disabled={list.length === 0}
          options={[{ value: NONE, label: es.app.none }, ...list.map((r) => ({ value: r.name, label: formatSlug(r.name) }))]}
          onChange={setChosen}
          renderValue={(o) => { const r = byName.get(o.value); return r ? <RefLabel resource={r} lazy={false} /> : o.label; }}
          renderOption={(o) => { const r = byName.get(o.value); return r ? <RefLabel resource={r} /> : o.label; }}
        />
        {chosen !== NONE && !n ? <Skeleton height="2em" /> : null}
        {neutral ? <p className={styles.muted}>{t.neutral}</p> : null}
        <StatBars values={values} modifiers={modifiers} />
      </Section>
      {n ? (
        <>
          <Section title={es.pokemon.sections.flavors}>
            <FactGrid facts={[
              { label: t.likes, value: n.likes_flavor ? <ResourceLink resource={n.likes_flavor} /> : es.app.dash },
              { label: t.hates, value: n.hates_flavor ? <ResourceLink resource={n.hates_flavor} /> : es.app.dash },
            ]} />
          </Section>
          <Section title={es.pokemon.sections.pokeathlon}>
            {n.pokeathlon_stat_changes.length === 0 ? <p className={styles.muted}>{t.noPokeathlon}</p> : (
              <ul role="list" className={styles.dexList}>
                {n.pokeathlon_stat_changes.map((c) => (
                  <li key={c.pokeathlon_stat.name} className={styles.dexEntry}>
                    <ResourceLink resource={c.pokeathlon_stat} />
                    <span className="tabular" data-change={c.max_change > 0 ? 'up' : 'down'}>{t.change(c.max_change)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : null}
      {species && species.pal_park_encounters.length > 0 ? (
        <Section title={es.pokemon.sections.palPark}>
          <MiniTable
            caption={t.palCaption}
            columns={[
              { key: 'area', label: t.area },
              { key: 'score', label: t.baseScore, numeric: true },
              { key: 'rate', label: t.rate, numeric: true },
            ]}
            rows={species.pal_park_encounters.map((p) => ({
              key: p.area.name,
              cells: [<ResourceLink key="a" resource={p.area} />, p.base_score, p.rate],
            }))}
          />
        </Section>
      ) : null}
    </div>
  );
}
