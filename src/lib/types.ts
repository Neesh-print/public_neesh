export type Frequency =
  | 'weekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'triannual'
  | 'biannual'
  | 'annual'
  | 'irregular'
  | 'evergreen';

export type TitleStatus = 'active' | 'dormant' | 'ceased';

export interface Publisher {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  country: string | null;
  city: string | null;
  claimed: boolean;
  // Where the publisher's own stockist list lives, and what we found there.
  stockist_page_url: string | null;
  stockist_status: StockistStatus | null;
  stockist_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StockistStatus = 'found' | 'no_list' | 'unreachable';

// A shop from directory_stores. Only public columns: claimant emails live
// on directory_store_claims, which the public site never reads.
export interface Store {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  borough: string | null;
  country: string;
  website: string | null;
  claimed: boolean;
  claimed_at: string | null;
  address: string | null;
  instagram: string | null;
  hours: string | null;
  description: string | null;
  // Has a retailer account on the Neesh marketplace.
  on_neesh: boolean;
}

// One row of v_store_titles: an Index title a shop carries.
export interface StoreTitle {
  title_id: string;
  title_name: string;
  title_slug: string;
  cover: string | null;
  available_on_neesh: boolean;
  publisher_name: string;
  publisher_slug: string;
  list_scope: 'title' | 'publisher';
  source_url: string;
  collected_at: string;
}

// A row of directory_cities. store_count and title_count are refreshed by
// refresh_directory_cities() after each stockist collection.
export interface City {
  slug: string;
  name: string;
  country: string;
  store_count: number;
  title_count: number;
  updated_at: string;
}

export interface CityStore {
  store_slug: string;
  store_name: string;
  borough: string | null;
  title_count: number;
}

// "Most stocked here": a title, or a publisher whose one stockist list
// covers several titles (counted once, with its titles listed).
export interface CityTopItem {
  kind: 'title' | 'publisher';
  title_name: string | null;
  title_slug: string | null;
  cover: string | null;
  available_on_neesh: boolean;
  publisher_name: string;
  publisher_slug: string;
  titles: { name: string; slug: string }[] | null;
  shops: number;
}

// One row of the spaces ranking (/stores).
export interface RankedStore {
  store_slug: string;
  store_name: string;
  city: string | null;
  country: string;
  city_slug: string | null;
  title_count: number;
}

export interface StoreNeighbor {
  store_slug: string;
  store_name: string;
  borough: string | null;
  shared: number;
}

// One row of v_title_stockists: a shop that carries a title.
export interface TitleStockist {
  store_slug: string;
  store_name: string;
  city: string | null;
  borough: string | null;
  country: string;
  city_slug: string | null;
  source_url: string;
  collected_at: string;
  // 'title': the shop is known to carry this title. 'publisher': it comes
  // from a publisher-wide list, so it carries something from the publisher.
  list_scope: 'title' | 'publisher';
}

export interface Title {
  id: string;
  publisher_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_path: string | null;
  frequency: Frequency | null;
  cover_price: number | null;
  currency: string | null;
  trim_size: string | null;
  page_count: number | null;
  country: string | null;
  city: string | null;
  status: TitleStatus;
  last_issue_date: string | null;
  verified_at: string | null;
  // Set when the title is listed and orderable on the Neesh platform now.
  available_on_neesh: boolean;
  neesh_magazine_id: string | null;
  neesh_listed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  intro_md: string | null;
}

export interface TagWithCount extends Tag {
  live_count: number;
}

export interface TitleWithPublisher extends Title {
  publisher: Publisher;
}

export interface TitleFull extends TitleWithPublisher {
  tags: Tag[];
}
