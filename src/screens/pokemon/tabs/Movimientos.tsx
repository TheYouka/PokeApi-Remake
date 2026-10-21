// Pestaña Movimientos (§13.2, RF-POK-7): Picker de grupo de versiones (los de pokemon.moves, por ID,
// el último por defecto) y de método (level-up por defecto). Los detalles move/{x} se piden solo para
// las filas visibles (low). "Por nombre" pide todas las filas (≤ 200) con progreso y ordena con
// localeCompare('es') cuando terminan; hasta entonces se mantiene el orden anterior.
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { pickName, toBcp47 } from '../../../api/localize';
import type { NamedAPIResource } from '../../../api/types/common';
import type { Move } from '../../../api/types/moves';
import type { Pokemon } from '../../../api/types/pokemon';
import { parseResourceUrl } from '../../../api/urls';
import { useDataLang, useInViewDwell, useRefData } from '../../../data/hooks';
import { refHref } from '../../../data/links';
import { refQuery } from '../../../data/queries';
import { es } from '../../../i18n/es';
import { formatSlug } from '../../../i18n/format';
import { RefLabel } from '../../../ui/data/RefLabel';
import { EmptyState } from '../../../ui/EmptyState';
import { Picker } from '../../../ui/Picker';
import { Skeleton } from '../../../ui/Skeleton';
import { TypeBadge } from '../../../ui/TypeBadge';
import styles from '../PokemonScreen.module.css';

const MAX_NAME_SORT = 200;
const dash = es.app.dash;
const idOf = (r: { url: string }) => parseResourceUrl(r.url)?.id ?? 0;

interface MoveRowData { move: NamedAPIResource<'move'>; level: number }

function MoveRow({ row, showLevel }: { row: MoveRowData; showLevel: boolean }) {
  const ref = useRef<HTMLTableRowElement>(null);
  const lang = useDataLang();
  const visible = useInViewDwell(ref);
  const q = useRefData(row.move, { enabled: visible });
  const m: Move | undefined = q.data;
  const name = m ? pickName(m.names, lang, row.move.name) : { text: formatSlug(row.move.name), lang: null };
  const cell = (v: ReactNode) => (m ? v : q.isError ? dash : <Skeleton width="3em" height="1em" />);
  const href = refHref(row.move, 'chip');
  return (
    <tr ref={ref}>
      {showLevel ? <td className={styles.numCell}>{row.level > 0 ? row.level : dash}</td> : null}
      <th scope="row">
        {href ? <Link to={href} viewTransition lang={name.lang ? toBcp47(name.lang) : undefined}>{name.text}</Link> : name.text}
      </th>
      <td>{cell(m ? <TypeBadge type={m.type} size="small" /> : null)}</td>
      <td>{cell(m ? <RefLabel resource={m.damage_class} /> : null)}</td>
      <td className={styles.numCell}>{cell(m?.power ?? dash)}</td>
      <td className={styles.numCell}>{cell(m?.accuracy ?? dash)}</td>
      <td className={styles.numCell}>{cell(m?.pp ?? dash)}</td>
    </tr>
  );
}

export function Movimientos({ pokemon }: { pokemon: Pokemon }) {
  const lang = useDataLang();
  const versionGroups = useMemo(() => {
    const map = new Map<string, NamedAPIResource<'version-group'>>();
    for (const m of pokemon.moves) for (const d of m.version_group_details) map.set(d.version_group.name, d.version_group);
    return [...map.values()].sort((a, b) => idOf(a) - idOf(b));
  }, [pokemon]);
  const [vg, setVg] = useState<string | null>(null);
  const currentVg = vg ?? versionGroups.at(-1)?.name ?? '';

  const methods = useMemo(() => {
    const map = new Map<string, NamedAPIResource<'move-learn-method'>>();
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) if (d.version_group.name === currentVg) map.set(d.move_learn_method.name, d.move_learn_method);
    }
    return [...map.values()].sort((a, b) => idOf(a) - idOf(b));
  }, [pokemon, currentVg]);
  const [method, setMethod] = useState<string | null>(null);
  const currentMethod = method && methods.some((m) => m.name === method)
    ? method : methods.find((m) => m.name === 'level-up')?.name ?? methods[0]?.name ?? '';

  const rows = useMemo<MoveRowData[]>(() => {
    const out: MoveRowData[] = [];
    for (const m of pokemon.moves) {
      const d = m.version_group_details.find((x) => x.version_group.name === currentVg && x.move_learn_method.name === currentMethod);
      if (d) out.push({ move: m.move, level: d.level_learned_at });
    }
    return out.sort((a, b) => a.level - b.level || a.move.name.localeCompare(b.move.name));
  }, [pokemon, currentVg, currentMethod]);

  const [sortBy, setSortBy] = useState<'level' | 'name'>('level');
  const toLoad = sortBy === 'name' ? rows.slice(0, MAX_NAME_SORT) : [];
  const nameQueries = useQueries({ queries: toLoad.map((r) => ({ ...refQuery(r.move, 'low') })) });
  const loaded = nameQueries.filter((q) => q.data || q.isError).length;
  const allLoaded = sortBy === 'name' && loaded === toLoad.length;

  // Orden por nombre solo cuando terminan todos; mientras, se mantiene el anterior.
  const [order, setOrder] = useState<MoveRowData[]>(rows);
  useEffect(() => { if (sortBy === 'level') setOrder(rows); }, [rows, sortBy]);
  useEffect(() => {
    if (!allLoaded) return;
    const names = new Map<string, string>();
    nameQueries.forEach((q, i) => {
      const r = toLoad[i]!;
      names.set(r.move.name, q.data ? pickName((q.data as Move).names, lang, r.move.name).text : formatSlug(r.move.name));
    });
    const sorted = [...rows].sort((a, b) =>
      (names.get(a.move.name) ?? formatSlug(a.move.name)).localeCompare(names.get(b.move.name) ?? formatSlug(b.move.name), 'es'));
    setOrder(sorted);
  }, [allLoaded, rows, lang]);
  const visibleOrder = order.length === rows.length && order.every((o) => rows.includes(o)) ? order : rows;

  const vgByName = new Map(versionGroups.map((v) => [v.name, v]));
  const methodByName = new Map(methods.map((m) => [m.name, m]));
  const showLevel = currentMethod === 'level-up';

  if (versionGroups.length === 0) return <EmptyState message={es.pokemon.moves.none} />;
  return (
    <div className={styles.tabStack}>
      <div className={styles.toolbar}>
        <Picker
          label={es.pokemon.moves.versionGroup}
          value={currentVg}
          options={versionGroups.map((v) => ({ value: v.name, label: formatSlug(v.name) }))}
          onChange={(v) => { setVg(v); setMethod(null); }}
          renderValue={(o) => { const r = vgByName.get(o.value); return r ? <RefLabel resource={r} mode="versions" lazy={false} /> : o.label; }}
          renderOption={(o) => { const r = vgByName.get(o.value); return r ? <RefLabel resource={r} mode="versions" /> : o.label; }}
        />
        <Picker
          label={es.pokemon.moves.method}
          value={currentMethod}
          options={methods.map((m) => ({ value: m.name, label: formatSlug(m.name) }))}
          onChange={setMethod}
          renderValue={(o) => { const r = methodByName.get(o.value); return r ? <RefLabel resource={r} lazy={false} /> : o.label; }}
          renderOption={(o) => { const r = methodByName.get(o.value); return r ? <RefLabel resource={r} /> : o.label; }}
        />
        <Picker
          label={es.pokemon.moves.sort}
          value={sortBy}
          options={[{ value: 'level', label: es.pokemon.moves.byLevel }, { value: 'name', label: es.pokemon.moves.byName }]}
          onChange={setSortBy}
        />
      </div>
      {sortBy === 'name' && !allLoaded ? (
        <p role="status" className={styles.muted}>{es.pokemon.moves.loadingNames(loaded, toLoad.length)}</p>
      ) : null}
      {rows.length === 0 ? <EmptyState message={es.pokemon.moves.none} /> : (
        <div className={styles.tableWrap}>
          <table className={styles.table} data-move-rows={rows.length}>
            <caption className="sr-only">{es.pokemon.moves.caption}</caption>
            <thead>
              <tr>
                {showLevel ? <th scope="col" className={styles.numCell}>{es.pokemon.moves.level}</th> : null}
                <th scope="col">{es.pokemon.moves.name}</th>
                <th scope="col">{es.pokemon.moves.type}</th>
                <th scope="col">{es.pokemon.moves.damageClass}</th>
                <th scope="col" className={styles.numCell}>{es.pokemon.moves.power}</th>
                <th scope="col" className={styles.numCell}>{es.pokemon.moves.accuracy}</th>
                <th scope="col" className={styles.numCell}>{es.pokemon.moves.pp}</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrder.map((r) => <MoveRow key={`${currentVg}|${currentMethod}|${r.move.name}`} row={r} showLevel={showLevel} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
