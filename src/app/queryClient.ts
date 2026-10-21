// QueryClient con las opciones de §5.1.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({ defaultOptions: { queries: {
  retry: false,                 // los reintentos son del cliente (§4.6)
  staleTime: 24 * 60 * 60_000,  // ≥ 24 h (RF-API-4)
  gcTime: 60 * 60_000,          // 1 h en memoria tras dejar de usarse
  networkMode: 'always',        // IMPRESCINDIBLE: sin conexión el queryFn debe ejecutarse para leer caché persistente
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,     // reintenta consultas en error al volver la red
  structuralSharing: false,     // evita comparar en profundidad JSON de 300 KB
}}});
