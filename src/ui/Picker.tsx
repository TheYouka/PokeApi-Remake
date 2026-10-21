// Picker (§8.2, §11.4): sustituye a <select>. Botón aria-haspopup="listbox" → Overlay capa 2 con
// role="listbox" y opciones role="option" (aria-selected, data-value). Las flechas mueven el foco con
// el motor espacial (la raíz de foco es el overlay), Enter elige y Escape cierra.
// `renderOption` / `renderValue` permiten etiquetas localizadas que solo se piden al abrir (§13.1, §13.2).
import { useId, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { Overlay } from './Overlay';
import styles from './Picker.module.css';

export interface PickerOption<V extends string> { value: V; label: string }

export interface PickerProps<V extends string> {
  /** Etiqueta visible del control (y del listbox). */
  label: string;
  value: V;
  options: readonly PickerOption<V>[];
  onChange: (value: V) => void;
  disabled?: boolean;
  id?: string;
  /** Contenido de cada opción (solo se monta con el listbox abierto). Por defecto, `label`. */
  renderOption?: (o: PickerOption<V>) => ReactNode;
  /** Contenido del botón para la opción elegida. Por defecto, `label`. */
  renderValue?: (o: PickerOption<V>) => ReactNode;
  /** Validación en línea (formularios): aria-invalid y aria-describedby en el botón. */
  invalid?: boolean;
  describedBy?: string;
}

export function Picker<V extends string>({
  label, value, options, onChange, disabled = false, id, renderOption, renderValue, invalid, describedBy,
}: PickerProps<V>) {
  const [open, setOpen] = useState(false);
  const autoId = useId();
  const buttonId = id ?? autoId;
  const labelId = `${buttonId}-label`;
  const current = options.find((o) => o.value === value);

  return (
    <div className={styles.picker}>
      <span id={labelId} className={styles.label}>{label}</span>
      <button
        id={buttonId}
        type="button"
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${buttonId}`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className={styles.value}>{current ? (renderValue ? renderValue(current) : current.label) : value}</span>
        <Icon name="chevron" size={18} className={styles.chevron} />
      </button>
      {open ? (
        <Overlay layer={2} onClose={() => setOpen(false)}>
          <div className={`${styles.panel} acrylic`}>
            <p className={`${styles.panelTitle} caption`} aria-hidden="true">{label}</p>
            <div role="listbox" aria-labelledby={labelId} className={styles.list}>
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-value={o.value}
                    data-autofocus={selected ? '' : undefined}
                    className={styles.option}
                    onClick={() => { setOpen(false); if (!selected) onChange(o.value); }}
                  >
                    <span className={styles.check} aria-hidden="true">{selected ? '●' : ''}</span>
                    {renderOption ? renderOption(o) : o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}
