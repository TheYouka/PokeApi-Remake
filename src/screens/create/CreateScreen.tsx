// Crear Pokémon (§13.10, §19, RF-ORIG-4): nombre, color, tipos (18 de combate + stellar), grupos huevo
// y hábitat. Validación al salir del campo y al enviar (mensajes en línea con aria-describedby y
// aria-invalid; foco al primer error). addCreated es el único punto de disparo de pokemon-created y de
// la notificación "Pokémon creado: X (#1234)". Lista "Tus Pokémon creados" con Borrar y Borrar todos.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { NamedAPIResource } from '../../api/types/common';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useListAll } from '../../data/hooks';
import { battleTypeRefs } from '../../data/typeCatalog';
import { es } from '../../i18n/es';
import { formatSlug, padDex } from '../../i18n/format';
import { addCreated, clearCreated, created, MAX_CREATED, removeCreated, type CreatedPokemon } from '../../state/created';
import { useStore } from '../../state/store';
import { validateCreatedName } from '../../state/validation';
import { CreatedSilhouette } from '../../ui/data/CreatedSilhouette';
import { RefLabel } from '../../ui/data/RefLabel';
import { ConfirmDialog } from '../../ui/Dialog';
import { EmptyState } from '../../ui/EmptyState';
import { Icon } from '../../ui/icons';
import { Picker, type PickerOption } from '../../ui/Picker';
import styles from './CreateScreen.module.css';

type Field = 'name' | 'color' | 'type1' | 'type2' | 'egg1' | 'egg2' | 'habitat';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
const FIELDS: Field[] = ['name', 'color', 'type1', 'type2', 'egg1', 'egg2', 'habitat'];
const EMPTY: Values = { name: '', color: '', type1: '', type2: '', egg1: '', egg2: '', habitat: '' };
const NONE = '';

const fieldId = (f: Field) => `create-${f}`;
const errorId = (f: Field) => `create-${f}-error`;

function validate(v: Values, existing: ReadonlySet<string>, field?: Field): Errors {
  const e: Errors = {};
  const want = (f: Field) => field === undefined || field === f;
  if (want('name')) {
    const r = validateCreatedName(v.name, existing);
    if (!r.ok) e.name = r.error;
  }
  if (want('color') && v.color === NONE) e.color = es.validation.required;
  if (want('type1') && v.type1 === NONE) e.type1 = es.validation.required;
  if ((want('type2') || want('type1')) && v.type2 !== NONE && v.type2 === v.type1) e.type2 = es.validation.sameTypes;
  if (want('egg1') && v.egg1 === NONE) e.egg1 = es.validation.required;
  if ((want('egg2') || want('egg1')) && v.egg2 !== NONE && v.egg2 === v.egg1) e.egg2 = es.validation.sameEggGroups;
  if (want('habitat') && v.habitat === NONE) e.habitat = es.validation.required;
  return e;
}

function options(list: readonly NamedAPIResource[], none: string | null): PickerOption<string>[] {
  const head = none === null ? [] : [{ value: NONE, label: none }];
  return [...head, ...list.map((r) => ({ value: r.name, label: formatSlug(r.name) }))];
}

function CreatedRow({ p, onDelete }: { p: CreatedPokemon; onDelete: () => void }) {
  return (
    <li className={styles.row}>
      <CreatedSilhouette color={p.color} size={56} />
      <Link to={`/pokemon/${p.id}`} viewTransition className={styles.rowLink}>
        <span className="tabular">{padDex(p.id)}</span> <strong>{p.name}</strong>
      </Link>
      <span className={styles.badge}>{es.blocks.created}</span>
      <button type="button" className={styles.danger} onClick={onDelete}>
        <Icon name="cerrar" size={16} />{es.create.delete}
      </button>
    </li>
  );
}

export default function CreateScreen() {
  useDocumentTitle(es.create.title, { recent: true });
  const navigate = useNavigate();
  const mine = useStore(created, (s) => s);
  const pokemonList = useListAll('pokemon');
  const speciesList = useListAll('pokemon-species');
  const colors = useListAll('pokemon-color');
  const types = useListAll('type');
  const eggs = useListAll('egg-group');
  const habitats = useListAll('pokemon-habitat');

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [confirm, setConfirm] = useState<CreatedPokemon | 'all' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existing = useMemo(() => {
    const s = new Set<string>();
    for (const r of pokemonList.data?.results ?? []) s.add(r.name);
    for (const r of speciesList.data?.results ?? []) s.add(r.name);
    for (const c of mine) s.add(c.slug);
    return s;
  }, [pokemonList.data, speciesList.data, mine]);

  // Tipos: los 18 de combate + stellar (RF-ORIG-4).
  const typeRefs = useMemo(() => {
    const all = types.data?.results ?? [];
    const stellar = all.find((t) => t.name === 'stellar');
    return [...battleTypeRefs(all), ...(stellar ? [stellar] : [])];
  }, [types.data]);

  const officialMissing = !pokemonList.data || !speciesList.data;
  const full = mine.length >= MAX_CREATED;
  const disabledReason = officialMissing && (pokemonList.isError || speciesList.isError)
    ? es.errors.needOfficialList : full ? es.validation.createdFull : null;

  const set = (f: Field, v: string) => {
    const next = { ...values, [f]: v };
    setValues(next);
    if (f !== 'name') setErrors((e) => ({ ...e, ...clearOf(f), ...validate(next, existing, f) }));
  };
  const clearOf = (f: Field): Errors => {
    const out: Errors = { [f]: undefined };
    if (f === 'type1') out.type2 = undefined;
    if (f === 'egg1') out.egg2 = undefined;
    return out;
  };
  const blurName = () => setErrors((e) => ({ ...e, name: undefined, ...validate(values, existing, 'name') }));

  const submit = () => {
    setSubmitError(null);
    const e = validate(values, existing);
    setErrors(e);
    const first = FIELDS.find((f) => e[f]);
    if (first) { document.getElementById(fieldId(first))?.focus(); return; }
    if (disabledReason || officialMissing) return;
    const r = addCreated({
      name: values.name,
      color: values.color,
      types: values.type2 ? [values.type1, values.type2] : [values.type1],
      eggGroups: values.egg2 ? [values.egg1, values.egg2] : [values.egg1],
      habitat: values.habitat,
    });
    if (!r.ok) { setSubmitError(r.error); return; }
    void navigate(`/pokemon/${r.pokemon.id}`);
  };

  const describe = (f: Field) => (errors[f] ? errorId(f) : undefined);
  const err = (f: Field) => (errors[f] ? <p id={errorId(f)} className={styles.error} role="alert">{errors[f]}</p> : null);
  const pickerFor = (f: Field, label: string, list: readonly NamedAPIResource[], none: string | null) => {
    const byName = new Map(list.map((r) => [r.name, r]));
    const render = (lazy: boolean) => (o: PickerOption<string>) => {
      const r = byName.get(o.value);
      return r ? <RefLabel resource={r} lazy={lazy} /> : o.label;
    };
    return (
      <div className={styles.field}>
        <Picker
          id={fieldId(f)}
          label={label}
          value={values[f]}
          options={options(list, none ?? es.create.choose)}
          onChange={(v) => set(f, v)}
          disabled={list.length === 0}
          invalid={Boolean(errors[f])}
          describedBy={describe(f)}
          renderOption={render(true)}
          renderValue={render(false)}
        />
        {err(f)}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="caption">{es.groups.pokemon}</p>
        <h1 tabIndex={-1} data-focus-start="">{es.create.title}</h1>
      </header>

      <form
        className={styles.form}
        noValidate
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <div className={styles.field}>
          <label htmlFor={fieldId('name')} className={styles.label}>{es.create.name}</label>
          <input
            id={fieldId('name')}
            className={styles.input}
            type="text"
            maxLength={20}
            autoComplete="off"
            value={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describe('name')}
            data-autofocus=""
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            onBlur={blurName}
          />
          {err('name')}
        </div>
        {pickerFor('color', es.create.color, colors.data?.results ?? [], null)}
        {pickerFor('type1', es.create.type1, typeRefs, null)}
        {pickerFor('type2', es.create.type2, typeRefs, es.app.none)}
        {pickerFor('egg1', es.create.egg1, eggs.data?.results ?? [], null)}
        {pickerFor('egg2', es.create.egg2, eggs.data?.results ?? [], es.app.none)}
        {pickerFor('habitat', es.create.habitat, habitats.data?.results ?? [], null)}
        <div className={styles.submitRow}>
          <button type="submit" className={styles.submit} disabled={disabledReason !== null || officialMissing} aria-describedby={disabledReason ? 'create-disabled' : undefined}>
            <Icon name="crear" size={20} />{es.create.submit}
          </button>
          {disabledReason ? <p id="create-disabled" className={styles.note} role="status">{disabledReason}</p> : null}
          {!disabledReason && officialMissing ? <p className={styles.note} role="status">{es.create.loadingLists}</p> : null}
          {submitError ? <p className={styles.error} role="alert">{submitError}</p> : null}
        </div>
      </form>

      <section className={styles.list} aria-labelledby="created-list-title">
        <header className={styles.listHeader}>
          <h2 id="created-list-title">{es.create.listTitle}</h2>
          {mine.length > 0 ? (
            <button type="button" className={styles.danger} onClick={() => setConfirm('all')}>{es.create.deleteAll}</button>
          ) : null}
        </header>
        {mine.length === 0 ? <EmptyState message={es.create.none} icon="crear" /> : (
          <ul role="list" className={styles.rows}>
            {mine.map((p) => <CreatedRow key={p.id} p={p} onDelete={() => setConfirm(p)} />)}
          </ul>
        )}
      </section>

      {confirm ? (
        <ConfirmDialog
          title={confirm === 'all' ? es.create.deleteAll : es.create.delete}
          message={confirm === 'all' ? es.create.deleteAllConfirm : es.create.deleteConfirm(confirm.name)}
          confirmLabel={confirm === 'all' ? es.create.deleteAll : es.create.delete}
          onConfirm={() => { if (confirm === 'all') clearCreated(); else removeCreated(confirm.id); }}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
