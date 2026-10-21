// Estado del panel Guía (decisión P-5). Abrirla dispara `guide-opened` ("Guía de bolsillo").
import { track } from './achievements';
import { createStore } from './store';

export type GuideTab = 'inicio' | 'logros' | 'notificaciones' | 'ajustes';
export interface GuideState { open: boolean; tab: GuideTab }

export const guide = createStore<GuideState>({ open: false, tab: 'inicio' });

export function openGuide(tab?: GuideTab): void {
  const cur = guide.get();
  const next: GuideState = { open: true, tab: tab ?? cur.tab };
  if (cur.open && cur.tab === next.tab) return;
  guide.set(next);
  if (!cur.open) track({ type: 'guide-opened' });
}

export function closeGuide(): void {
  const cur = guide.get();
  if (cur.open) guide.set({ ...cur, open: false });
}

export function toggleGuide(): void {
  if (guide.get().open) closeGuide();
  else openGuide();
}

export function setGuideTab(tab: GuideTab): void {
  const cur = guide.get();
  if (cur.tab !== tab) guide.set({ ...cur, tab });
}
