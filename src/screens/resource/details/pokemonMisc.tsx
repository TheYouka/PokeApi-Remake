// Renderers del grupo Pokémon (§7.3 filas 35–49 salvo la 42, cuyo detalle es PokemonScreen).
import { Link } from 'react-router';
import { formatSlug, pickGenus, toBcp47 } from '../../../api/localize';
import type {
  Ability, Characteristic, EggGroup, Gender, GrowthRate, Nature, PokeathlonStat, PokemonColor, PokemonForm,
  PokemonHabitat, PokemonShape, PokemonSpecies, Stat, Type,
} from '../../../api/types/pokemon';
import { useDataLang } from '../../../data/hooks';
import { typeIcon } from '../../../data/sprites';
import { es } from '../../../i18n/es';
import { formatGenderRate, formatNumber } from '../../../i18n/format';
import { ChartFrame } from '../../../ui/charts/ChartFrame';
import { LineChart } from '../../../ui/charts/LineChart';
import { POKEMON_COLORS, type PokemonColorName } from '../../../ui/colors';
import { DamageRelations } from '../../../ui/data/DamageRelations';
import { EffectText } from '../../../ui/data/EffectText';
import { FactGrid, type Fact } from '../../../ui/data/FactGrid';
import { FlavorTextPicker } from '../../../ui/data/FlavorTextPicker';
import { LocalizedText } from '../../../ui/data/LocalizedText';
import { MiniTable, type MiniTableRow } from '../../../ui/data/MiniTable';
import { PokemonRefGrid } from '../../../ui/data/PokemonRefGrid';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { Icon } from '../../../ui/icons';
import { SpriteImage } from '../../../ui/SpriteImage';
import { TypeBadge } from '../../../ui/TypeBadge';
import {
  ChipsSection, DescriptionSection, DescriptionText, EffectChangesSection, RefOr, dash, idOf, num, pct, styles, yesNo,
} from './shared';

const byRefId = <T,>(get: (x: T) => { url: string }) => (a: T, b: T) => idOf(get(a)) - idOf(get(b));

function SpeciesGrid({ refs, title = es.detail.species }: { refs: PokemonColor['pokemon_species']; title?: string }) {
  return (
    <Section title={title}>
      <PokemonRefGrid refs={[...refs].sort(byRefId((r) => r))} ariaLabel={title} />
    </Section>
  );
}

// ---------------------------------------------------------------- ability (35)
export function AbilityDetail({ data }: { data: Ability }) {
  const holders = [...data.pokemon].sort(byRefId((p) => p.pokemon));
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: es.detail.generation, value: <ResourceLink resource={data.generation} /> },
          { label: es.detail.mainSeries, value: yesNo(data.is_main_series) },
        ]} />
      </Section>
      <Section title={es.detail.effect}><EffectText entries={data.effect_entries} /></Section>
      <EffectChangesSection changes={data.effect_changes} />
      <Section title={es.detail.flavor}><FlavorTextPicker entries={data.flavor_text_entries} by="version-group" /></Section>
      <Section title={es.detail.pokemon}>
        <PokemonRefGrid
          refs={holders.map((h) => h.pokemon)}
          ariaLabel={es.detail.pokemon}
          badge={(_r, i) => (holders[i]?.is_hidden ? <span className={styles.flag}>{es.blocks.hidden}</span> : null)}
        />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- characteristic (36)
export function CharacteristicDetail({ data }: { data: Characteristic }) {
  const c = es.detail.characteristic;
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: c.geneModulo, value: num(data.gene_modulo) },
          { label: c.possibleValues, value: data.possible_values.map((v) => formatNumber(v)).join(', ') || dash },
          { label: c.highestStat, value: <ResourceLink resource={data.highest_stat} /> },
        ]} />
      </Section>
      <Section title={es.detail.descriptions}><DescriptionText entries={data.descriptions} /></Section>
    </>
  );
}

// ---------------------------------------------------------------- egg-group (37)
export function EggGroupDetail({ data }: { data: EggGroup }) {
  return <SpeciesGrid refs={data.pokemon_species} />;
}

// ---------------------------------------------------------------- gender (38)
const femaleRatio = (rate: number): string => (rate < 0
  ? es.detail.gender.genderless
  : es.detail.gender.female(formatNumber((rate / 8) * 100, { maximumFractionDigits: 1 })));

export function GenderDetail({ data }: { data: Gender }) {
  const g = es.detail.gender;
  const rows: MiniTableRow[] = [...data.pokemon_species_details]
    .sort(byRefId((d) => d.pokemon_species))
    .map((d) => ({
      key: d.pokemon_species.name,
      cells: [<ResourceLink key="s" resource={d.pokemon_species} labelMode="slug" />, femaleRatio(d.rate)],
    }));
  return (
    <>
      <Section title={g.ratioTable}>
        <MiniTable
          caption={g.ratioTable}
          captionHidden
          columns={[{ key: 's', label: es.detail.species }, { key: 'r', label: g.ratio }]}
          rows={rows}
          virtualize
        />
      </Section>
      <SpeciesGrid refs={data.required_for_evolution} title={g.requiredForEvolution} />
    </>
  );
}

// ---------------------------------------------------------------- growth-rate (39)
export function GrowthRateDetail({ data }: { data: GrowthRate }) {
  const gr = es.detail.growth;
  const levels = [...data.levels].sort((a, b) => a.level - b.level);
  const max = levels.at(-1)?.experience ?? 0;
  const name = formatSlug(data.name);
  return (
    <>
      <Section title={gr.formula}>
        <code className={styles.code}>{data.formula}</code>
      </Section>
      <DescriptionSection entries={data.descriptions} />
      <Section title={gr.chartTitle}>
        <ChartFrame
          headingLevel={3}
          title={gr.chartTitle}
          description={gr.chartDesc(name, formatNumber(max))}
          fileName={`ritmo-${data.name}`}
          table={{
            caption: gr.chartTitle,
            columns: [{ key: 'level', label: gr.level, numeric: true }, { key: 'experience', label: gr.experience, numeric: true }],
            rows: levels.map((l) => ({ level: l.level, experience: l.experience })),
          }}
        >
          {(a11y) => (
            <LineChart a11y={a11y} points={levels.map((l) => ({ x: l.level, y: l.experience }))} xLabel={gr.level} yLabel={gr.experience} />
          )}
        </ChartFrame>
      </Section>
      <SpeciesGrid refs={data.pokemon_species} />
    </>
  );
}

// ---------------------------------------------------------------- nature (40)
export function NatureDetail({ data }: { data: Nature }) {
  const n = es.detail.nature;
  const pokeathlon: MiniTableRow[] = data.pokeathlon_stat_changes.map((c) => ({
    key: c.pokeathlon_stat.name,
    cells: [<ResourceLink key="p" resource={c.pokeathlon_stat} />, es.detail.signed(c.max_change)],
  }));
  const styleRows: MiniTableRow[] = data.move_battle_style_preferences.map((p) => ({
    key: p.move_battle_style.name,
    cells: [<ResourceLink key="s" resource={p.move_battle_style} />, pct(p.low_hp_preference), pct(p.high_hp_preference)],
  }));
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: n.increased, value: <RefOr r={data.increased_stat} /> },
          { label: n.decreased, value: <RefOr r={data.decreased_stat} /> },
          { label: n.likes, value: <RefOr r={data.likes_flavor} /> },
          { label: n.hates, value: <RefOr r={data.hates_flavor} /> },
        ]} />
      </Section>
      {pokeathlon.length > 0 ? (
        <Section title={n.pokeathlon}>
          <MiniTable caption={n.pokeathlon} captionHidden rows={pokeathlon}
            columns={[{ key: 'p', label: es.resources['pokeathlon-stat'].singular }, { key: 'c', label: n.maxChange, numeric: true }]} />
        </Section>
      ) : null}
      {styleRows.length > 0 ? (
        <Section title={n.battleStyles}>
          <MiniTable caption={n.battleStyles} captionHidden rows={styleRows}
            columns={[{ key: 's', label: n.style }, { key: 'l', label: n.lowHp, numeric: true }, { key: 'h', label: n.highHp, numeric: true }]} />
        </Section>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- pokeathlon-stat (41)
export function PokeathlonStatDetail({ data }: { data: PokeathlonStat }) {
  const n = es.detail.nature;
  const table = (title: string, list: PokeathlonStat['affecting_natures']['increase']) => (
    <Section title={title}>
      {list.length === 0 ? <p className={styles.muted}>{es.blocks.none}</p> : (
        <MiniTable caption={title} captionHidden
          columns={[{ key: 'n', label: es.resources.nature.singular }, { key: 'c', label: n.maxChange, numeric: true }]}
          rows={list.map((x) => ({ key: x.nature.name, cells: [<ResourceLink key="n" resource={x.nature} />, es.detail.signed(x.max_change)] }))} />
      )}
    </Section>
  );
  return (
    <>
      {table(n.increase, data.affecting_natures.increase)}
      {table(n.decrease, data.affecting_natures.decrease)}
    </>
  );
}

// ---------------------------------------------------------------- pokemon-color (43)
export function PokemonColorDetail({ data }: { data: PokemonColor }) {
  const hex = Object.hasOwn(POKEMON_COLORS, data.name) ? POKEMON_COLORS[data.name as PokemonColorName] : null;
  return (
    <>
      <Section title={es.detail.color.swatch}>
        {hex ? (
          <div className={styles.media}>
            <span className={`${styles.swatch} ${styles.swatchLarge}`} style={{ background: hex }} aria-hidden="true" />
            <span className="tabular">{hex}</span>
          </div>
        ) : <p className={styles.muted}>{dash}</p>}
      </Section>
      <SpeciesGrid refs={data.pokemon_species} />
    </>
  );
}

// ---------------------------------------------------------------- pokemon-form (44)
export function PokemonFormDetail({ data }: { data: PokemonForm }) {
  const f = es.detail.form;
  const sprites = [
    { key: 'front', label: f.front, src: data.sprites.front_default },
    { key: 'back', label: f.back, src: data.sprites.back_default },
    { key: 'front-shiny', label: f.frontShiny, src: data.sprites.front_shiny },
    { key: 'back-shiny', label: f.backShiny, src: data.sprites.back_shiny },
  ].filter((s) => s.src);
  return (
    <>
      {sprites.length > 0 ? (
        <Section title={f.sprites}>
          <div className={styles.media}>
            {sprites.map((s) => (
              <figure key={s.key} className={styles.sprite}>
                <SpriteImage src={s.src} alt={f.spriteAlt(formatSlug(data.name), s.label)} width={96} height={96} pixelated />
                <figcaption className="caption">{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ) : null}
      <Section title={es.detail.info}>
        <div className={styles.stack}>
          <FactGrid facts={[
            {
              label: es.detail.types,
              value: <span className={styles.inline}>{[...data.types].sort((a, b) => a.slot - b.slot).map((t) => <TypeBadge key={t.type.name} type={t.type} size="small" />)}</span>,
            },
            { label: f.formName, value: data.form_name ? formatSlug(data.form_name) : dash },
            { label: f.isDefault, value: yesNo(data.is_default) },
            { label: f.isMega, value: yesNo(data.is_mega) },
            { label: f.battleOnly, value: yesNo(data.is_battle_only) },
            { label: f.formOrder, value: num(data.form_order) },
            { label: es.detail.versionGroup, value: <ResourceLink resource={data.version_group} labelMode="versions" /> },
            { label: es.detail.pokemon, value: <ResourceLink resource={data.pokemon} labelMode="slug" /> },
          ]} />
          <Link to={`/pokemon/${data.pokemon.name}`} viewTransition className={styles.primary}>
            <Icon name="pokemon" size={20} />{f.openPokemon}
          </Link>
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- pokemon-habitat (45), pokemon-shape (46)
export function PokemonHabitatDetail({ data }: { data: PokemonHabitat }) {
  return <SpeciesGrid refs={data.pokemon_species} />;
}

export function PokemonShapeDetail({ data }: { data: PokemonShape }) {
  const s = es.detail.shape;
  return (
    <>
      {data.awesome_names.length > 0 ? (
        <Section title={s.awesomeNames}>
          <MiniTable
            caption={s.awesomeNames}
            captionHidden
            columns={[{ key: 'l', label: es.detail.language }, { key: 'n', label: es.detail.name }]}
            rows={data.awesome_names.map((a, i) => ({
              key: `${a.language.name}|${i}`,
              cells: [<RefLabel key="l" resource={a.language} mode="slug" />, <span key="n" lang={toBcp47(a.language.name)}>{a.awesome_name}</span>],
            }))}
          />
        </Section>
      ) : null}
      <SpeciesGrid refs={data.pokemon_species} />
    </>
  );
}

// ---------------------------------------------------------------- pokemon-species (47)
export function PokemonSpeciesDetail({ data }: { data: PokemonSpecies }) {
  const lang = useDataLang();
  const sp = es.detail.speciesInfo;
  const pf = es.pokemon.facts;
  const genus = pickGenus(data.genera, lang);
  const def = data.varieties.find((v) => v.is_default) ?? data.varieties[0];
  const sheet = `/pokemon/${def ? def.pokemon.name : data.id}`;
  const flags: string[] = [
    data.is_legendary ? es.pokemon.legendary : null,
    data.is_mythical ? es.pokemon.mythical : null,
    data.is_baby ? es.pokemon.baby : null,
  ].flatMap((x) => (x === null ? [] : [x]));
  const facts: Fact[] = [
    { label: sp.genus, value: genus ? <LocalizedText text={genus.text} lang={genus.lang} /> : dash },
    {
      label: sp.flags,
      value: flags.length === 0 ? es.blocks.none : <span className={styles.inline}>{flags.map((f) => <span key={f} className={styles.flag}>{f}</span>)}</span>,
    },
    { label: pf.generation, value: <ResourceLink resource={data.generation} /> },
    { label: sp.evolvesFrom, value: <RefOr r={data.evolves_from_species} mode="slug" /> },
    { label: sp.chain, value: <ResourceLink resource={data.evolution_chain} labelMode="summary" /> },
    { label: pf.color, value: <ResourceLink resource={data.color} /> },
    { label: pf.shape, value: <RefOr r={data.shape} /> },
    { label: pf.habitat, value: <RefOr r={data.habitat} /> },
    { label: pf.gender, value: formatGenderRate(data.gender_rate) },
    { label: sp.genderDifferences, value: yesNo(data.has_gender_differences) },
    { label: sp.formsSwitchable, value: yesNo(data.forms_switchable) },
  ];
  const breeding: Fact[] = [
    { label: pf.capture, value: num(data.capture_rate) },
    { label: pf.happiness, value: num(data.base_happiness) },
    { label: pf.hatch, value: num(data.hatch_counter) },
    { label: pf.growth, value: <ResourceLink resource={data.growth_rate} /> },
    {
      label: pf.eggGroups,
      value: data.egg_groups.length === 0 ? dash : <span className={styles.inline}>{data.egg_groups.map((g) => <ResourceLink key={g.name} resource={g} />)}</span>,
    },
  ];
  return (
    <>
      <Section title={es.detail.info}>
        <div className={styles.stack}>
          <Link to={sheet} viewTransition className={styles.primary} data-focus-id={`species-sheet:${data.id}`}>
            <Icon name="pokemon" size={20} />{sp.fullSheet}
          </Link>
          <FactGrid facts={facts} />
        </div>
      </Section>
      <Section title={sp.breeding}><FactGrid facts={breeding} /></Section>
      <Section title={es.detail.flavor}><FlavorTextPicker entries={data.flavor_text_entries} by="version" /></Section>
      <Section title={sp.varieties}>
        <PokemonRefGrid
          refs={data.varieties.map((v) => v.pokemon)}
          ariaLabel={sp.varieties}
          badge={(_r, i) => (data.varieties[i]?.is_default ? <span className={styles.flag}>{es.pokemon.forms.default}</span> : null)}
        />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- stat (48)
export function StatDetail({ data }: { data: Stat }) {
  const s = es.detail.stat;
  const movesTable = (title: string, list: Stat['affecting_moves']['increase']) => (
    <Section title={title}>
      {list.length === 0 ? <p className={styles.muted}>{es.blocks.none}</p> : (
        <MiniTable caption={title} captionHidden virtualize
          columns={[{ key: 'm', label: es.detail.move.move }, { key: 'c', label: es.detail.move.change, numeric: true }]}
          rows={list.map((x) => ({ key: x.move.name, cells: [<ResourceLink key="m" resource={x.move} />, es.detail.signed(x.change)] }))} />
      )}
    </Section>
  );
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: es.detail.gameIndex, value: num(data.game_index) },
          { label: s.battleOnly, value: yesNo(data.is_battle_only) },
          { label: es.detail.move.damageClass, value: <RefOr r={data.move_damage_class} /> },
        ]} />
      </Section>
      {movesTable(s.increaseMoves, data.affecting_moves.increase)}
      {movesTable(s.decreaseMoves, data.affecting_moves.decrease)}
      <ChipsSection title={s.increaseNatures} refs={data.affecting_natures.increase} />
      <ChipsSection title={s.decreaseNatures} refs={data.affecting_natures.decrease} />
      <ChipsSection title={es.detail.characteristics} refs={data.characteristics} mode="summary" sort />
    </>
  );
}

// ---------------------------------------------------------------- type (49)
export function TypeDetail({ data }: { data: Type }) {
  const ti = es.detail.typeInfo;
  const icon = typeIcon(data.id);
  const past = [...data.past_damage_relations].sort((a, b) => idOf(a.generation) - idOf(b.generation));
  return (
    <>
      <Section title={es.detail.info}>
        <div className={styles.stack}>
          {icon ? (
            <div className={styles.media}>
              <SpriteImage src={icon} alt={ti.icon(formatSlug(data.name))} width={200} height={44} />
            </div>
          ) : null}
          <FactGrid facts={[
            { label: es.detail.generation, value: <ResourceLink resource={data.generation} /> },
            { label: es.detail.move.damageClass, value: <RefOr r={data.move_damage_class} /> },
          ]} />
        </div>
      </Section>
      <Section title={ti.relations}><DamageRelations relations={data.damage_relations} /></Section>
      {past.length > 0 ? (
        <Section title={ti.pastRelations}>
          <div className={styles.stack}>
            {past.map((p) => (
              <div key={p.generation.name} className={styles.stack}>
                <h3>{ti.untilPrefix}<RefLabel resource={p.generation} /></h3>
                <DamageRelations relations={p.damage_relations} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      <Section title={es.detail.pokemon}>
        <PokemonRefGrid refs={[...data.pokemon].sort((a, b) => idOf(a.pokemon) - idOf(b.pokemon)).map((p) => p.pokemon)} ariaLabel={es.detail.pokemon} />
      </Section>
      <ChipsSection title={es.detail.moves} refs={data.moves} sort />
    </>
  );
}
