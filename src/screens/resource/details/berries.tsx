// Renderers del grupo Bayas (§7.3 filas 1–3).
import { useRef } from 'react';
import type { Berry, BerryFirmness, BerryFlavor } from '../../../api/types/berries';
import { useVisibleLabel } from '../../../ui/data/ResourceLink';
import { toBcp47 } from '../../../api/localize';
import { itemSprite } from '../../../data/sprites';
import { es } from '../../../i18n/es';
import { formatNumber } from '../../../i18n/format';
import { FactGrid } from '../../../ui/data/FactGrid';
import { MiniTable } from '../../../ui/data/MiniTable';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { SpriteImage } from '../../../ui/SpriteImage';
import { TypeBadge } from '../../../ui/TypeBadge';
import { ChipsSection, RefOr, num, styles } from './shared';

const b = es.detail.berryInfo;
const MAX_POTENCY = 40;

function PotencyRow({ flavor, potency }: { flavor: Berry['flavors'][number]['flavor']; potency: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const label = useVisibleLabel(ref, flavor, 'fetch');
  const width = `${Math.min(100, (potency / MAX_POTENCY) * 100)}%`;
  return (
    <div ref={ref} className={styles.potencyRow} role="listitem" aria-label={b.potencyAria(label.text, potency)}>
      <span lang={label.lang ? toBcp47(label.lang) : undefined}><ResourceLink resource={flavor} /></span>
      <span className="tabular" aria-hidden="true">{potency}</span>
      <span className={styles.potencyTrack} aria-hidden="true"><span className={styles.potencyFill} style={{ width }} /></span>
    </div>
  );
}

export function BerryDetail({ data }: { data: Berry }) {
  const flavors = [...data.flavors].sort((x, y) => y.potency - x.potency);
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[
          { label: b.firmness, value: <ResourceLink resource={data.firmness} /> },
          { label: b.size, value: b.sizeValue(formatNumber(data.size)) },
          { label: b.smoothness, value: num(data.smoothness) },
          { label: b.soilDryness, value: num(data.soil_dryness) },
          { label: b.growthTime, value: b.hours(formatNumber(data.growth_time)) },
          { label: b.maxHarvest, value: num(data.max_harvest) },
          {
            label: b.naturalGift,
            value: (
              <span className={styles.inline}>
                <TypeBadge type={data.natural_gift_type} size="small" />
                {b.naturalGiftPower(data.natural_gift_power)}
              </span>
            ),
          },
        ]} />
      </Section>
      <Section title={b.flavors}>
        <div className={styles.potency} role="list" aria-label={b.flavors}>
          {flavors.map((f) => <PotencyRow key={f.flavor.name} flavor={f.flavor} potency={f.potency} />)}
        </div>
      </Section>
      <Section title={b.item}>
        <div className={styles.media}>
          <SpriteImage src={itemSprite(data.item.name)} alt="" width={64} height={64} pixelated />
          <RefOr r={data.item} />
        </div>
      </Section>
    </>
  );
}

export function BerryFirmnessDetail({ data }: { data: BerryFirmness }) {
  return <ChipsSection title={es.detail.berries} refs={data.berries} mode="slug" sort />;
}

export function BerryFlavorDetail({ data }: { data: BerryFlavor }) {
  const rows = [...data.berries]
    .sort((x, y) => y.potency - x.potency)
    .map((e) => ({ key: e.berry.name, cells: [<ResourceLink key="b" resource={e.berry} labelMode="slug" />, formatNumber(e.potency)] }));
  return (
    <>
      <Section title={es.detail.info}>
        <FactGrid facts={[{ label: b.contestType, value: <ResourceLink resource={data.contest_type} /> }]} />
      </Section>
      <Section title={b.byPotency}>
        <MiniTable
          caption={b.byPotency}
          captionHidden
          columns={[{ key: 'berry', label: es.detail.berry }, { key: 'potency', label: b.potency, numeric: true }]}
          rows={rows}
          virtualize
        />
      </Section>
    </>
  );
}
