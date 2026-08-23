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
  created_at: string;
  updated_at: string;
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
