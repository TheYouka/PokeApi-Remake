// Renderer del grupo Monedas (§7.3 fila 7). Los nombres (con respaldo) los pinta la sección genérica.
import type { Currency } from '../../../api/types/items';
import { es } from '../../../i18n/es';
import { Section } from '../../../ui/data/Section';
import { Note } from './shared';

export function CurrencyDetail({ data: _data }: { data: Currency }) {
  return (
    <Section title={es.detail.info}>
      <Note>{es.detail.currencyNote}</Note>
    </Section>
  );
}
