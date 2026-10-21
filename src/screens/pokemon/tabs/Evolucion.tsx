// Pestaña Evolución (§13.2): resuelve species.evolution_chain y pinta EvolutionTree. La pestaña NO
// dispara nada: el logro Eeveelución lo dispara el propio EvolutionTree (único punto de disparo).
import { displayCode } from '../../../api/errors';
import type { PokemonSpecies } from '../../../api/types/pokemon';
import { useRefData } from '../../../data/hooks';
import { es } from '../../../i18n/es';
import { EvolutionTree } from '../../../ui/data/EvolutionTree';
import { Section } from '../../../ui/data/Section';
import { ErrorPanel } from '../../../ui/ErrorPanel';
import { Skeleton, SkeletonRegion } from '../../../ui/Skeleton';

export function Evolucion({ species, speciesError }: { species: PokemonSpecies | undefined; speciesError: unknown }) {
  const chain = useRefData(species?.evolution_chain ?? null, { priority: 'high' });
  const error = speciesError ?? chain.error;
  return (
    <Section title={es.pokemon.tabs.evolucion}>
      {error ? (
        <ErrorPanel level={2} code={displayCode(error)} onRetry={() => void chain.refetch()} />
      ) : chain.data ? (
        <EvolutionTree chain={chain.data} />
      ) : (
        <SkeletonRegion><Skeleton height="240px" /></SkeletonRegion>
      )}
    </Section>
  );
}
