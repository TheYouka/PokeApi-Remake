// EvolutionTree (§13.3, decisión P-7): recibe la cadena ya cargada. ÚNICO punto de disparo de
// `branched-chain-opened` (lo usan la pestaña Evolución y el detalle genérico /evolution-chain/:id).
// Pantalla grande: horizontal con conectores CSS y la etiqueta de alternativas sobre cada arista;
// móvil: vertical e indentado. Nodos <Link data-nav> a /pokemon/{speciesId} con sprite de 96 px.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toBcp47 } from '../../api/localize';
import type { NamedAPIResource } from '../../api/types/common';
import type { EvolutionChain } from '../../api/types/evolution';
import {
  buildTree, groupEvolutionDetails, hasBranch, visibleAlternatives, type EvoAlternative, type EvoNode, type Part,
} from '../../data/evolution';
import { useDataLang } from '../../data/hooks';
import { refHref } from '../../data/links';
import { pokemonSprite } from '../../data/sprites';
import { es } from '../../i18n/es';
import { padDex } from '../../i18n/format';
import { track } from '../../state/achievements';
import type { LabelMode } from '../../registry/resources';
import { SpriteImage } from '../SpriteImage';
import { LangBadge } from './LocalizedText';
import { ResourceLink, useVisibleLabel } from './ResourceLink';
import styles from './EvolutionTree.module.css';

function Label({ r, mode }: { r: NamedAPIResource; mode: LabelMode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const l = useVisibleLabel(ref, r, mode);
  const dataLang = useDataLang();
  // Insignia de idioma si la etiqueta cayó a otro idioma que el de datos (§14), como en ResourceLink.
  return (
    <span ref={ref} lang={l.lang ? toBcp47(l.lang) : undefined}>
      {l.text}
      {l.lang !== null && l.lang !== dataLang ? <LangBadge code={l.lang} /> : null}
    </span>
  );
}

function PartView({ part }: { part: Part }) {
  if ('text' in part) return <span>{part.text}</span>;
  const [before, after] = part.template.split('{}') as [string, string | undefined];
  return (
    <span>
      {before}
      <ResourceLink resource={part.ref} fallback={part.fallback} className={styles.partLink} />
      {after ?? ''}
    </span>
  );
}

function AlternativeView({ alt }: { alt: EvoAlternative }) {
  return (
    <span className={styles.alternative}>
      <span className={styles.parts}>
        {alt.parts.map((p, i) => (
          <Fragment key={i}>
            {i > 0 ? <span aria-hidden="true">{es.evo.partSep}</span> : null}
            <PartView part={p} />
          </Fragment>
        ))}
      </span>
      {alt.contexts.length > 0 ? (
        <span className={styles.contexts}>
          {alt.contexts.map((c, i) => (
            <Fragment key={i}>
              {i > 0 ? es.evo.contextSep : null}
              {c.location ? <><Label r={c.location} mode="fetch" />{' ('}</> : null}
              {c.versionGroup ? <Label r={c.versionGroup} mode="versions" /> : null}
              {c.location ? ')' : null}
            </Fragment>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function EdgeLabel({ node, from }: { node: EvoNode; from: string }) {
  const alts = useMemo(() => groupEvolutionDetails(node.details, from, node.slug), [node, from]);
  const [expanded, setExpanded] = useState(false);
  if (alts.length === 0) return null;
  const v = visibleAlternatives(alts, expanded);
  return (
    <div className={styles.edge}>
      {v.shown.map((a, i) => (
        <Fragment key={i}>
          {i > 0 ? <span className={styles.or}>{es.evo.or}</span> : null}
          <AlternativeView alt={a} />
        </Fragment>
      ))}
      {v.moreLabel || expanded ? (
        <button
          type="button"
          className={styles.more}
          aria-expanded={expanded}
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? es.evo.showLess : v.moreLabel}
        </button>
      ) : null}
    </div>
  );
}

function NodeCard({ node, babyItem }: { node: EvoNode; babyItem: NamedAPIResource<'item'> | null }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const label = useVisibleLabel(ref, node.species, 'fetch');
  const href = refHref(node.species, 'grid') ?? `/pokemon/${node.speciesId}`;
  return (
    <div className={styles.nodeBox}>
      <Link ref={ref} to={href} viewTransition data-nav="" className={styles.card} aria-label={`${padDex(node.speciesId)} ${label.text}`}>
        <SpriteImage src={node.speciesId > 0 ? pokemonSprite(node.speciesId) : null} alt="" width={96} height={96} pixelated />
        <span className={`${styles.num} tabular`} aria-hidden="true">{padDex(node.speciesId)}</span>
        <span className={styles.name} lang={label.lang ? toBcp47(label.lang) : undefined}>{label.text}</span>
      </Link>
      {node.isBaby && babyItem ? (
        <p className={styles.baby}>
          {es.evo.babyItem.split('{}')[0]}<ResourceLink resource={babyItem} />
        </p>
      ) : null}
    </div>
  );
}

function Branch({ node, parent, babyItem }: { node: EvoNode; parent: string | null; babyItem: NamedAPIResource<'item'> | null }) {
  return (
    <li className={styles.branch} data-evo-node={node.slug}>
      <div className={styles.step}>
        {parent !== null ? <EdgeLabel node={node} from={parent} /> : null}
        <NodeCard node={node} babyItem={babyItem} />
      </div>
      {node.children.length > 0 ? (
        <ol role="list" className={styles.children}>
          {node.children.map((c) => <Branch key={c.slug} node={c} parent={node.slug} babyItem={babyItem} />)}
        </ol>
      ) : null}
    </li>
  );
}

export function EvolutionTree({ chain }: { chain: EvolutionChain }) {
  // Clave chain.id (§13.3): el árbol y el logro dependen solo de la identidad de la cadena.
  const tree = useMemo(() => buildTree(chain.chain), [chain.id]);
  useEffect(() => {
    if (hasBranch(tree)) track({ type: 'branched-chain-opened' });
  }, [chain.id]);

  return (
    <div className={styles.wrap}>
      <ol role="list" className={styles.tree} aria-label={es.evo.treeLabel}>
        <Branch node={tree} parent={null} babyItem={chain.baby_trigger_item} />
      </ol>
      {tree.children.length === 0 ? <p className={styles.empty}>{es.evo.empty}</p> : null}
    </div>
  );
}
