// RefChips (§7.2): chips ResourceLink. Con más de 48, los 48 primeros + "Ver todos (N)", que abre un
// Dialog "{label} · N" con una VirtualList en modo 'element' (el scroll lo hace el contenedor de la lista).
import { useState } from 'react';
import type { APIResource, NamedAPIResource } from '../../api/types/common';
import type { RefContext } from '../../data/links';
import { es } from '../../i18n/es';
import type { LabelMode } from '../../registry/resources';
import { Dialog } from '../Dialog';
import { VirtualList } from '../VirtualList';
import { ResourceLink } from './ResourceLink';
import styles from './blocks.module.css';

export const CHIP_FOLD = 48;
const DIALOG_ROW = 48;

export interface RefChipsProps {
  refs: readonly (NamedAPIResource | APIResource)[];
  /** Título del diálogo "Ver todos". */
  label: string;
  labelMode?: LabelMode;
  context?: RefContext;
}

const keyOf = (r: NamedAPIResource | APIResource, i: number) => `${r.url}|${i}`;

export function RefChips({ refs, label, labelMode = 'fetch', context = 'chip' }: RefChipsProps) {
  const [open, setOpen] = useState(false);
  if (refs.length === 0) return <p className={styles.muted}>{es.blocks.none}</p>;
  const shown = refs.length > CHIP_FOLD ? refs.slice(0, CHIP_FOLD) : refs;
  return (
    <div className={styles.chipsWrap}>
      <ul role="list" className={styles.chips}>
        {shown.map((r, i) => (
          <li key={keyOf(r, i)}><ResourceLink resource={r} labelMode={labelMode} context={context} className={styles.chipLink} /></li>
        ))}
      </ul>
      {refs.length > CHIP_FOLD ? (
        <button type="button" className={styles.moreButton} onClick={() => setOpen(true)}>{es.app.viewAll(refs.length)}</button>
      ) : null}
      {open ? (
        <Dialog title={es.app.dialogTitle(label, refs.length)} onClose={() => setOpen(false)} size="wide">
          <VirtualList
            items={refs}
            rowHeight={DIALOG_ROW}
            scroll={{ mode: 'element', maxHeight: 'min(70vh, 640px)' }}
            ariaLabel={label}
            getKey={keyOf}
            renderItem={(r) => <ResourceLink resource={r} labelMode={labelMode} context={context} className={styles.dialogRow} />}
          />
        </Dialog>
      ) : null}
    </div>
  );
}
