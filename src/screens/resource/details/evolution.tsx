// Renderers del grupo Evolución (§7.3 filas 11–13). EvolutionTree es el único punto de disparo de
// `branched-chain-opened`: este detalle solo tiene que montarlo (también cuenta Eeveelución aquí).
import type { EvolutionChain, EvolutionTrigger, EvolutionVariable } from '../../../api/types/evolution';
import { es } from '../../../i18n/es';
import { formatSlug } from '../../../i18n/format';
import { EvolutionTree } from '../../../ui/data/EvolutionTree';
import { FactGrid } from '../../../ui/data/FactGrid';
import { PokemonRefGrid } from '../../../ui/data/PokemonRefGrid';
import { Section } from '../../../ui/data/Section';
import { DescriptionSection, RefOr, dash } from './shared';

const e = es.detail.evolution;

export function EvolutionChainDetail({ data }: { data: EvolutionChain }) {
  return (
    <>
      <Section title={e.tree}>
        <EvolutionTree chain={data} />
      </Section>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: e.babyItem, value: <RefOr r={data.baby_trigger_item} /> }]} />
      </Section>
    </>
  );
}

export function EvolutionTriggerDetail({ data }: { data: EvolutionTrigger }) {
  return (
    <Section title={es.detail.species}>
      <PokemonRefGrid refs={data.pokemon_species} ariaLabel={es.detail.species} />
    </Section>
  );
}

export function EvolutionVariableDetail({ data }: { data: EvolutionVariable }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: e.symbol, value: data.symbol ?? dash },
          { label: e.dataType, value: data.data_type ? formatSlug(data.data_type) : dash },
          { label: e.source, value: data.source ? formatSlug(data.source) : dash },
          { label: es.detail.versionGroup, value: <RefOr r={data.version_group} mode="versions" /> },
        ]} />
      </Section>
      <DescriptionSection entries={data.descriptions} />
    </>
  );
}
