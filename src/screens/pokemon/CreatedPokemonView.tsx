// Ficha de un Pokémon creado (§13.10): silueta teñida, campos, insignia "Creado" y "Borrar" con
// ConfirmDialog. Añade la visita a recientes; NO dispara pokemon-viewed (no es un Pokémon real).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { NamedAPIResource } from '../../api/types/common';
import type { ResourceKey } from '../../api/resources';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useListAll } from '../../data/hooks';
import { es } from '../../i18n/es';
import { formatDate, formatSlug, padDex } from '../../i18n/format';
import { removeCreated, type CreatedPokemon } from '../../state/created';
import { addRecent } from '../../state/recent';
import { CreatedSilhouette, createdColor } from '../../ui/data/CreatedSilhouette';
import { FactGrid } from '../../ui/data/FactGrid';
import { ResourceLink } from '../../ui/data/ResourceLink';
import { ConfirmDialog } from '../../ui/Dialog';
import { Icon } from '../../ui/icons';
import { TypeBadge } from '../../ui/TypeBadge';
import styles from './PokemonScreen.module.css';

function useRefsOf<K extends ResourceKey>(r: K) {
  const list = useListAll(r);
  return (name: string): NamedAPIResource<K> | null =>
    (list.data?.results as NamedAPIResource<K>[] | undefined)?.find((x) => x.name === name) ?? null;
}

export function CreatedPokemonView({ pokemon }: { pokemon: CreatedPokemon }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  useDocumentTitle(pokemon.name);
  useEffect(() => {
    addRecent({ path: `/pokemon/${pokemon.id}`, title: pokemon.name, kind: 'pokemon' });
  }, [pokemon.id, pokemon.name]);

  const typeRef = useRefsOf('type');
  const colorRef = useRefsOf('pokemon-color');
  const eggRef = useRefsOf('egg-group');
  const habitatRef = useRefsOf('pokemon-habitat');
  const link = (ref: NamedAPIResource | null, name: string) => (ref ? <ResourceLink resource={ref} /> : formatSlug(name));
  const p = es.pokemon;

  return (
    <div className={styles.page}>
      <section className={styles.hero} style={{ ['--hero-color' as string]: createdColor(pokemon.color), ['--hero-glow' as string]: createdColor(pokemon.color) }} aria-labelledby="created-title">
        <div className={styles.heroMedia}>
          <div className={styles.heroImage}><CreatedSilhouette color={pokemon.color} size={320} /></div>
        </div>
        <div className={styles.heroText}>
          <p className={`${styles.dexNumber} tabular`}>{padDex(pokemon.id)}</p>
          <h1 id="created-title" tabIndex={-1} data-focus-start="" className={styles.title}>{pokemon.name}</h1>
          <p className={styles.genus}>{p.createdSubtitle}</p>
          <div className={styles.typeRow}>
            {pokemon.types.map((t) => {
              const r = typeRef(t);
              return r ? <TypeBadge key={t} type={r} /> : <span key={t} className={styles.flag}>{formatSlug(t)}</span>;
            })}
            <span className={styles.flag} data-created="">{es.blocks.created}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className={`${styles.action} ${styles.danger}`} onClick={() => setConfirm(true)}>
              <Icon name="cerrar" size={18} />{p.delete}
            </button>
          </div>
        </div>
      </section>
      <FactGrid facts={[
        { label: p.facts.color, value: link(colorRef(pokemon.color), pokemon.color) },
        { label: p.facts.eggGroups, value: <span className={styles.inlineList}>{pokemon.eggGroups.map((g) => <span key={g}>{link(eggRef(g), g)}</span>)}</span> },
        { label: p.facts.habitat, value: link(habitatRef(pokemon.habitat), pokemon.habitat) },
        { label: es.create.title, value: formatDate(pokemon.createdAt) },
      ]} />
      {confirm ? (
        <ConfirmDialog
          title={p.delete}
          message={p.deleteConfirm(pokemon.name)}
          confirmLabel={p.delete}
          // Se borra al terminar la navegación: así esta ruta nunca llega a pedir /pokemon/{id} a la API.
          onConfirm={() => { const id = pokemon.id; void Promise.resolve(navigate('/crear', { replace: true })).then(() => removeCreated(id)); }}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
