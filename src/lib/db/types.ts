export type { Database, Json } from '../../../supabase/database.types';
import type { Database } from '../../../supabase/database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type GalleryRow = Tables<'gallery'>;
export type ReferenceRow = Tables<'reference'>;
export type GalleryInsert = TablesInsert<'gallery'>;
export type GalleryUpdate = TablesUpdate<'gallery'>;
export type ReferenceInsert = TablesInsert<'reference'>;
export type ReferenceUpdate = TablesUpdate<'reference'>;

export interface RepositoryResult<T> {
  data: T | null;
  error: string | null;
}

export interface RepositoryListResult<T> {
  data: T[];
  error: string | null;
}

export type GalleryFilters = Partial<GalleryRow>;
export type ReferenceFilters = Partial<ReferenceRow>;