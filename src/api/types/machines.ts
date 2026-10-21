import type { NamedAPIResource } from './common';

export interface Machine {
  id: number;
  item: NamedAPIResource<'item'>;
  move: NamedAPIResource<'move'>;
  version_group: NamedAPIResource<'version-group'>;
}
