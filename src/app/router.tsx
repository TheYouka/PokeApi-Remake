// Enrutado (§6). Raíz: ShellLayout con el errorElement global. Las tres rutas de pivote cuelgan de una
// ruta de layout SIN path con PivotLayout (chunk de entrada). Cada pantalla es un chunk lazy con su
// propio errorElement. /:resource y /:resource/:idOrName cubren los 49 recursos genéricos (FEAT-005).
import { createBrowserRouter, type RouteObject } from 'react-router';
import { PivotLayout } from '../ui/PivotLayout';
import { RouteError } from './RouteError';
import { ShellLayout } from './ShellLayout';

type LazyModule = { default: NonNullable<RouteObject['Component']> };
const screen = (load: () => Promise<LazyModule>) => async () => ({ Component: (await load()).default });

const home = screen(() => import('../screens/home/HomeScreen'));

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: ShellLayout,
    errorElement: <RouteError />,
    HydrateFallback: () => null,
    children: [
      {
        Component: PivotLayout,
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: home, errorElement: <RouteError /> },
          { path: 'hub/:pivot', lazy: home, errorElement: <RouteError /> },
          { path: 'ajustes', lazy: screen(() => import('../screens/settings/SettingsScreen')), errorElement: <RouteError /> },
        ],
      },
      { path: 'pokemon', lazy: screen(() => import('../screens/pokedex/PokedexScreen')), errorElement: <RouteError /> },
      { path: 'pokemon/:idOrName/:tab?', lazy: screen(() => import('../screens/pokemon/PokemonScreen')), errorElement: <RouteError /> },
      { path: 'tipos', lazy: screen(() => import('../screens/types/TypeChartScreen')), errorElement: <RouteError /> },
      { path: 'comparar', lazy: screen(() => import('../screens/compare/CompareScreen')), errorElement: <RouteError /> },
      { path: 'partida-rapida', lazy: screen(() => import('../screens/quickplay/QuickPlayScreen')), errorElement: <RouteError /> },
      { path: 'crear', lazy: screen(() => import('../screens/create/CreateScreen')), errorElement: <RouteError /> },
      { path: 'logros', lazy: screen(() => import('../screens/achievements/AchievementsScreen')), errorElement: <RouteError /> },
      { path: 'retro', lazy: screen(() => import('../screens/retro/RetroScreen')), errorElement: <RouteError /> },
      { path: 'apagar', lazy: screen(() => import('../screens/shutdown/ShutdownScreen')), errorElement: <RouteError /> },
      { path: 'api', lazy: screen(() => import('../screens/explorer/ExplorerScreen')), errorElement: <RouteError /> },
      { path: 'estadisticas', lazy: screen(() => import('../screens/stats/StatsScreen')), errorElement: <RouteError /> },
      { path: 'graficas', lazy: screen(() => import('../screens/charts/ChartsScreen')), errorElement: <RouteError /> },
      // Genéricas (§7.2): las rutas estáticas de arriba tienen prioridad por el ranking de React Router.
      { path: ':resource', lazy: screen(() => import('../screens/resource/ResourceListScreen')), errorElement: <RouteError /> },
      { path: ':resource/:idOrName', lazy: screen(() => import('../screens/resource/ResourceDetailScreen')), errorElement: <RouteError /> },
      { path: '*', lazy: screen(() => import('../screens/error/NotFoundScreen')), errorElement: <RouteError /> },
    ],
  },
];

// Vite expone la ruta base (vite.config.ts → base) en import.meta.env.BASE_URL, con '/' final.
// React Router la quiere sin la barra final ('/PokeApi-Remake'); en local queda en '/'.
// El optional chaining evita fallar si el módulo se importa desde Node (tests), donde no hay env.
function routerBasename(): string {
  const base = import.meta.env?.BASE_URL ?? '/';
  return base === '/' ? '/' : base.replace(/\/+$/, '');
}

// Se crea al primer render (no al importar), cuando main.tsx ya ha quitado ?boot= de la URL.
let router: ReturnType<typeof createBrowserRouter> | null = null;
export function getRouter(): ReturnType<typeof createBrowserRouter> {
  router ??= createBrowserRouter(routes, { basename: routerBasename() });
  return router;
}
