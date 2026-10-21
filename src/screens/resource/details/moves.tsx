// Renderers del grupo Movimientos (§7.3 filas 28–34). `move-ailment/none` tiene 703 movimientos: los
// RefChips aplican el pliegue de 48 + "Ver todos (N)" con la lista virtualizada en su contenedor.
import type { NamedAPIResource } from '../../../api/types/common';
import type {
  ContestComboDetail, Move, MoveAilment, MoveBattleStyle, MoveCategory, MoveDamageClass, MoveLearnMethod, MoveTarget,
} from '../../../api/types/moves';
import { es } from '../../../i18n/es';
import { formatNumber } from '../../../i18n/format';
import { EffectText } from '../../../ui/data/EffectText';
import { FactGrid } from '../../../ui/data/FactGrid';
import { FlavorTextPicker } from '../../../ui/data/FlavorTextPicker';
import { MiniTable, type MiniTableRow } from '../../../ui/data/MiniTable';
import { PokemonRefGrid } from '../../../ui/data/PokemonRefGrid';
import { RefChips } from '../../../ui/data/RefChips';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { TypeBadge } from '../../../ui/TypeBadge';
import {
  ChipsSection, DescriptionSection, EffectChangesSection, RefOr, dash, idOf, nullableRange, num, pct, styles,
} from './shared';

const m = es.detail.move;
const pctOrDash = (n: number | null) => (n === null ? dash : pct(n));

function Combos({ title, combo }: { title: string; combo: ContestComboDetail }) {
  const before: readonly NamedAPIResource[] = combo.use_before ?? [];
  const after: readonly NamedAPIResource[] = combo.use_after ?? [];
  if (before.length === 0 && after.length === 0) return null;
  return (
    <div className={styles.stack}>
      <h3>{title}</h3>
      {before.length > 0 ? (<><p className={styles.muted}>{m.useBefore}</p><RefChips refs={before} label={`${title} · ${m.useBefore}`} /></>) : null}
      {after.length > 0 ? (<><p className={styles.muted}>{m.useAfter}</p><RefChips refs={after} label={`${title} · ${m.useAfter}`} /></>) : null}
    </div>
  );
}

export function MoveDetail({ data }: { data: Move }) {
  const meta = data.meta;
  const statRows: MiniTableRow[] = data.stat_changes.map((s) => ({
    key: s.stat.name,
    cells: [<ResourceLink key="s" resource={s.stat} />, es.detail.signed(s.change)],
  }));
  const machineRows: MiniTableRow[] = [...data.machines]
    .sort((a, b) => idOf(a.version_group) - idOf(b.version_group))
    .map((x) => ({
      key: x.machine.url,
      cells: [<ResourceLink key="m" resource={x.machine} labelMode="summary" />, <RefLabel key="g" resource={x.version_group} mode="versions" />],
    }));
  const pastRows: MiniTableRow[] = data.past_values.map((p) => ({
    key: p.version_group.name,
    cells: [
      <RefLabel key="g" resource={p.version_group} mode="versions" />,
      num(p.power),
      num(p.accuracy),
      num(p.pp),
      pctOrDash(p.effect_chance),
      p.type ? <TypeBadge key="t" type={p.type} size="small" /> : dash,
    ],
  }));
  const hasContest = data.contest_type !== null || data.contest_effect !== null || data.super_contest_effect !== null || data.contest_combos !== null;
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: es.detail.type, value: <TypeBadge type={data.type} /> },
          { label: m.damageClass, value: <ResourceLink resource={data.damage_class} /> },
          { label: m.power, value: num(data.power) },
          { label: m.accuracy, value: num(data.accuracy) },
          { label: m.pp, value: num(data.pp) },
          { label: m.priority, value: es.detail.signed(data.priority) },
          { label: m.target, value: <ResourceLink resource={data.target} /> },
          { label: m.effectChance, value: pctOrDash(data.effect_chance) },
          { label: es.detail.generation, value: <ResourceLink resource={data.generation} /> },
        ]} />
      </Section>
      <Section title={es.detail.effect}><EffectText entries={data.effect_entries} effectChance={data.effect_chance} /></Section>
      <EffectChangesSection changes={data.effect_changes} />
      <Section title={es.detail.flavor}><FlavorTextPicker entries={data.flavor_text_entries} by="version-group" /></Section>
      {meta ? (
        <Section title={m.meta}>
          <FactGrid facts={[
            { label: m.ailment, value: <ResourceLink resource={meta.ailment} /> },
            { label: m.category, value: <ResourceLink resource={meta.category} /> },
            { label: m.hits, value: nullableRange(meta.min_hits, meta.max_hits) },
            { label: m.turns, value: nullableRange(meta.min_turns, meta.max_turns) },
            { label: m.drain, value: pct(meta.drain) },
            { label: m.healing, value: pct(meta.healing) },
            { label: m.critRate, value: num(meta.crit_rate) },
            { label: m.ailmentChance, value: pct(meta.ailment_chance) },
            { label: m.flinchChance, value: pct(meta.flinch_chance) },
            { label: m.statChance, value: pct(meta.stat_chance) },
          ]} />
        </Section>
      ) : null}
      {statRows.length > 0 ? (
        <Section title={m.statChanges}>
          <MiniTable
            caption={m.statChanges}
            captionHidden
            columns={[{ key: 's', label: m.stat }, { key: 'c', label: m.change, numeric: true }]}
            rows={statRows}
          />
        </Section>
      ) : null}
      {hasContest ? (
        <Section title={m.contests}>
          <div className={styles.stack}>
            <FactGrid facts={[
              { label: m.contestType, value: <RefOr r={data.contest_type} /> },
              { label: m.contestEffect, value: <RefOr r={data.contest_effect} mode="summary" /> },
              { label: m.superContestEffect, value: <RefOr r={data.super_contest_effect} mode="summary" /> },
            ]} />
            {data.contest_combos ? (
              <>
                <Combos title={m.normalCombos} combo={data.contest_combos.normal} />
                <Combos title={m.superCombos} combo={data.contest_combos.super} />
              </>
            ) : null}
          </div>
        </Section>
      ) : null}
      {machineRows.length > 0 ? (
        <Section title={es.detail.itemInfo.machines}>
          <MiniTable
            caption={es.detail.itemInfo.machines}
            captionHidden
            columns={[{ key: 'm', label: es.detail.itemInfo.machine }, { key: 'g', label: es.detail.versionGroup }]}
            rows={machineRows}
            virtualize
          />
        </Section>
      ) : null}
      {pastRows.length > 0 ? (
        <Section title={m.pastValues}>
          <MiniTable
            caption={m.pastCaption}
            captionHidden
            columns={[
              { key: 'g', label: es.detail.versionGroup },
              { key: 'p', label: m.power, numeric: true },
              { key: 'a', label: m.accuracy, numeric: true },
              { key: 'pp', label: m.pp, numeric: true },
              { key: 'e', label: m.effectChance, numeric: true },
              { key: 't', label: es.detail.type },
            ]}
            rows={pastRows}
          />
        </Section>
      ) : null}
      <Section title={m.learnedBy}>
        <PokemonRefGrid refs={data.learned_by_pokemon} ariaLabel={`${m.learnedBy} · ${formatNumber(data.learned_by_pokemon.length)}`} />
      </Section>
    </>
  );
}

export function MoveAilmentDetail({ data }: { data: MoveAilment }) {
  return <ChipsSection title={es.detail.moves} refs={data.moves} sort />;
}

export function MoveBattleStyleDetail({ data: _data }: { data: MoveBattleStyle }) {
  // Solo nombres (§7.3 fila 30): los pinta la sección genérica "Nombres en otros idiomas".
  return null;
}

export function MoveCategoryDetail({ data }: { data: MoveCategory }) {
  return (
    <>
      <DescriptionSection entries={data.descriptions} />
      <ChipsSection title={es.detail.moves} refs={data.moves} sort />
    </>
  );
}

export function MoveDamageClassDetail({ data }: { data: MoveDamageClass }) {
  return (
    <>
      <DescriptionSection entries={data.descriptions} />
      <ChipsSection title={es.detail.moves} refs={data.moves} sort />
    </>
  );
}

export function MoveLearnMethodDetail({ data }: { data: MoveLearnMethod }) {
  return (
    <>
      <DescriptionSection entries={data.descriptions} />
      <ChipsSection title={es.detail.versionGroups} refs={data.version_groups} mode="versions" />
    </>
  );
}

export function MoveTargetDetail({ data }: { data: MoveTarget }) {
  return (
    <>
      <DescriptionSection entries={data.descriptions} />
      <ChipsSection title={es.detail.moves} refs={data.moves} sort />
    </>
  );
}
