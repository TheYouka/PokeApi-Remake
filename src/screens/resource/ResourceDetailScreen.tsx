// Detalle genérico de un recurso (§7.2): /:resource/:idOrName. Recurso inválido o 'pokemon' → 404 sin
// peticiones; parámetro inválido → 404 sin petición; forma canónica distinta → <Navigate replace>.
// Pide el recurso (high), carga en lazy el renderer del grupo (REGISTRY[r].detail) y añade las dos
// secciones genéricas: "Nombres en otros idiomas" y "Datos sin procesar" (JSON como texto).
import { useQuery } from '@tanstack/react-query';
import { Suspense, lazy, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, useParams } from 'react-router';
import { displayCode } from '../../api/errors';
import { pickName, toBcp47 } from '../../api/localize';
import { RESOURCES, type ResourceKey } from '../../api/resources';
import type { Name } from '../../api/types/common';
import { canonicalIdOrName, validateIdOrName, type IdOrName } from '../../api/urls';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { downloadJson } from '../../data/download';
import { useDataLang, useResource } from '../../data/hooks';
import { listPageQuery } from '../../data/queries';
import { es } from '../../i18n/es';
import { RESOURCE_UI, isRegistryKey } from '../../registry/resources';
import { track, trackVisit } from '../../state/achievements';
import { addRecent } from '../../state/recent';
import { DetailHeader } from '../../ui/data/DetailHeader';
import { MiniTable } from '../../ui/data/MiniTable';
import { RefLabel } from '../../ui/data/RefLabel';
import { Section } from '../../ui/data/Section';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { Icon } from '../../ui/icons';
import { SectionBoundary } from '../../ui/SectionBoundary';
import { Skeleton, SkeletonRegion } from '../../ui/Skeleton';
import { SpriteImage } from '../../ui/SpriteImage';
import NotFoundScreen from '../error/NotFoundScreen';
import styles from './ResourceDetailScreen.module.css';

type Renderer = ComponentType<{ data: unknown }>;
/** Un React.lazy por recurso (estable entre renders); los del mismo grupo comparten chunk. */
const renderers = new Map<ResourceKey, LazyExoticComponent<Renderer>>();
function rendererOf(r: ResourceKey): LazyExoticComponent<Renderer> | null {
  const load = RESOURCE_UI[r].detail;
  if (!load) return null;
  let c = renderers.get(r);
  if (!c) {
    c = lazy(load as () => Promise<{ default: Renderer }>);
    renderers.set(r, c);
  }
  return c;
}

interface Generic { id: number; name?: string; names?: Name[] }

export default function ResourceDetailScreen() {
  const { resource = '', idOrName = '' } = useParams();
  if (!isRegistryKey(resource) || resource === 'pokemon') return <NotFoundScreen />;
  const parsed = validateIdOrName(idOrName);
  if (!parsed) return <NotFoundScreen />;
  const canonical = canonicalIdOrName(parsed);
  if (canonical !== idOrName) return <Navigate replace to={`/${resource}/${canonical}`} />;
  return <ResourceDetail key={`${resource}/${canonical}`} resource={resource} id={parsed} />;
}

function OtherNames({ names }: { names: Name[] }) {
  return (
    <Section title={es.detail.otherNames}>
      <MiniTable
        caption={es.detail.otherNames}
        captionHidden
        columns={[{ key: 'lang', label: es.detail.language }, { key: 'name', label: es.detail.name }]}
        rows={names.map((n, i) => ({
          key: `${n.language.name}|${i}`,
          cells: [
            <RefLabel key="l" resource={n.language} mode="slug" />,
            <span key="n" lang={toBcp47(n.language.name)}>{n.name}</span>,
          ],
        }))}
      />
    </Section>
  );
}

function RawData({ data, fileName }: { data: unknown; fileName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Section title={es.detail.raw}>
      <div className={styles.rawActions}>
        <button type="button" className={styles.button} onClick={() => setError(downloadJson(fileName, data))}>
          <Icon name="descargar" size={18} />{es.detail.exportJson}
        </button>
        {error ? <p role="status" className={styles.status}>{error}</p> : null}
      </div>
      <details className={styles.raw} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>{es.detail.rawShow}</summary>
        {/* Texto plano como hijo de React (se escapa). Solo se serializa al abrir. */}
        {open ? <pre className={styles.pre}>{JSON.stringify(data, null, 2)}</pre> : null}
      </details>
    </Section>
  );
}

function ResourceDetail({ resource, id }: { resource: ResourceKey; id: IdOrName }) {
  const ui = RESOURCE_UI[resource];
  const lang = useDataLang();
  const q = useResource(resource, id);
  const data = q.data as Generic | undefined;
  const regions = useQuery({ ...listPageQuery('region', 1, 0), enabled: resource === 'region' }); // low

  const named = RESOURCES[resource].named;
  const slug = typeof data?.name === 'string' ? data.name : '';
  const title = data
    ? (data.names && data.names.length > 0 ? pickName(data.names, lang, slug) : { text: es.detail.untitled(ui.singular, data.id), lang: null })
    : null;
  useDocumentTitle(title?.text ?? null);

  // Logros de visita (§7.2, literal): solo tras una carga correcta y con la identidad de los datos.
  useEffect(() => {
    if (!data) return;
    if (resource === 'region') {
      if (regions.data) track({ type: 'region-viewed', name: data.name ?? '', total: regions.data.count });
    } else trackVisit(resource, data);            // berry-viewed / item-viewed / move-viewed {name: data.name}
  }, [resource, data?.id, regions.data?.count]);

  const thumb = data && ui.thumb ? ui.thumb(data.id, slug || null) : null;
  useEffect(() => {
    if (!data || !title) return;
    const path = `/${resource}/${named && slug ? slug : data.id}`;
    addRecent({ path, title: title.text, kind: 'resource', ...(thumb ? { image: thumb } : {}) });
  }, [resource, data?.id, title?.text, thumb]);

  if (q.isError) {
    return <div className={styles.page}><ErrorPanel code={displayCode(q.error)} onRetry={() => void q.refetch()} /></div>;
  }
  if (!data || !title) {
    return (
      <div className={styles.page}>
        <SkeletonRegion>
          <Skeleton width="20%" height="1em" />
          <Skeleton width="50%" height="3em" />
          <Skeleton height="240px" />
        </SkeletonRegion>
      </div>
    );
  }

  const Renderer = rendererOf(resource);
  return (
    <div className={styles.page}>
      <DetailHeader
        caption={es.groups[ui.group]}
        title={title.text}
        lang={title.lang}
        chip={es.detail.chip(slug, data.id)}
        media={thumb ? <SpriteImage src={thumb} alt="" width={96} height={96} pixelated priority /> : undefined}
      />
      <div className={styles.sections}>
        {Renderer ? (
          <SectionBoundary>
            <Suspense fallback={<SkeletonRegion><Skeleton height="240px" /></SkeletonRegion>}>
              <Renderer data={q.data} />
            </Suspense>
          </SectionBoundary>
        ) : null}
        {data.names && data.names.length > 0 ? <OtherNames names={data.names} /> : null}
        <RawData data={q.data} fileName={`${resource}-${named && slug ? slug : data.id}.json`} />
      </div>
    </div>
  );
}
