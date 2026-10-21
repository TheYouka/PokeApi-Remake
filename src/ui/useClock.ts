// Reloj local hh:mm (§10.6): se actualiza con un setTimeout al cambiar de minuto (nunca por segundo).
import { useEffect, useState } from 'react';

const fmt = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
export const formatClock = (d: Date = new Date()): string => fmt.format(d);

export function useClock(): string {
  const [text, setText] = useState(() => formatClock());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const ms = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 20;
      timer = setTimeout(() => { setText(formatClock()); schedule(); }, ms);
    };
    setText(formatClock());
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return text;
}
