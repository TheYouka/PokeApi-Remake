// Renderers del grupo Lugares (§7.3 filas 23–26). La tabla de encuentros de un área se virtualiza con
// más de 60 filas (MiniTable virtualize). `region` cuenta para "Trotamundos" (lo dispara la pantalla).
import { Fragment } from 'react';
import type { Location, LocationArea, PalParkArea, Region } from '../../../api/types/locations';
import { es } from '../../../i18n/es';
import { formatNumber } from '../../../i18n/format';
import { FactGrid } from '../../../ui/data/FactGrid';
import { MiniTable, type MiniTableRow } from '../../../ui/data/MiniTable';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { ChipsSection, RefOr, dash, idOf, num, pct, styles } from './shared';

const t = es.detail.locationInfo;

export function LocationDetail({ data }: { data: Location }) {
  const rows: MiniTableRow[] = data.game_indices.map((g) => ({
    key: g.generation.name,
    cells: [<RefLabel key="g" resource={g.generation} />, formatNumber(g.game_index)],
  }));
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: es.detail.region, value: <RefOr r={data.region} /> }]} />
      </Section>
      <ChipsSection title={es.detail.areas} refs={data.areas} mode="slug" />
      {rows.length > 0 ? (
        <Section title={es.detail.gameIndices}>
          <MiniTable
            caption={es.detail.gameIndices}
            captionHidden
            columns={[{ key: 'g', label: es.detail.generation }, { key: 'i', label: es.detail.gameIndex, numeric: true }]}
            rows={rows}
          />
        </Section>
      ) : null}
    </>
  );
}

export function LocationAreaDetail({ data }: { data: LocationArea }) {
  const rates: MiniTableRow[] = data.encounter_method_rates.flatMap((m) =>
    [...m.version_details].sort((a, b) => idOf(a.version) - idOf(b.version)).map((v) => ({
      key: `${m.encounter_method.name}|${v.version.name}`,
      cells: [<RefLabel key="m" resource={m.encounter_method} />, <RefLabel key="v" resource={v.version} />, pct(v.rate)],
    })));
  const encounters: MiniTableRow[] = data.pokemon_encounters.flatMap((p) =>
    p.version_details.flatMap((v) => v.encounter_details.map((d, i) => ({
      key: `${p.pokemon.name}|${v.version.name}|${i}`,
      cells: [
        <ResourceLink key="p" resource={p.pokemon} labelMode="slug" />,
        <RefLabel key="v" resource={v.version} />,
        <RefLabel key="m" resource={d.method} />,
        es.detail.range(d.min_level, d.max_level),
        pct(d.chance),
        d.condition_values.length === 0 ? dash : (
          <span key="c">
            {d.condition_values.map((c, j) => <Fragment key={c.name}>{j > 0 ? ', ' : ''}<RefLabel resource={c} /></Fragment>)}
          </span>
        ),
      ],
    }))));
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: es.detail.location, value: <ResourceLink resource={data.location} /> },
          { label: es.detail.gameIndex, value: num(data.game_index) },
        ]} />
      </Section>
      <Section title={t.rates}>
        {rates.length === 0 ? <p className={styles.muted}>{es.blocks.none}</p> : (
          <MiniTable
            caption={t.rates}
            captionHidden
            columns={[{ key: 'm', label: t.method }, { key: 'v', label: es.detail.version }, { key: 'r', label: t.rate, numeric: true }]}
            rows={rates}
            virtualize
          />
        )}
      </Section>
      <Section title={t.encounters}>
        {encounters.length === 0 ? <p className={styles.muted}>{es.empty.noWild}</p> : (
          <MiniTable
            caption={t.encounters}
            captionHidden
            columns={[
              { key: 'p', label: es.detail.pokemon },
              { key: 'v', label: es.detail.version },
              { key: 'm', label: t.method },
              { key: 'l', label: t.levels, numeric: true },
              { key: 'c', label: t.chance, numeric: true },
              { key: 'x', label: t.conditions },
            ]}
            rows={encounters}
            virtualize
          />
        )}
      </Section>
    </>
  );
}

export function PalParkAreaDetail({ data }: { data: PalParkArea }) {
  const rows: MiniTableRow[] = [...data.pokemon_encounters]
    .sort((a, b) => idOf(a.pokemon_species) - idOf(b.pokemon_species))
    .map((e) => ({
      key: e.pokemon_species.name,
      cells: [<ResourceLink key="s" resource={e.pokemon_species} labelMode="slug" />, formatNumber(e.base_score), formatNumber(e.rate)],
    }));
  return (
    <Section title={es.detail.species}>
      <MiniTable
        caption={es.detail.species}
        captionHidden
        columns={[
          { key: 's', label: es.detail.species },
          { key: 'b', label: t.baseScore, numeric: true },
          { key: 'r', label: t.rate, numeric: true },
        ]}
        rows={rows}
        virtualize
      />
    </Section>
  );
}

export function RegionDetail({ data }: { data: Region }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: t.mainGeneration, value: <RefOr r={data.main_generation} /> }]} />
      </Section>
      <ChipsSection title={es.detail.locations} refs={data.locations} sort />
      <ChipsSection title={es.detail.pokedexes} refs={data.pokedexes} />
      <ChipsSection title={es.detail.versionGroups} refs={data.version_groups} mode="versions" />
    </>
  );
}
