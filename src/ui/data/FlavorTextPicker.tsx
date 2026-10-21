// FlavorTextPicker (§7.2, RF-POK-11): Picker de versión (o grupo de versiones) + texto localizado.
// La versión mostrada se etiqueta con su nombre localizado; las demás opciones, por slug hasta abrir
// el picker (entonces se piden solo las visibles). Si la versión elegida no tiene texto en la cadena
// de idiomas: "Sin texto para esta versión; se muestra {versión}".
import { useMemo, useRef, useState } from 'react';
import { formatSlug, languageChain, pickFlavor, toBcp47, type FlavorEntry } from '../../api/localize';
import type { NamedAPIResource } from '../../api/types/common';
import { parseResourceUrl } from '../../api/urls';
import { useDataLang, useLocalizedLabel } from '../../data/hooks';
import { es } from '../../i18n/es';
import { Picker } from '../Picker';
import { LocalizedText } from './LocalizedText';
import { useVisibleLabel } from './ResourceLink';
import styles from './blocks.module.css';

type By = 'version' | 'version-group';

const refOf = (e: FlavorEntry): NamedAPIResource | null => {
  if ('version' in e && e.version) return e.version;
  if ('version_group' in e) return e.version_group;
  return null;
};
const idOf = (r: NamedAPIResource) => parseResourceUrl(r.url)?.id ?? 0;

function ValueLabel({ r, by }: { r: NamedAPIResource; by: By }) {
  const l = useLocalizedLabel(r, by === 'version' ? 'fetch' : 'versions');
  return <span lang={l.lang ? toBcp47(l.lang) : undefined}>{l.text}</span>;
}

function OptionLabel({ r, by }: { r: NamedAPIResource; by: By }) {
  const ref = useRef<HTMLSpanElement>(null);
  const l = useVisibleLabel(ref, r, by === 'version' ? 'fetch' : 'versions');
  return <span ref={ref} lang={l.lang ? toBcp47(l.lang) : undefined}>{l.text}</span>;
}

export interface FlavorTextPickerProps {
  entries: readonly FlavorEntry[] | undefined;
  by?: By;
}

export function FlavorTextPicker({ entries, by = 'version' }: FlavorTextPickerProps) {
  const lang = useDataLang();
  const options = useMemo(() => {
    const chain = languageChain(lang);
    const list = entries ?? [];
    const inChain = list.filter((e) => chain.includes(e.language.name));
    const source = inChain.length > 0 ? inChain : list;
    const seen = new Map<string, NamedAPIResource>();
    for (const e of source) {
      const r = refOf(e);
      if (r && !seen.has(r.name)) seen.set(r.name, r);
    }
    return [...seen.values()].sort((a, b) => idOf(a) - idOf(b));
  }, [entries, lang]);
  const [chosen, setChosen] = useState<string | null>(null);
  const current = chosen ?? options.at(-1)?.name ?? null;
  const flavor = pickFlavor(entries, lang, current ? { version: current } : {});

  if (!flavor) return <p className={styles.muted}>{es.blocks.noText}</p>;
  const byName = new Map(options.map((o) => [o.name, o]));
  const shownRef = flavor.version ? byName.get(flavor.version) : undefined;

  return (
    <div className={styles.flavor}>
      {options.length > 0 && current ? (
        <Picker
          label={by === 'version' ? es.blocks.flavorPicker : es.blocks.flavorGroupPicker}
          value={current}
          options={options.map((o) => ({ value: o.name, label: formatSlug(o.name) }))}
          onChange={setChosen}
          renderValue={(o) => { const r = byName.get(o.value); return r ? <ValueLabel r={r} by={by} /> : o.label; }}
          renderOption={(o) => { const r = byName.get(o.value); return r ? <OptionLabel r={r} by={by} /> : o.label; }}
        />
      ) : null}
      <LocalizedText as="p" text={flavor.text} lang={flavor.lang} className={styles.flavorText} />
      {flavor.versionFallback && shownRef ? (
        <p className={styles.note}>{es.empty.noFlavorForVersion(formatSlug(shownRef.name))}</p>
      ) : null}
    </div>
  );
}
