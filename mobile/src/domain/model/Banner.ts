export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  actionType: 'PROVIDER' | 'SERVICE' | 'CATEGORY' | 'URL';
  actionTarget: string;
  sortOrder: number;
}
