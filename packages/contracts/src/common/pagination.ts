export interface PageInfo {
  limit: number;
  offset: number;
  total: number;
}

export interface Paginated<T> {
  items: T[];
  page: PageInfo;
}