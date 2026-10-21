// Barra de filtros de la Pokédex (§13.1, RF-DEX-3): Pickers de tipo (hasta 2), generación, color,
// hábitat, forma corporal y grupo huevo; interruptor de formas; chips con ✕ y "Limpiar filtros".
// Las opciones vienen de listAll(recurso) y se etiquetan localizadas al abrir el Picker.
import type { ReactNode } from 'react';
import type { NamedAPIResource } from '../../api/types/common';
import { es } from '../../i18n/es';
import { formatSlug } from '../../i18n/format';
import { RefLabel } from '../../ui/data/RefLabel';
import { Icon } from '../../ui/icons';
import { Picker, type PickerOption } from '../../ui/Picker';
import { Switch } from '../../ui/Switch';
import styles from './PokedexScreen.module.css';

export type SpeciesFilterKey = 'color' | 'habitat' | 'shape' | 'egg';

export interface DexFilters {
  types: string[];
  gen: number | null;
  color: string | null;
  habitat: string | null;
  shape: string | null;
  egg: string | null;
  forms: boolean;
}

export interface FilterBarProps {
  filters: DexFilters;
  onChange: (next: DexFilters) => void;
  typeOptions: readonly NamedAPIResource<'type'>[];
  lists: Record<SpeciesFilterKey, readonly NamedAPIResource[] | null>;
  typesDisabled: boolean;
  speciesDisabled: boolean;
}

const ANY = '';
const GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function refOptions(list: readonly NamedAPIResource[] | null): PickerOption<string>[] {
  return [{ value: ANY, label: es.pokedex.any }, ...(list ?? []).map((r) => ({ value: r.name, label: formatSlug(r.name) }))];
}

/** Etiqueta localizada de una opción (solo se monta con el Picker abierto o para la elegida). */
function optionRenderer(list: readonly NamedAPIResource[] | null, lazy: boolean) {
  const byName = new Map((list ?? []).map((r) => [r.name, r]));
  return (o: PickerOption<string>) => {
    const r = byName.get(o.value);
    return r ? <RefLabel resource={r} lazy={lazy} /> : o.label;
  };
}

export function FilterBar({ filters, onChange, typeOptions, lists, typesDisabled, speciesDisabled }: FilterBarProps) {
  const f = filters;
  const set = (patch: Partial<DexFilters>) => onChange({ ...f, ...patch });
  const typeOpts = refOptions(typeOptions);
  const [t1 = ANY, t2 = ANY] = f.types;
  const typeRender = optionRenderer(typeOptions, true);
  const typeValue = optionRenderer(typeOptions, false);

  const speciesPicker = (key: SpeciesFilterKey, label: string) => (
    <Picker
      label={label}
      value={f[key] ?? ANY}
      options={refOptions(lists[key])}
      disabled={speciesDisabled || lists[key] === null}
      onChange={(v) => set({ [key]: v === ANY ? null : v })}
      renderOption={optionRenderer(lists[key], true)}
      renderValue={optionRenderer(lists[key], false)}
    />
  );

  type Chip = { key: string; label: ReactNode; clear: () => void; text: string };
  const chips: Chip[] = [];
  f.types.forEach((t, i) => {
    const r = typeOptions.find((x) => x.name === t);
    chips.push({
      key: `type-${t}`, text: formatSlug(t), label: r ? <RefLabel resource={r} lazy={false} /> : formatSlug(t),
      clear: () => set({ types: f.types.filter((_, j) => j !== i) }),
    });
  });
  if (f.gen !== null) chips.push({ key: 'gen', text: es.pokedex.genOption(f.gen), label: es.pokedex.genOption(f.gen), clear: () => set({ gen: null }) });
  for (const key of ['color', 'habitat', 'shape', 'egg'] as const) {
    const v = f[key];
    if (v === null) continue;
    const r = lists[key]?.find((x) => x.name === v);
    chips.push({ key, text: formatSlug(v), label: r ? <RefLabel resource={r} lazy={false} /> : formatSlug(v), clear: () => set({ [key]: null }) });
  }
  if (f.forms) chips.push({ key: 'forms', text: es.pokedex.forms, label: es.pokedex.forms, clear: () => set({ forms: false }) });

  return (
    <div className={styles.filters} data-focus-group="filters">
      <div className={styles.pickers}>
        <Picker
          label={es.pokedex.type}
          value={t1}
          options={typeOpts}
          disabled={typesDisabled}
          onChange={(v) => set({ types: v === ANY ? [] : [v, ...(t2 !== ANY && t2 !== v ? [t2] : [])] })}
          renderOption={typeRender}
          renderValue={typeValue}
        />
        <Picker
          label={es.pokedex.secondType}
          value={t2}
          options={typeOpts.filter((o) => o.value === ANY || o.value !== t1)}
          disabled={typesDisabled || t1 === ANY}
          onChange={(v) => set({ types: v === ANY ? [t1] : [t1, v] })}
          renderOption={typeRender}
          renderValue={typeValue}
        />
        <Picker
          label={es.pokedex.generation}
          value={f.gen === null ? ANY : String(f.gen)}
          options={[{ value: ANY, label: es.pokedex.any }, ...GENS.map((g) => ({ value: String(g), label: es.pokedex.genOption(g) }))]}
          disabled={speciesDisabled}
          onChange={(v) => set({ gen: v === ANY ? null : Number(v) })}
        />
        {speciesPicker('color', es.pokedex.color)}
        {speciesPicker('habitat', es.pokedex.habitat)}
        {speciesPicker('shape', es.pokedex.shape)}
        {speciesPicker('egg', es.pokedex.egg)}
      </div>
      <div className={styles.filterRow}>
        <Switch label={es.pokedex.forms} checked={f.forms} disabled={speciesDisabled} onChange={(v) => set({ forms: v })} />
        {chips.length > 0 ? (
          <>
            <ul role="list" className={styles.chips} aria-label={es.pokedex.activeFilters}>
              {chips.map((c) => (
                <li key={c.key} className={styles.chip}>
                  <span>{c.label}</span>
                  <button type="button" className={styles.chipClear} aria-label={es.pokedex.removeFilter(c.text)} onClick={c.clear}>
                    <Icon name="cerrar" size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.clear}
              onClick={() => onChange({ types: [], gen: null, color: null, habitat: null, shape: null, egg: null, forms: false })}
            >
              {es.pokedex.clear}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
