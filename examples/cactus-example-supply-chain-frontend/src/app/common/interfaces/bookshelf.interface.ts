export interface Bookshelf {
  id: string;
  shelfCount: number;
  color: string;
  status?: string; // 'AVAILABLE', 'SOLD', etc.
  owner?: string;
  price?: string;
  timestamp?: number;
}
