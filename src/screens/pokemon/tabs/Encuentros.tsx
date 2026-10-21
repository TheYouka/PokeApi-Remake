// Pestaña Encuentros (§13.2, RF-POK-9): pokemon/{id}/encounters agrupado por área de ubicación y
// después por versión; filas con método, nivel mín–máx, probabilidad y condiciones. Las filas
// idénticas se fusionan sumando la probabilidad. Sin encuentros: "No aparece en estado salvaje".
import { useQuery } from '@tanstack/react-query';
import { Fragment, useMemo } from 'react';
import { displayCode } from '../../../api/errors';
import type { NamedAPIResource } from '../../../api/types/common';
import type { LocationAreaEncounter, Pokemon } from '../../../api/types/pokemon';
import { parseResourceUrl } from '../../../api/urls';
import { encountersQuery } from '../../../data/queries';
import { es } from '../../../i18n/es';
import { formatSlug } from '../../../i18n/format';
import { MiniTable, type MiniTableRow } from '../../../ui/data/MiniTable';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { EmptyState } from '../../../ui/EmptyState';
import { ErrorPanel } from '../../../ui/ErrorPanel';
import { Skeleton, SkeletonRegion } from '../../../ui/Skeleton';
import styles from '../PokemonScreen.module.css';

export interface EncounterRow {
  version: NamedAPIResource<'version'>;
  method: NamedAPIResource<'encounter-method'>;
  min: number;
  max: number;
  chance: number;
  conditions: NamedAPIResource<'encounter-condition-value'>[];
}
export interface AreaEncounters { area: NamedAPIResource<'location-area'>; rows: EncounterRow[] }

const idOf = (r: { url: string }) => parseResourceUrl(r.url)?.id ?? 0;

/** Agrupa por área y versión y fusiona las filas idénticas sumando la probabilidad. Puro. */
export function groupEncounters(list: readonly LocationAreaEncounter[]): AreaEncounters[] {
  return list.map((a) => {
    const merged = new Map<string, EncounterRow>();
    const versions = [...a.version_details].sort((x, y) => idOf(x.version) - idOf(y.version));
    for (const v of versions) {
      for (const d of v.encounter_details) {
        const conditions = [...d.condition_values].sort((x, y) => x.name.localeCompare(y.name));
        const key = [v.version.name, d.method.name, d.min_level, d.max_level, conditions.map((c) => c.name).join(',')].join('|');
        const hit = merged.get(key);
        if (hit) hit.chance += d.chance;
        else merged.set(key, { version: v.version, method: d.method, min: d.min_level, max: d.max_level, chance: d.chance, conditions });
      }
    }
    return { area: a.location_area, rows: [...merged.values()] };
  });
}

export function Encuentros({ pokemon }: { pokemon: Pokemon }) {
  const q = useQuery(encountersQuery(pokemon.id));
  const areas = useMemo(() => (q.data ? groupEncounters(q.data) : null), [q.data]);
  const e = es.pokemon.encounters;
  return (
    <Section title={es.pokemon.tabs.encuentros}>
      {q.isError ? <ErrorPanel level={2} code={displayCode(q.error)} onRetry={() => void q.refetch()} />
        : !areas ? <SkeletonRegion><Skeleton height="200px" /></SkeletonRegion>
        : areas.length === 0 ? <EmptyState message={es.empty.noWild} icon="mundo" />
        : (
          <div className={styles.tabStack}>
            {areas.map((a) => {
              const rows: MiniTableRow[] = a.rows.map((r, i) => ({
                key: i,
                cells: [
                  <RefLabel key="v" resource={r.version} />,
                  <RefLabel key="m" resource={r.method} />,
                  e.levelRange(r.min, r.max),
                  e.percent(r.chance),
                  r.conditions.length === 0 ? es.app.dash : (
                    <span className={styles.inlineList}>
                      {r.conditions.map((c, j) => <Fragment key={c.name}>{j > 0 ? ', ' : ''}<RefLabel resource={c} /></Fragment>)}
                    </span>
                  ),
                ],
              }));
              return (
                <div key={a.area.name} className={styles.area}>
                  <h3 className={styles.areaTitle}><ResourceLink resource={a.area} labelMode="slug" /></h3>
                  <MiniTable
                    caption={e.caption(formatSlug(a.area.name))}
                    captionHidden
                    columns={[
                      { key: 'version', label: e.version },
                      { key: 'method', label: e.method },
                      { key: 'levels', label: e.levels, numeric: true },
                      { key: 'chance', label: e.chance, numeric: true },
                      { key: 'conditions', label: e.conditions },
                    ]}
                    rows={rows}
                    virtualize
                  />
                </div>
              );
            })}
          </div>
        )}
    </Section>
  );
}
