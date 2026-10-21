// Iconos SVG originales (decisión P-4). Trazos de 24×24 en currentColor.
import type { ReactElement } from 'react';

export type IconName =
  | 'inicio' | 'pokedex' | 'pokemon' | 'juegos' | 'objetos' | 'movimientos' | 'mundo' | 'bayas' | 'ajustes'
  | 'trofeo' | 'candado' | 'campana' | 'sonido' | 'silencio' | 'wifi-off' | 'busqueda' | 'comparar' | 'dado'
  | 'tabla' | 'grafica' | 'estadistica' | 'retro' | 'crear' | 'api' | 'recurso' | 'chevron' | 'chevron-izq'
  | 'cerrar' | 'play' | 'estrella' | 'flecha' | 'mando' | 'info' | 'alerta' | 'huevo' | 'tipo' | 'concurso'
  | 'moneda' | 'encuentro' | 'evolucion' | 'lugar' | 'maquina' | 'idioma' | 'guia' | 'perfil' | 'apagar'
  | 'descargar' | 'reloj' | 'color' | 'forma' | 'habitat' | 'genero' | 'naturaleza';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS: Record<IconName, ReactElement> = {
  'inicio': <><path {...sw} d="M3 11 12 4l9 7" /><path {...sw} d="M5 10v10h5v-6h4v6h5V10" /></>,
  'pokedex': <><rect {...sw} x="4" y="3" width="16" height="18" rx="2" /><circle {...sw} cx="9" cy="8" r="2.5" /><path {...sw} d="M7 14h10M7 17h6" /></>,
  'pokemon': <><circle {...sw} cx="12" cy="12" r="9" /><path {...sw} d="M3 12h6m6 0h6" /><circle {...sw} cx="12" cy="12" r="3" /></>,
  'juegos': <><path {...sw} d="M6 8h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.5 1.7L15 14H9l-1.5 1.7A3 3 0 0 1 2 14v-2a4 4 0 0 1 4-4z" /><path {...sw} d="M7 11v3M5.5 12.5h3" /><circle cx="16" cy="11.5" r="1" fill="currentColor" /><circle cx="18" cy="13.5" r="1" fill="currentColor" /></>,
  'objetos': <><path {...sw} d="M5 8h14l-1.2 12H6.2z" /><path {...sw} d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  'movimientos': <><path {...sw} d="M13 2 4 14h7l-1 8 9-12h-7z" /></>,
  'mundo': <><circle {...sw} cx="12" cy="12" r="9" /><path {...sw} d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
  'bayas': <><circle {...sw} cx="9" cy="14" r="5" /><circle {...sw} cx="16" cy="15" r="4" /><path {...sw} d="M10 9c0-3 2-5 5-6M15 3c1 2 1 4-1 5" /></>,
  'ajustes': <><circle {...sw} cx="12" cy="12" r="3" /><path {...sw} d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1" /></>,
  'trofeo': <><path {...sw} d="M7 4h10v5a5 5 0 0 1-10 0z" /><path {...sw} d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6" /></>,
  'candado': <><rect {...sw} x="5" y="10" width="14" height="11" rx="2" /><path {...sw} d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  'campana': <><path {...sw} d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path {...sw} d="M10 20a2 2 0 0 0 4 0" /></>,
  'sonido': <><path {...sw} d="M4 9h4l5-4v14l-5-4H4z" /><path {...sw} d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></>,
  'silencio': <><path {...sw} d="M4 9h4l5-4v14l-5-4H4z" /><path {...sw} d="m16 9 5 6m0-6-5 6" /></>,
  'wifi-off': <><path {...sw} d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1.2" fill="currentColor" /><path {...sw} d="M3 3l18 18" /></>,
  'busqueda': <><circle {...sw} cx="10.5" cy="10.5" r="6.5" /><path {...sw} d="m15.5 15.5 5 5" /></>,
  'comparar': <><path {...sw} d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4" /></>,
  'dado': <><rect {...sw} x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.3" fill="currentColor" /><circle cx="15" cy="15" r="1.3" fill="currentColor" /><circle cx="15" cy="9" r="1.3" fill="currentColor" /><circle cx="9" cy="15" r="1.3" fill="currentColor" /></>,
  'tabla': <><rect {...sw} x="3" y="4" width="18" height="16" rx="1" /><path {...sw} d="M3 9h18M3 14h18M9 4v16M15 4v16" /></>,
  'grafica': <><path {...sw} d="M4 20V4M4 20h16" /><path {...sw} d="m7 15 4-5 3 3 5-6" /></>,
  'estadistica': <><path {...sw} d="M4 20h16" /><rect {...sw} x="6" y="11" width="3" height="9" /><rect {...sw} x="11" y="6" width="3" height="14" /><rect {...sw} x="16" y="14" width="3" height="6" /></>,
  'retro': <><rect {...sw} x="3" y="4" width="18" height="13" rx="1" /><path {...sw} d="m7 9 3 2-3 2M12 13h4M9 21h6M12 17v4" /></>,
  'crear': <><circle {...sw} cx="12" cy="12" r="9" /><path {...sw} d="M12 8v8M8 12h8" /></>,
  'api': <><path {...sw} d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  'recurso': <><path {...sw} d="M6 3h8l4 4v14H6z" /><path {...sw} d="M14 3v4h4M9 12h6M9 16h6" /></>,
  'chevron': <><path {...sw} d="m9 5 7 7-7 7" /></>,
  'chevron-izq': <><path {...sw} d="m15 5-7 7 7 7" /></>,
  'cerrar': <><path {...sw} d="M6 6l12 12M18 6 6 18" /></>,
  'play': <><path d="M8 5v14l11-7z" fill="currentColor" /></>,
  'estrella': <><path {...sw} d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></>,
  'flecha': <><path {...sw} d="M5 12h14M13 6l6 6-6 6" /></>,
  'mando': <><path {...sw} d="M6 8h12a4 4 0 0 1 4 4v3a2.5 2.5 0 0 1-4.6 1.3L16 14H8l-1.4 2.3A2.5 2.5 0 0 1 2 15v-3a4 4 0 0 1 4-4z" /><path {...sw} d="M7 10.5v3M5.5 12h3" /><circle cx="16.5" cy="11" r="1" fill="currentColor" /><circle cx="18.5" cy="13" r="1" fill="currentColor" /></>,
  'info': <><circle {...sw} cx="12" cy="12" r="9" /><path {...sw} d="M12 11v6" /><circle cx="12" cy="7.5" r="1.2" fill="currentColor" /></>,
  'alerta': <><path {...sw} d="M12 3 2 20h20z" /><path {...sw} d="M12 10v4" /><circle cx="12" cy="17" r="1.1" fill="currentColor" /></>,
  'huevo': <><path {...sw} d="M12 3c4 0 7 6.5 7 11a7 7 0 0 1-14 0c0-4.5 3-11 7-11z" /></>,
  'tipo': <><path {...sw} d="M12 3c3 4 6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 9 7 12 3z" /><path {...sw} d="M10 15a2 2 0 0 0 2 2" /></>,
  'concurso': <><path {...sw} d="M8 21h8M12 17v4M7 4h10l-1 7a4 4 0 0 1-8 0z" /><path {...sw} d="m12 6 .8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3z" /></>,
  'moneda': <><circle {...sw} cx="12" cy="12" r="9" /><circle {...sw} cx="12" cy="12" r="5" /><path {...sw} d="M12 9.5v5" /></>,
  'encuentro': <><path {...sw} d="M3 20c2-5 5-8 9-8s7 3 9 8" /><path {...sw} d="M7 13c0-3 1-6 2-8 1 2 2 4 2 7M13 12c0-3 1.5-5 3-7 1 2.5 1.5 5 1 8" /></>,
  'evolucion': <><circle {...sw} cx="5" cy="12" r="2.5" /><circle {...sw} cx="12" cy="12" r="3" /><circle {...sw} cx="19.5" cy="12" r="2" /><path {...sw} d="M8 12h.5M15.5 12h1.5" /></>,
  'lugar': <><path {...sw} d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle {...sw} cx="12" cy="9.5" r="2.5" /></>,
  'maquina': <><circle {...sw} cx="12" cy="12" r="9" /><circle {...sw} cx="12" cy="12" r="2" /><path {...sw} d="M12 3v4M12 17v4" /></>,
  'idioma': <><path {...sw} d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 8-7 9" /><path {...sw} d="m12 21 4-9 4 9M13.5 18h5" /></>,
  'guia': <><path {...sw} d="M4 6h16M4 12h16M4 18h16" /></>,
  'perfil': <><circle {...sw} cx="12" cy="8" r="4" /><path {...sw} d="M4 21a8 8 0 0 1 16 0" /></>,
  'apagar': <><path {...sw} d="M12 3v9" /><path {...sw} d="M6.3 6.3a8 8 0 1 0 11.4 0" /></>,
  'descargar': <><path {...sw} d="M12 4v11M7 10l5 5 5-5M5 20h14" /></>,
  'reloj': <><circle {...sw} cx="12" cy="12" r="9" /><path {...sw} d="M12 7v5l3 2" /></>,
  'color': <><path {...sw} d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2.2-.6-1.4.3-2.8 1.8-2.8H18a3 3 0 0 0 3-3c0-5.5-4-10-9-10z" /><circle cx="7.5" cy="11" r="1.2" fill="currentColor" /><circle cx="10.5" cy="7" r="1.2" fill="currentColor" /><circle cx="15.5" cy="8" r="1.2" fill="currentColor" /></>,
  'forma': <><path {...sw} d="M12 3 21 9v6l-9 6-9-6V9z" /><path {...sw} d="m12 9 4 3-4 3-4-3z" /></>,
  'habitat': <><path {...sw} d="M12 3 5 13h4l-3 5h12l-3-5h4z" /><path {...sw} d="M12 18v3" /></>,
  'genero': <><circle {...sw} cx="9" cy="10" r="4.5" /><path {...sw} d="M9 14.5V21M6.5 18.5h5M12.5 6.5 19 3m0 0h-4m4 0v4" /></>,
  'naturaleza': <><path {...sw} d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path {...sw} d="M5 19 13 11" /></>,
};

export interface IconProps {
  name: IconName;
  size?: number;
  /** Con título el icono se anuncia (role="img"); sin él es decorativo (aria-hidden). */
  title?: string;
  className?: string;
}

export function Icon({ name, size = 24, title, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];
