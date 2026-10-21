// ResourceLink (§7.2): destino con refHref; etiqueta según el labelMode (las que piden datos solo
// cuando el enlace lleva 150 ms visible). URL inválida → <span>{formatSlug(name)}</span> sin enlace.
import { useRef, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { usePreloadOnDwell } from '../../app/preload';
import { formatSlug, toBcp47 } from '../../api/localize';
import type { APIResource, NamedAPIResource } from '../../api/types/common';
import { useDataLang, useInViewDwell, useLocalizedLabel } from '../../data/hooks';
import { refHref, type RefContext } from '../../data/links';
import type { LabelMode } from '../../registry/resources';
import { LangBadge } from './LocalizedText';
import styles from './blocks.module.css';

export interface ResourceLinkProps {
  resource: NamedAPIResource | APIResource;
  context?: RefContext;
  labelMode?: LabelMode;
  /** Texto propio si no hay etiqueta en el idioma de datos (p. ej. los disparadores de evolución). */
  fallback?: string;
  /** Envuelve el texto (p. ej. plantillas "Usar {}"). */
  render?: (label: ReactNode) => ReactNode;
  className?: string;
  focusId?: string;
}

/** Etiqueta de una referencia pedida solo al ser visible (fetch/summary/versions). */
export function useVisibleLabel(
  elRef: RefObject<Element | null>,
  resource: NamedAPIResource | APIResource | null,
  mode: LabelMode,
) {
  const visible = useInViewDwell(elRef);
  return useLocalizedLabel(resource, mode, { enabled: mode === 'slug' || visible });
}

export function ResourceLink({ resource, context = 'chip', labelMode = 'fetch', fallback, render, className, focusId }: ResourceLinkProps) {
  const ref = useRef<HTMLElement>(null);
  const label = useVisibleLabel(ref, resource, labelMode);
  const dataLang = useDataLang();
  const href = refHref(resource, context);
  const preload = usePreloadOnDwell(href);
  const name = 'name' in resource ? resource.name : '';
  const useFallback = fallback !== undefined && (label.lang === null || (label.lang === 'en' && dataLang !== 'en'));
  const text = useFallback ? fallback : label.text;
  const lang = useFallback || label.lang === null ? undefined : toBcp47(label.lang);
  // Insignia de idioma si la etiqueta cayó a otro idioma que el de datos (§14); nunca con el slug.
  const badge = !useFallback && label.lang !== null && label.lang !== dataLang ? <LangBadge code={label.lang} /> : null;
  const content = <span lang={lang}>{text}{badge}</span>;

  if (href === null) {
    return <span ref={ref} className={className}>{render ? render(formatSlug(name)) : formatSlug(name)}</span>;
  }
  return (
    <Link
      ref={ref as RefObject<HTMLAnchorElement>}
      to={href}
      viewTransition
      className={`${styles.link} ${className ?? ''}`}
      data-focus-id={focusId}
      {...preload}
    >
      {render ? render(content) : content}
    </Link>
  );
}
