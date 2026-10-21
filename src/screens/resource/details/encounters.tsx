// Renderers del grupo Encuentros (§7.3 filas 8–10). Los nombres van en la sección genérica.
import type { EncounterCondition, EncounterConditionValue, EncounterMethod } from '../../../api/types/encounters';
import { es } from '../../../i18n/es';
import { FactGrid } from '../../../ui/data/FactGrid';
import { ResourceLink } from '../../../ui/data/ResourceLink';
import { Section } from '../../../ui/data/Section';
import { ChipsSection, num } from './shared';

export function EncounterMethodDetail({ data }: { data: EncounterMethod }) {
  return (
    <Section title={es.detail.info}>
      <FactGrid facts={[{ label: es.detail.order, value: num(data.order) }]} />
    </Section>
  );
}

export function EncounterConditionDetail({ data }: { data: EncounterCondition }) {
  return <ChipsSection title={es.detail.values} refs={data.values} sort />;
}

export function EncounterConditionValueDetail({ data }: { data: EncounterConditionValue }) {
  return (
    <Section title={es.detail.info}>
      <FactGrid facts={[{ label: es.detail.condition, value: <ResourceLink resource={data.condition} /> }]} />
    </Section>
  );
}
