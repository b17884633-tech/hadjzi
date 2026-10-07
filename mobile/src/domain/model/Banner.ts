export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  actionType?: 'PROVIDER' | 'SERVICE' | 'CATEGORY' | 'URL' | null;
  actionTarget?: string | null;
  sortOrder?: number;
}
