// Explorador de la API (§13.7): 12 TileRow (una por grupo de endpoints) con los 50 recursos
// (data-resource-tile). Contador: el `count` de listAll si ya está en caché; si no, listPageQuery(r, 1, 0)
// (low) cuando el tile es visible. Nota de item-price en Objetos y enlace a Ajustes › Acerca de en Utilidad.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import type { ResourceKey } from '../../api/resources';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { useInViewDwell } from '../../data/hooks';
import { listAllQuery, listPageQuery } from '../../data/queries';
import { es } from '../../i18n/es';
import { formatNumber } from '../../i18n/format';
import { GROUPS } from '../../registry/groups';
import { RESOURCE_UI, resourcesOfGroup } from '../../registry/resources';
import { Icon } from '../../ui/icons';
import { Tile } from '../../ui/Tile';
import { TileRow } from '../../ui/TileRow';
import styles from './ExplorerScreen.module.css';

function ResourceTile({ r, autofocus }: { r: ResourceKey; autofocus: boolean }) {
  const ui = RESOURCE_UI[r];
  const qc = useQueryClient();
  const ref = useRef<HTMLElement>(null);
  const visible = useInViewDwell(ref);
  const cached = qc.getQueryData(listAllQuery(r).queryKey)?.count;
  const page = useQuery({ ...listPageQuery(r, 1, 0), enabled: visible && cached === undefined });
  const count = cached ?? page.data?.count;
  const counter = count === undefined ? null : formatNumber(count);
  return (
    <Tile
      id={`api:${r}`}
      elRef={ref}
      size="medium"
      variant="surface"
      icon={ui.icon}
      title={ui.label}
      subtitle={r}
      monoSubtitle
      counter={counter ?? undefined}
      ariaLabel={es.explorer.tileAria(ui.label, r, counter)}
      to={`/${r}`}
      autofocus={autofocus}
      dataAttrs={{ 'data-resource-tile': r }}
    />
  );
}

export default function ExplorerScreen() {
  useDocumentTitle(es.explorer.title, { recent: true });
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className="caption">{es.guide.explorer}</p>
        <h1 tabIndex={-1} data-focus-start="">{es.explorer.title}</h1>
      </header>
      {GROUPS.map((g, gi) => (
        <TileRow key={g.id} id={`api-${g.id}`} title={g.label} rows={2}>
          {resourcesOfGroup(g.id).map((r, i) => <ResourceTile key={r} r={r} autofocus={gi === 0 && i === 0} />)}
          {g.id === 'objetos' ? (
            <p className={styles.note}>
              <Icon name="info" size={24} />
              <span className={styles.noteText}>{es.explorer.itemPriceNote}</span>
            </p>
          ) : null}
          {g.id === 'utilidad' ? (
            <Tile
              id="api:meta"
              size="medium"
              variant="surface"
              icon="info"
              title={es.explorer.meta}
              subtitle={es.explorer.metaSlug}
              monoSubtitle
              ariaLabel={es.explorer.metaAria}
              to="/ajustes?seccion=acerca"
            />
          ) : null}
        </TileRow>
      ))}
    </div>
  );
}
