// SearchBox (§8.2, §13.1): role="combobox" + listbox de sugerencias (role="option"). ↓ desde el campo
// baja a las sugerencias con el motor espacial (keyboard.ts despacha 'down' dentro de los campos);
// Enter en una sugerencia la elige; Enter en el campo llama a onSubmit. Modo 'selector' (Comparar,
// Gráficas): Enter en el campo elige la primera sugerencia.
import { useId, useState, type FocusEvent, type Key, type ReactNode, type RefObject } from 'react';
import { MAX_QUERY } from '../data/search';
import { Icon } from './icons';
import styles from './SearchBox.module.css';

export interface SearchBoxProps<S> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly S[];
  suggestionKey: (s: S) => Key;
  renderSuggestion: (s: S) => ReactNode;
  /** Texto para el aria-label de la opción. */
  suggestionLabel: (s: S) => string;
  onPick: (s: S) => void;
  /** Enter en el campo (modo 'search'). */
  onSubmit?: (text: string) => void;
  mode?: 'search' | 'selector';
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  id?: string;
  focusId?: string;
  autofocus?: boolean;
  /** Mensaje en línea bajo el campo (role="status"). */
  status?: string | null;
}

export function SearchBox<S>({
  label, value, onChange, suggestions, suggestionKey, renderSuggestion, suggestionLabel, onPick, onSubmit,
  mode = 'search', placeholder, inputRef, id, focusId, autofocus = false, status = null,
}: SearchBoxProps<S>) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const statusId = `${autoId}-status`;
  const [focusWithin, setFocusWithin] = useState(false);
  const open = focusWithin && value.trim() !== '' && suggestions.length > 0;

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };
  const pick = (s: S) => { setFocusWithin(false); onPick(s); };

  return (
    <div className={styles.box} onFocus={() => setFocusWithin(true)} onBlur={onBlur} data-mode={mode}>
      <label htmlFor={inputId} className={styles.label}>{label}</label>
      <div className={styles.field}>
        <Icon name="busqueda" size={20} className={styles.icon} />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-describedby={status ? statusId : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_QUERY}
          placeholder={placeholder}
          value={value}
          data-focus-id={focusId}
          data-autofocus={autofocus ? '' : undefined}
          className={styles.input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (mode === 'selector') {
              const first = suggestions[0];
              if (first !== undefined) pick(first);
              return;
            }
            onSubmit?.(value);
          }}
        />
      </div>
      <ul id={listId} role="listbox" aria-label={label} className={styles.list} hidden={!open}>
        {open
          ? suggestions.map((s) => (
            <li
              key={suggestionKey(s)}
              role="option"
              aria-selected={false}
              aria-label={suggestionLabel(s)}
              tabIndex={-1}
              data-nav=""
              className={styles.option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
            >
              {renderSuggestion(s)}
            </li>
          ))
          : null}
      </ul>
      {status ? <p id={statusId} role="status" className={styles.status}>{status}</p> : null}
    </div>
  );
}
