// Pestaña Formas (§13.2): variedades (enlaces a sus fichas) y formas (pokemon.forms, tarjetas con los
// sprites de pokemon-form, que se piden cuando la tarjeta es visible).
import { useRef } from 'react';
import { pickName, toBcp47 } from '../../../api/localize';
import type { NamedAPIResource } from '../../../api/types/common';
import type { Pokemon, PokemonSpecies } from '../../../api/types/pokemon';
import { useDataLang, useInViewDwell, useRefData } from '../../../data/hooks';
import { es } from '../../../i18n/es';
import { formatSlug } from '../../../i18n/format';
import { PokemonRefGrid } from '../../../ui/data/PokemonRefGrid';
import { Section } from '../../../ui/data/Section';
import { SpriteImage } from '../../../ui/SpriteImage';
import { TypeBadge } from '../../../ui/TypeBadge';
import styles from '../PokemonScreen.module.css';

function FormCard({ form }: { form: NamedAPIResource<'pokemon-form'> }) {
  const ref = useRef<HTMLLIElement>(null);
  const lang = useDataLang();
  const visible = useInViewDwell(ref);
  const q = useRefData(form, { enabled: visible });
  const f = q.data;
  const names = f && f.form_names.length > 0 ? f.form_names : f?.names;
  const label = f && names && names.length > 0 ? pickName(names, lang, form.name) : { text: formatSlug(form.name), lang: null };
  return (
    <li ref={ref} className={styles.formCard}>
      <SpriteImage src={f?.sprites.front_default ?? null} alt="" width={96} height={96} pixelated />
      <span className={styles.formName} lang={label.lang ? toBcp47(label.lang) : undefined}>{label.text}</span>
      {f ? (
        <span className={styles.typeRow}>
          {f.types.map((t) => <TypeBadge key={t.type.name} type={t.type} size="small" />)}
          {f.is_mega ? <span className={styles.flag}>{es.pokemon.forms.mega}</span> : null}
          {f.is_battle_only ? <span className={styles.flag}>{es.pokemon.forms.battleOnly}</span> : null}
          {f.is_default ? <span className={styles.flag}>{es.pokemon.forms.default}</span> : null}
        </span>
      ) : null}
    </li>
  );
}

export function Formas({ pokemon, species }: { pokemon: Pokemon; species: PokemonSpecies | undefined }) {
  const varieties = species?.varieties.map((v) => v.pokemon) ?? [];
  return (
    <div className={styles.tabGrid}>
      <Section title={es.pokemon.sections.varieties}>
        {varieties.length <= 1
          ? <p className={styles.muted}>{es.pokemon.forms.none}</p>
          : <PokemonRefGrid refs={varieties} ariaLabel={es.pokemon.sections.varieties} />}
      </Section>
      <Section title={es.pokemon.sections.forms}>
        <ul role="list" className={styles.forms}>
          {pokemon.forms.map((f) => <FormCard key={f.name} form={f} />)}
        </ul>
      </Section>
    </div>
  );
}
