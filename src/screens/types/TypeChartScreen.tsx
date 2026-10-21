// Tabla de tipos 18×18 (§13.4, RF-TYPE): <table> semántica con caption y cabeceras sticky; celdas
// td data-nav con roving tabindex (Tab entra y sale de un paso), data-tc-row/data-tc-col, resaltado de
// fila y columna con un velo de acento y aria-label "Fuego contra Planta: ×2". Abrirla dispara
// type-chart-opened. Con el catálogo en partial/error: ErrorPanel.
import { useEffect, useState } from 'react';
import { displayCode } from '../../api/errors';
import { pickName } from '../../api/localize';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { formatMultiplier, matrixValue } from '../../data/effectiveness';
import { useDataLang } from '../../data/hooks';
import { useTypeCatalog } from '../../data/typeCatalog';
import { es } from '../../i18n/es';
import { formatSlug } from '../../i18n/format';
import { track } from '../../state/achievements';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { Skeleton, SkeletonRegion } from '../../ui/Skeleton';
import { TypeBadge } from '../../ui/TypeBadge';
import styles from './TypeChartScreen.module.css';

export default function TypeChartScreen() {
  useDocumentTitle(es.typeChart.title, { recent: true });
  useEffect(() => { track({ type: 'type-chart-opened' }); }, []);
  const lang = useDataLang();
  const catalog = useTypeCatalog();
  const [active, setActive] = useState<{ r: number; c: number }>({ r: 0, c: 0 });

  const header = (
    <header className={styles.header}>
      <p className="caption">{es.groups.pokemon}</p>
      <h1 tabIndex={-1} data-focus-start="">{es.typeChart.title}</h1>
    </header>
  );

  if (catalog.status === 'partial' || catalog.status === 'error') {
    return <div className={styles.page}>{header}<ErrorPanel code={displayCode(catalog.error)} onRetry={catalog.retry} /></div>;
  }
  const matrix = catalog.matrix;
  if (catalog.status !== 'ready' || !matrix) {
    return (
      <div className={styles.page}>
        {header}
        <SkeletonRegion><Skeleton height="min(70vh, 720px)" /></SkeletonRegion>
      </div>
    );
  }

  const types = catalog.battleTypes;
  const labelOf = (name: string) => {
    const d = catalog.details.get(name);
    return d ? pickName(d.names, lang, name).text : formatSlug(name);
  };

  return (
    <div className={styles.page}>
      {header}
      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption className={styles.caption}>{es.typeChart.caption}</caption>
          <thead>
            <tr>
              <td className={styles.corner} aria-hidden="true">{es.typeChart.corner}</td>
              {types.map((t, c) => (
                <th key={t.name} scope="col" className={styles.colHead} data-hl={c === active.c ? '' : undefined}>
                  <span className={styles.vertical}><TypeBadge type={t} size="small" /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((atk, r) => (
              <tr key={atk.name}>
                <th scope="row" className={styles.rowHead} data-hl={r === active.r ? '' : undefined}>
                  <TypeBadge type={atk} size="small" />
                </th>
                {types.map((def, c) => {
                  const m = matrixValue(matrix, atk.name, def.name);
                  const isActive = r === active.r && c === active.c;
                  return (
                    <td
                      key={def.name}
                      data-nav=""
                      tabIndex={isActive ? 0 : -1}
                      data-tc-row={r}
                      data-tc-col={c}
                      data-m={String(m)}
                      data-hl={r === active.r || c === active.c ? '' : undefined}
                      data-focus-id={`tc:${r}:${c}`}
                      data-autofocus={r === 0 && c === 0 ? '' : undefined}
                      aria-label={es.typeChart.cell(labelOf(atk.name), labelOf(def.name), formatMultiplier(m))}
                      className={styles.cell}
                      onFocus={() => setActive({ r, c })}
                    >
                      {m === 1 ? '' : formatMultiplier(m)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
