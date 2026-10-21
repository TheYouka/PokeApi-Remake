// Renderers del grupo Juegos (§7.3 filas 14–17).
import { Link } from 'react-router';
import { toBcp47 } from '../../../api/localize';
import type { Generation, Pokedex, PokemonEntry, Version, VersionGroup } from '../../../api/types/games';
import { useLocalizedLabel } from '../../../data/hooks';
import { refHref } from '../../../data/links';
import { pokemonSprite } from '../../../data/sprites';
import { es } from '../../../i18n/es';
import { FactGrid } from '../../../ui/data/FactGrid';
import { PokemonRefGrid } from '../../../ui/data/PokemonRefGrid';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { SpriteImage } from '../../../ui/SpriteImage';
import { VirtualList } from '../../../ui/VirtualList';
import { ChipsSection, DescriptionSection, RefOr, idOf, num, styles, yesNo } from './shared';

const ENTRY_ROW = 56;

export function GenerationDetail({ data }: { data: Generation }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: es.detail.games.mainRegion, value: <ResourceLink resource={data.main_region} /> }]} />
      </Section>
      <ChipsSection title={es.detail.versionGroups} refs={data.version_groups} mode="versions" />
      <Section title={es.detail.species}>
        <PokemonRefGrid refs={[...data.pokemon_species].sort((a, b) => idOf(a) - idOf(b))} ariaLabel={es.detail.species} />
      </Section>
      <ChipsSection title={es.detail.types} refs={data.types} sort />
      <ChipsSection title={es.detail.abilities} refs={data.abilities} sort />
      <ChipsSection title={es.detail.moves} refs={data.moves} sort />
    </>
  );
}

function EntryRow({ entry }: { entry: PokemonEntry }) {
  const species = entry.pokemon_species;
  const id = idOf(species);
  const label = useLocalizedLabel(species, 'slug');
  const href = refHref(species, 'grid');
  const body = (
    <>
      <span className={styles.entryNum}>{es.detail.games.entryNumber(entry.entry_number)}</span>
      <SpriteImage src={id > 0 && id <= 10000 ? pokemonSprite(id) : null} alt="" width={48} height={48} pixelated />
      <span lang={label.lang ? toBcp47(label.lang) : undefined}>{label.text}</span>
    </>
  );
  return href
    ? <Link to={href} viewTransition data-nav="" data-focus-id={`entry:${entry.entry_number}:${id}`} className={styles.entry}>{body}</Link>
    : <span className={styles.entry}>{body}</span>;
}

export function PokedexDetail({ data }: { data: Pokedex }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: es.detail.region, value: <RefOr r={data.region} /> },
          { label: es.detail.mainSeries, value: yesNo(data.is_main_series) },
        ]} />
      </Section>
      <DescriptionSection entries={data.descriptions} />
      <ChipsSection title={es.detail.versionGroups} refs={data.version_groups} mode="versions" />
      <Section title={es.detail.games.entries}>
        <VirtualList
          items={data.pokemon_entries}
          rowHeight={ENTRY_ROW}
          ariaLabel={es.detail.games.entries}
          getKey={(e) => `${e.entry_number}|${e.pokemon_species.name}`}
          renderItem={(e) => <EntryRow entry={e} />}
        />
      </Section>
    </>
  );
}

export function VersionDetail({ data }: { data: Version }) {
  return (
    <Section title={es.detail.info}>
      <FactGrid facts={[{ label: es.detail.versionGroup, value: <ResourceLink resource={data.version_group} labelMode="versions" /> }]} />
    </Section>
  );
}

export function VersionGroupDetail({ data }: { data: VersionGroup }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: es.detail.generation, value: <ResourceLink resource={data.generation} /> },
          { label: es.detail.order, value: num(data.order) },
        ]} />
      </Section>
      <ChipsSection title={es.detail.versions} refs={data.versions} />
      <ChipsSection title={es.detail.regions} refs={data.regions} />
      <ChipsSection title={es.detail.pokedexes} refs={data.pokedexes} />
      <ChipsSection title={es.detail.learnMethods} refs={data.move_learn_methods} />
    </>
  );
}
