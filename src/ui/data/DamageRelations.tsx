// DamageRelations (§7.2, RF-POK-10): 6 grupos de TypeBadge de un tipo (`relations`) o los grupos
// defensivos de un Pokémon (`groups`: ×4, ×2, ×1, ×½, ×¼, ×0). Las etiquetas del grupo ×1 se piden al ser
// visibles, para no sumar hasta 14 peticiones a la carga inicial de la ficha (§13.2, AC-18).
import type { TypeRelations } from '../../api/types/pokemon';
import { formatMultiplier, type DefensiveGroup } from '../../data/effectiveness';
import { es } from '../../i18n/es';
import { TypeBadge } from '../TypeBadge';
import styles from './blocks.module.css';

const RELATION_KEYS = [
  'double_damage_from', 'half_damage_from', 'no_damage_from', 'double_damage_to', 'half_damage_to', 'no_damage_to',
] as const;

export type DamageRelationsProps = { relations: TypeRelations } | { groups: readonly DefensiveGroup[] };

export function DamageRelations(props: DamageRelationsProps) {
  const rows = 'relations' in props
    ? RELATION_KEYS.map((k) => ({ key: k, label: es.blocks.relations[k], types: props.relations[k], multiplier: null as number | null }))
    : props.groups.map((g) => ({ key: String(g.multiplier), label: es.blocks.defensive(formatMultiplier(g.multiplier)), types: g.types, multiplier: g.multiplier }));
  if (rows.length === 0) return <p className={styles.muted}>{es.pokemon.noDefense}</p>;
  return (
    <dl className={styles.relations}>
      {rows.map((r) => (
        <div key={r.key} className={styles.relationRow} data-multiplier={r.multiplier ?? undefined}>
          <dt className={styles.relationLabel}>{r.label}</dt>
          <dd className={styles.badges}>
            {r.types.length === 0
              ? <span className={styles.muted}>{es.blocks.none}</span>
              : r.types.map((t) => <TypeBadge key={t.name} type={t} size="small" lazy={r.multiplier === 1} />)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
