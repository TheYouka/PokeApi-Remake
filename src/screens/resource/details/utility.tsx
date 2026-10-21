// Renderer del grupo Utilidad (§7.3 fila 50). "Usar para los datos" solo aparece si el idioma es uno de
// los conocidos (isKnownLang) y llama a setDataLang, que es el único punto de disparo de "Políglota".
import type { Language } from '../../../api/types/utility';
import { useDataLang } from '../../../data/hooks';
import { es } from '../../../i18n/es';
import { isKnownLang, setDataLang } from '../../../state/settings';
import { FactGrid } from '../../../ui/data/FactGrid';
import { Section } from '../../../ui/data/Section';
import { Icon } from '../../../ui/icons';
import { dash, styles, yesNo } from './shared';

export function LanguageDetail({ data }: { data: Language }) {
  const l = es.detail.languageInfo;
  const current = useDataLang();
  const known = isKnownLang(data.name);
  const active = known && current === data.name;
  return (
    <Section title={es.detail.info}>
      <div className={styles.stack}>
        <FactGrid facts={[
          { label: l.official, value: yesNo(data.official) },
          { label: l.iso639, value: <span className="tabular">{data.iso639 || dash}</span> },
          { label: l.iso3166, value: <span className="tabular">{data.iso3166 || dash}</span> },
        ]} />
        {known ? (
          <button
            type="button"
            className={styles.primary}
            disabled={active}
            aria-pressed={active}
            onClick={() => setDataLang(data.name)}
          >
            <Icon name="idioma" size={20} />{active ? l.inUse : l.useForData}
          </button>
        ) : <p className={styles.muted}>{l.unsupported}</p>}
      </div>
    </Section>
  );
}
