export interface Category {
  id: number;
  name: string;
  iconUrl?: string | null;
  parentId?: number | null;
  bookingType?: string;
  sortOrder?: number;
  children?: Category[];
}
