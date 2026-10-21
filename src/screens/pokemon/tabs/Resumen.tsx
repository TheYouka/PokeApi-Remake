// Pestaña Resumen (§13.2): stats, datos básicos, habilidades, efectividad defensiva, descripción,
// números de Pokédex (por slug: 0 peticiones) y objetos que puede llevar (etiquetas al ser visibles).
import { useQueries } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { formatSlug, pickEffect, pickName, toBcp47 } from '../../../api/localize';
import type { NamedAPIResource } from '../../../api/types/common';
import type { Pokemon, PokemonAbility, PokemonSpecies, Type } from '../../../api/types/pokemon';
import { defensiveGroups } from '../../../data/effectiveness';
import { useDataLang, useInViewDwell, useLocalizedLabel, useRefData } from '../../../data/hooks';
import { refHref } from '../../../data/links';
import { refQuery } from '../../../data/queries';
import { itemSprite } from '../../../data/sprites';
import { es } from '../../../i18n/es';
import { dmToM, formatGenderRate, formatNumber, hgToKg } from '../../../i18n/format';
import { DamageRelations } from '../../../ui/data/DamageRelations';
import { FactGrid, type Fact } from '../../../ui/data/FactGrid';
import { FlavorTextPicker } from '../../../ui/data/FlavorTextPicker';
import { LangBadge } from '../../../ui/data/LocalizedText';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { Skeleton } from '../../../ui/Skeleton';
import { SpriteImage } from '../../../ui/SpriteImage';
import { StatBars, statValues } from '../../../ui/StatBars';
import styles from '../PokemonScreen.module.css';

const dash = es.app.dash;
const num = (n: number | null | undefined) => (n === null || n === undefined ? dash : formatNumber(n));

function AbilityRow({ a }: { a: PokemonAbility }) {
  const ref = useRef<HTMLLIElement>(null);
  const lang = useDataLang();
  const visible = useInViewDwell(ref);
  const q = useRefData(a.ability, { enabled: visible });
  const name = q.data ? pickName(q.data.names, lang, a.ability.name) : null;
  const effect = q.data ? pickEffect(q.data.effect_entries, lang) : null;
  const href = refHref(a.ability, 'chip');
  const label = name?.text ?? formatSlug(a.ability.name);
  return (
    <li ref={ref} className={styles.ability}>
      <span className={styles.abilityHead}>
        {href ? (
          <Link to={href} viewTransition className={styles.abilityName} lang={name?.lang ? toBcp47(name.lang) : undefined}>{label}</Link>
        ) : <span className={styles.abilityName}>{label}</span>}
        {a.is_hidden ? <span className={styles.flag}>{es.blocks.hidden}</span> : null}
      </span>
      {effect ? (
        <span className={styles.abilityEffect} lang={effect.lang ? toBcp47(effect.lang) : undefined}>
          {effect.short ?? effect.text}
          {effect.lang && effect.lang !== 'es' ? <LangBadge code={effect.lang} /> : null}
        </span>
      ) : q.isPending ? <Skeleton width="70%" height="1em" /> : null}
    </li>
  );
}

function DexNumber({ entry }: { entry: PokemonSpecies['pokedex_numbers'][number] }) {
  const label = useLocalizedLabel(entry.pokedex, 'slug');
  return (
    <li className={styles.dexEntry}>
      <span className="tabular">{`#${entry.entry_number}`}</span>
      <span lang={label.lang ? toBcp47(label.lang) : undefined}>{label.text}</span>
    </li>
  );
}

function Defense({ pokemon }: { pokemon: Pokemon }) {
  const queries = useQueries({ queries: pokemon.types.map((t) => ({ ...refQuery(t.type, 'high') })) });
  const loaded = queries.every((q) => q.data);
  const details = queries.map((q) => q.data).filter((d): d is Type => d !== undefined);
  const groups = useMemo(() => (loaded ? defensiveGroups(details) : null), [loaded, details.map((d) => d.id).join()]);
  if (queries.some((q) => q.isError)) return <p className={styles.muted}>{es.errors.unavailable}</p>;
  if (!groups) return <Skeleton height="6em" />;
  return <DamageRelations groups={groups} />;
}

export function Resumen({ pokemon, species, speciesError }: { pokemon: Pokemon; species: PokemonSpecies | undefined; speciesError: unknown }) {
  const s = species;
  const link = (r: NamedAPIResource | null | undefined) =>
    (r ? <ResourceLink resource={r} /> : dash);
  const facts: Fact[] = [
    { label: es.pokemon.facts.height, value: dmToM(pokemon.height) },
    { label: es.pokemon.facts.weight, value: hgToKg(pokemon.weight) },
    { label: es.pokemon.facts.baseExp, value: num(pokemon.base_experience) },
  ];
  if (s) {
    facts.push(
      { label: es.pokemon.facts.capture, value: num(s.capture_rate) },
      { label: es.pokemon.facts.happiness, value: num(s.base_happiness) },
      { label: es.pokemon.facts.hatch, value: num(s.hatch_counter) },
      { label: es.pokemon.facts.gender, value: formatGenderRate(s.gender_rate) },
      {
        label: es.pokemon.facts.eggGroups,
        value: s.egg_groups.length === 0 ? dash : (
          <span className={styles.inlineList}>{s.egg_groups.map((g) => <ResourceLink key={g.name} resource={g} />)}</span>
        ),
      },
      { label: es.pokemon.facts.growth, value: link(s.growth_rate) },
      { label: es.pokemon.facts.color, value: link(s.color) },
      { label: es.pokemon.facts.shape, value: link(s.shape) },
      { label: es.pokemon.facts.habitat, value: link(s.habitat) },
      { label: es.pokemon.facts.generation, value: link(s.generation) },
    );
  }
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);

  return (
    <div className={styles.tabGrid}>
      <Section title={es.pokemon.sections.stats}>
        <StatBars values={statValues(pokemon.stats)} />
      </Section>
      <Section title={es.pokemon.sections.basics}>
        <FactGrid facts={facts} />
        {!s && !speciesError ? <Skeleton height="4em" /> : null}
        {speciesError ? <p className={styles.muted}>{es.errors.unavailable}</p> : null}
      </Section>
      <Section title={es.pokemon.sections.abilities}>
        <ul role="list" className={styles.abilities}>
          {abilities.map((a) => <AbilityRow key={a.ability.name} a={a} />)}
        </ul>
      </Section>
      <Section title={es.pokemon.sections.defense}>
        <Defense pokemon={pokemon} />
      </Section>
      <Section title={es.pokemon.sections.flavor}>
        {s ? <FlavorTextPicker entries={s.flavor_text_entries} by="version" /> : <Skeleton height="4em" />}
      </Section>
      {s && s.pokedex_numbers.length > 0 ? (
        <Section title={es.pokemon.sections.dex}>
          <ul role="list" className={styles.dexList}>
            {s.pokedex_numbers.map((e) => <DexNumber key={e.pokedex.name} entry={e} />)}
          </ul>
        </Section>
      ) : null}
      <Section title={es.pokemon.sections.held}>
        {pokemon.held_items.length === 0 ? <p className={styles.muted}>{es.pokemon.noHeld}</p> : (
          <ul role="list" className={styles.held}>
            {pokemon.held_items.map((h) => (
              <li key={h.item.name} className={styles.heldItem}>
                <SpriteImage src={itemSprite(h.item.name)} alt="" width={40} height={40} pixelated />
                <ResourceLink resource={h.item} />
                <span className={styles.muted}>{es.pokemon.heldRarity(h.version_details.length)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
