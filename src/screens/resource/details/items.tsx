// Renderers del grupo Objetos (§7.3 filas 18–22). Incluye la regla del "Coste" de `item`.
import type { NamedAPIResource } from '../../../api/types/common';
import type { Item, ItemAttribute, ItemCategory, ItemFlingEffect, ItemPocket } from '../../../api/types/items';
import { es } from '../../../i18n/es';
import { formatNumber } from '../../../i18n/format';
import { EffectText } from '../../../ui/data/EffectText';
import { FactGrid } from '../../../ui/data/FactGrid';
import { FlavorTextPicker } from '../../../ui/data/FlavorTextPicker';
import { MiniTable, type MiniTableRow } from '../../../ui/data/MiniTable';
import { RefChips } from '../../../ui/data/RefChips';
import { RefLabel } from '../../../ui/data/RefLabel';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { ChipsSection, DescriptionSection, RefOr, dash, idOf, num, pct, styles } from './shared';

const t = es.detail.itemInfo;

export type ItemCost =
  | { kind: 'cost'; value: number }
  | { kind: 'price'; value: number; currency: NamedAPIResource<'currency'>; versionGroup: NamedAPIResource<'version-group'> };

/**
 * Regla del "Coste" (§7.3): 1) `item.cost` si es un número; 2) el `purchase_price` no nulo de la
 * entrada de `prices` con el `version_group` de ID más alto, con su moneda y su grupo; 3) null ("—").
 */
export function itemCost(item: Pick<Item, 'cost' | 'prices'>): ItemCost | null {
  if (typeof item.cost === 'number' && Number.isFinite(item.cost)) return { kind: 'cost', value: item.cost };
  let best: Item['prices'][number] | null = null;
  let bestId = Number.NEGATIVE_INFINITY;
  for (const p of item.prices) {
    if (p.purchase_price === null) continue;
    const id = idOf(p.version_group);
    if (id > bestId) { best = p; bestId = id; }
  }
  if (!best || best.purchase_price === null) return null;
  return { kind: 'price', value: best.purchase_price, currency: best.currency, versionGroup: best.version_group };
}

function CostValue({ item }: { item: Item }) {
  const cost = itemCost(item);
  if (!cost) return <>{dash}</>;
  if (cost.kind === 'cost') return <>{formatNumber(cost.value)}</>;
  return (
    <span>
      {formatNumber(cost.value)}{t.sep}
      <RefLabel resource={cost.currency} mode="fetch" lazy={false} />{t.sep}
      <RefLabel resource={cost.versionGroup} mode="versions" lazy={false} />
    </span>
  );
}

const nullable = (n: number | null) => (n === null ? dash : formatNumber(n));

export function ItemDetail({ data }: { data: Item }) {
  const held: MiniTableRow[] = data.held_by_pokemon.flatMap((h) =>
    h.version_details.map((v) => ({
      key: `${h.pokemon.name}|${v.version.name}`,
      cells: [
        <ResourceLink key="p" resource={h.pokemon} labelMode="slug" />,
        <RefLabel key="v" resource={v.version} />,
        pct(v.rarity),
      ],
    })));
  const machines: MiniTableRow[] = [...data.machines]
    .sort((a, b) => idOf(a.version_group) - idOf(b.version_group))
    .map((m) => ({
      key: m.machine.url,
      cells: [<ResourceLink key="m" resource={m.machine} labelMode="summary" />, <RefLabel key="g" resource={m.version_group} mode="versions" />],
    }));
  const prices: MiniTableRow[] = [...data.prices]
    .sort((a, b) => idOf(a.version_group) - idOf(b.version_group))
    .map((p, i) => ({
      key: `${p.version_group.name}|${p.currency.name}|${i}`,
      cells: [
        <RefLabel key="c" resource={p.currency} />,
        nullable(p.purchase_price),
        nullable(p.sell_price),
        <RefLabel key="g" resource={p.version_group} mode="versions" />,
      ],
    }));
  return (
    <>
      <Section title={es.detail.info}>
        {/* El sprite ya va en la cabecera (DetailHeader, thumb del registro): no se repite aquí. */}
        <FactGrid facts={[
          { label: t.cost, value: <CostValue item={data} /> },
          { label: t.category, value: <ResourceLink resource={data.category} /> },
          { label: t.flingPower, value: num(data.fling_power) },
          { label: t.flingEffect, value: <RefOr r={data.fling_effect} /> },
          { label: t.babyTriggerFor, value: <RefOr r={data.baby_trigger_for} mode="summary" /> },
        ]} />
      </Section>
      <Section title={t.attributes}>
        <RefChips refs={data.attributes} label={t.attributes} />
      </Section>
      <Section title={es.detail.effect}><EffectText entries={data.effect_entries} /></Section>
      <Section title={es.detail.flavor}><FlavorTextPicker entries={data.flavor_text_entries} by="version-group" /></Section>
      <Section title={t.heldBy}>
        {held.length === 0 ? <p className={styles.muted}>{es.blocks.none}</p> : (
          <MiniTable
            caption={t.heldBy}
            captionHidden
            columns={[{ key: 'p', label: es.detail.pokemon }, { key: 'v', label: es.detail.version }, { key: 'r', label: t.rarity, numeric: true }]}
            rows={held}
            virtualize
          />
        )}
      </Section>
      <Section title={t.machines}>
        {machines.length === 0 ? <p className={styles.muted}>{es.blocks.none}</p> : (
          <MiniTable
            caption={t.machines}
            captionHidden
            columns={[{ key: 'm', label: t.machine }, { key: 'g', label: es.detail.versionGroup }]}
            rows={machines}
            virtualize
          />
        )}
      </Section>
      <Section title={t.prices}>
        {prices.length === 0 ? <p className={styles.muted}>{es.empty.noPrices}</p> : (
          <MiniTable
            caption={t.prices}
            captionHidden
            columns={[
              { key: 'c', label: t.currency },
              { key: 'buy', label: t.purchase, numeric: true },
              { key: 'sell', label: t.sell, numeric: true },
              { key: 'g', label: es.detail.versionGroup },
            ]}
            rows={prices}
            virtualize
          />
        )}
      </Section>
    </>
  );
}

export function ItemAttributeDetail({ data }: { data: ItemAttribute }) {
  return (
    <>
      <DescriptionSection entries={data.descriptions} />
      <ChipsSection title={es.detail.items} refs={data.items} sort />
    </>
  );
}

export function ItemCategoryDetail({ data }: { data: ItemCategory }) {
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: t.pocket, value: <ResourceLink resource={data.pocket} /> }]} />
      </Section>
      <ChipsSection title={es.detail.items} refs={data.items} sort />
    </>
  );
}

export function ItemFlingEffectDetail({ data }: { data: ItemFlingEffect }) {
  return (
    <>
      <Section title={es.detail.effect}><EffectText entries={data.effect_entries} /></Section>
      <ChipsSection title={es.detail.items} refs={data.items} sort />
    </>
  );
}

export function ItemPocketDetail({ data }: { data: ItemPocket }) {
  return <ChipsSection title={es.detail.categories} refs={data.categories} sort />;
}
