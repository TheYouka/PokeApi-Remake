import type { NamedAPIResource, Name } from './common';

export interface BerryFlavorMap { potency: number; flavor: NamedAPIResource<'berry-flavor'> }
export interface Berry {
  id: number;
  name: string;
  growth_time: number;
  max_harvest: number;
  natural_gift_power: number;
  size: number;
  smoothness: number;
  soil_dryness: number;
  firmness: NamedAPIResource<'berry-firmness'>;
  flavors: BerryFlavorMap[];
  item: NamedAPIResource<'item'>;
  natural_gift_type: NamedAPIResource<'type'>;
}

export interface BerryFirmness {
  id: number;
  name: string;
  berries: NamedAPIResource<'berry'>[];
  names: Name[];
}

export interface FlavorBerryMap { potency: number; berry: NamedAPIResource<'berry'> }
export interface BerryFlavor {
  id: number;
  name: string;
  berries: FlavorBerryMap[];
  contest_type: NamedAPIResource<'contest-type'>;
  names: Name[];
}
