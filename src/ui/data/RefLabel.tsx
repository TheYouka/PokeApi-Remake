// Etiqueta localizada de una referencia como texto (sin enlace). Con `lazy` solo se pide al llevar
// 150 ms visible; sin `lazy`, en cuanto se monta (p. ej. la opción elegida de un Picker). Si la etiqueta
// cayó a otro idioma que el de datos, lleva la insignia de idioma (§14).
import { useRef, type RefObject } from 'react';
import { toBcp47 } from '../../api/localize';
import type { APIResource, NamedAPIResource } from '../../api/types/common';
import { useDataLang, useLocalizedLabel, type LocalizedLabel } from '../../data/hooks';
import type { LabelMode } from '../../registry/resources';
import { LangBadge } from './LocalizedText';
import { useVisibleLabel } from './ResourceLink';

export interface RefLabelProps {
  resource: NamedAPIResource | APIResource;
  mode?: LabelMode;
  lazy?: boolean;
}

function Text({ l, elRef }: { l: LocalizedLabel; elRef?: RefObject<HTMLSpanElement | null> }) {
  const dataLang = useDataLang();
  return (
    <span ref={elRef} lang={l.lang ? toBcp47(l.lang) : undefined}>
      {l.text}
      {l.lang !== null && l.lang !== dataLang ? <LangBadge code={l.lang} /> : null}
    </span>
  );
}

function LazyLabel({ resource, mode }: { resource: NamedAPIResource | APIResource; mode: LabelMode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const l = useVisibleLabel(ref, resource, mode);
  return <Text l={l} elRef={ref} />;
}

function EagerLabel({ resource, mode }: { resource: NamedAPIResource | APIResource; mode: LabelMode }) {
  const l = useLocalizedLabel(resource, mode);
  return <Text l={l} />;
}

export function RefLabel({ resource, mode = 'fetch', lazy = true }: RefLabelProps) {
  return lazy ? <LazyLabel resource={resource} mode={mode} /> : <EagerLabel resource={resource} mode={mode} />;
}
