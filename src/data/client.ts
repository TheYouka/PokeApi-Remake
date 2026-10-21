// Instancia única del cliente para el navegador (§4, §5).
import { createPokeApiClient, type ClientEvent } from '../api/index';
import { defaultFetch } from '../api/http';
import { browserLocalStorage } from '../api/storage';
import { es } from '../i18n/es';
import { reportNetworkFailure, reportSuccess } from '../state/connectivity';
import { notifyOnce } from '../state/notifications';

function onEvent(e: ClientEvent): void {
  switch (e.type) {
    case 'network-failure':
      reportNetworkFailure();
      break;
    case 'stale-served':
      notifyOnce('stale-served', { kind: 'info', title: es.notif.staleServed });
      break;
    case 'persist-disabled':
      if (e.reason === 'quota') notifyOnce('storage-full', { kind: 'storage', title: es.notif.storageFull });
      break;
    case 'request':
      break;
  }
}

/**
 * El cliente no emite un evento de éxito: cualquier respuesta HTTP que llega de la red
 * (también un 404) demuestra que hay conexión, así que se informa a `connectivity` aquí.
 */
const trackedFetch: typeof fetch = (input, init) =>
  defaultFetch(input, init).then((res) => {
    reportSuccess();
    return res;
  });

export const pokeApi = createPokeApiClient({
  maxConcurrency: 6,
  persistent: browserLocalStorage(),
  fetchImpl: trackedFetch,
  onEvent,
});
