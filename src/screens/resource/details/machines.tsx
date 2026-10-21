// Renderer del grupo Máquinas (§7.3 fila 27): objeto (con sprite), movimiento y grupo de versiones.
import type { Machine } from '../../../api/types/machines';
import { itemSprite } from '../../../data/sprites';
import { es } from '../../../i18n/es';
import { FactGrid } from '../../../ui/data/FactGrid';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { SpriteImage } from '../../../ui/SpriteImage';
import { styles } from './shared';

export function MachineDetail({ data }: { data: Machine }) {
  return (
    <Section title={es.detail.info}>
      <FactGrid facts={[
        {
          label: es.detail.item,
          value: (
            <span className={styles.inline}>
              <SpriteImage src={itemSprite(data.item.name)} alt="" width={40} height={40} pixelated />
              <ResourceLink resource={data.item} />
            </span>
          ),
        },
        { label: es.detail.move.move, value: <ResourceLink resource={data.move} /> },
        { label: es.detail.versionGroup, value: <ResourceLink resource={data.version_group} labelMode="versions" /> },
      ]} />
    </Section>
  );
}
