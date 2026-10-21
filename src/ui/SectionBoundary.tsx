// Error boundary de sección (§18, RF-ERR-3): el resto de la página sigue funcionando.
// Sin sonido de error (§12). Reintentar vuelve a montar los hijos.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { es } from '../i18n/es';
import { log } from '../log';
import { Icon } from './icons';
import styles from './SectionBoundary.module.css';

interface Props { children: ReactNode }
interface State { failed: boolean; attempt: number }

export class SectionBoundary extends Component<Props, State> {
  override state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    log.error('SectionBoundary', error, info.componentStack);
  }

  private retry = () => {
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  };

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className={styles.box} role="alert">
          <Icon name="alerta" size={24} />
          <p className={styles.text}>
            {es.errors.section} <span className={styles.code}>{es.errors.code('UI_ERROR')}</span>
          </p>
          <button type="button" className={styles.retry} onClick={this.retry}>{es.errors.retry}</button>
        </div>
      );
    }
    return <SectionKey key={this.state.attempt}>{this.props.children}</SectionKey>;
  }
}

function SectionKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
