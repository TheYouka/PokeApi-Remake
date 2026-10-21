// Inicio y pivotes de hub (§10.3, §10.4): pila de TileRow con la tabla de pivots.ts, fila
// "Recientes" del store `recent` (solo en Inicio) y data-autofocus en el primer tile.
// Un :pivot fuera de {pokedex, juegos, objetos, movimientos, mundo, bayas} → 404 (§6).
import { useParams } from 'react-router';
import { useDocumentTitle } from '../../app/useRouteEffects';
import { es } from '../../i18n/es';
import { PIVOTS } from '../../registry/groups';
import { recent } from '../../state/recent';
import { useStore } from '../../state/store';
import { parseHubPivot } from '../../state/validation';
import { ErrorPanel } from '../../ui/ErrorPanel';
import { useHints } from '../../ui/HintBar';
import { SpriteImage } from '../../ui/SpriteImage';
import { Tile } from '../../ui/Tile';
import { TileRow } from '../../ui/TileRow';
import { DailyBerryTile, DailyPokemonTile, LastAchievementTile, PokedexCollageTile } from './LiveTiles';
import { PIVOT_ROWS, type HomePivot, type TileDef } from './pivots';
import styles from './HomeScreen.module.css';

const HINTS = [{ action: 'rb', label: es.hints.tabs, key: 'lbrb' }] as const;
const MAX_RECENT_TILES = 8;

export default function HomeScreen() {
  const { pivot: param } = useParams();
  const hub = param === undefined ? null : parseHubPivot(param);
  const pivot: HomePivot | null = param === undefined ? 'inicio' : hub;
  const label = pivot ? (PIVOTS.find((p) => p.id === pivot)?.label ?? es.pivots.inicio) : es.errors.notFound;
  useDocumentTitle(label);
  useHints(HINTS);

  if (pivot === null) return <ErrorPanel code="404" />;
  return <PivotTiles pivot={pivot} title={label} />;
}

function PivotTiles({ pivot, title }: { pivot: HomePivot; title: string }) {
  const rows = PIVOT_ROWS[pivot];
  return (
    <div className={styles.home}>
      <h1 className="sr-only" tabIndex={-1} data-focus-start="">{title}</h1>
      {rows.map((row, r) => (
        <TileRow key={row.id} id={row.id} title={row.title} rows={row.rows} hideTitle={r === 0}>
          {row.tiles.map((t, i) => <HomeTile key={`${row.id}:${t.id}`} def={t} autofocus={r === 0 && i === 0} />)}
        </TileRow>
      ))}
      {pivot === 'inicio' ? <RecentRow /> : null}
    </div>
  );
}

function HomeTile({ def, autofocus }: { def: TileDef; autofocus: boolean }) {
  switch (def.live) {
    case 'daily-pokemon': return <DailyPokemonTile def={def} autofocus={autofocus} />;
    case 'pokedex-collage': return <PokedexCollageTile def={def} autofocus={autofocus} />;
    case 'last-achievement': return <LastAchievementTile def={def} autofocus={autofocus} />;
    case 'daily-berry': return <DailyBerryTile def={def} autofocus={autofocus} />;
    default:
      return (
        <Tile id={def.id} size={def.size} variant={def.variant} icon={def.icon} title={def.title}
          ariaLabel={def.ariaLabel} to={def.to} autofocus={autofocus} />
      );
  }
}

function RecentRow() {
  const items = useStore(recent, (list) => list.slice(0, MAX_RECENT_TILES));
  if (items.length === 0) return null;
  return (
    <TileRow id="recientes" title={es.home.recent} rows={2}>
      {items.map((r) => (
        <Tile
          key={r.path}
          id={`reciente:${r.path}`}
          size={r.image ? 'wide' : 'medium'}
          variant={r.image ? 'image' : 'surface'}
          icon={r.image ? undefined : r.kind === 'pokemon' ? 'pokemon' : r.kind === 'resource' ? 'recurso' : 'flecha'}
          title={r.title}
          ariaLabel={es.home.recentAria(r.title)}
          to={r.path}
          media={r.image ? <span className={styles.recentMedia}><SpriteImage src={r.image} alt="" width={160} height={160} pixelated /></span> : undefined}
        />
      ))}
    </TileRow>
  );
}
