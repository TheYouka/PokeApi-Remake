// Descargas en el navegador (§17): Blob + URL.createObjectURL + <a download>; la URL se revoca a los
// 10 s. No toca el DOM al importarse. Cada función devuelve null si va bien o el mensaje
// "No se pudo exportar" (§18) para mostrarlo en línea.
import { es } from '../i18n/es';

const REVOKE_MS = 10_000;

export function downloadBlob(name: string, blob: Blob): string | null {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    return null;
  } catch {
    return es.errors.exportFailed;
  }
}

export function downloadText(name: string, text: string, type: string): string | null {
  try {
    return downloadBlob(name, new Blob([text], { type }));
  } catch {
    return es.errors.exportFailed;
  }
}

export function downloadJson(name: string, value: unknown): string | null {
  try {
    return downloadText(name, JSON.stringify(value, null, 2), 'application/json;charset=utf-8');
  } catch {
    return es.errors.exportFailed;
  }
}

export const downloadCsv = (name: string, csv: string): string | null => downloadText(name, csv, 'text/csv;charset=utf-8');
