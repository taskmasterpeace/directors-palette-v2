import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  GalleryRow,
  GalleryInsert,
  GalleryUpdate,
  GalleryFilters,
  RepositoryResult,
  RepositoryListResult,
} from '../types';
import { DatabaseErrorHandler } from '../error-handler';

export class GalleryRepository {
  constructor(private client: SupabaseClient<Database>) { }

  async create(data: GalleryInsert): Promise<RepositoryResult<GalleryRow>> {
    try {
      const { data: gallery, error } = await this.client
        .from('gallery')
        .insert(data)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: gallery,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  async get(filters: GalleryFilters = {}): Promise<RepositoryListResult<GalleryRow>> {
    try {
      let query = this.client.from('gallery').select('*');

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value === null) {
            // Explicitly filter for null values (e.g., uncategorized folder)
            query = query.is(key, null);
          } else if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      const { data: galleries, error } = await query;

      if (error) {
        return {
          data: [],
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: galleries || [],
        error: null,
      };
    } catch (error) {
      return {
        data: [],
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  async getPaginated(
    filters: GalleryFilters = {},
    options: {
      page: number;
      pageSize: number;
      orderBy?: string;
      ascending?: boolean;
      searchQuery?: string;
      sourceFilter?: string;
      metadataTypeFilter?: string;
    }
  ): Promise<RepositoryListResult<GalleryRow> & { total: number; totalPages: number }> {
    try {
      const { page, pageSize, orderBy = 'created_at', ascending = false, searchQuery, sourceFilter, metadataTypeFilter } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build count query — exclude failed records (they have no image and are deleted by webhook)
      let countQuery = this.client.from('gallery').select('*', { count: 'exact', head: true });
      countQuery = countQuery.neq('status', 'failed');
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value === null) {
            // Explicitly filter for null values (e.g., uncategorized folder)
            countQuery = countQuery.is(key, null);
          } else if (Array.isArray(value)) {
            countQuery = countQuery.in(key, value);
          } else {
            countQuery = countQuery.eq(key, value);
          }
        }
      });

      // Apply search query if provided
      // Note: The prompt is stored in the metadata JSON field, so we search metadata->>'prompt'
      if (searchQuery) {
        // Use textSearch on metadata->>'prompt' for searching within JSON field
        // Supabase/PostgreSQL syntax: metadata->>key for JSON text extraction
        countQuery = countQuery.or(`metadata->>prompt.ilike.%${searchQuery}%,metadata->>model.ilike.%${searchQuery}%`);
      }

      // Apply source filter if provided (filter by metadata->>'source')
      if (sourceFilter) {
        countQuery = countQuery.eq('metadata->>source', sourceFilter);
      }

      // Apply metadata type filter if provided (filter by metadata->>'type')
      if (metadataTypeFilter) {
        countQuery = countQuery.eq('metadata->>type', metadataTypeFilter);
      }

      // Build data query — exclude failed records
      let dataQuery = this.client.from('gallery').select('*');
      dataQuery = dataQuery.neq('status', 'failed');
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value === null) {
            // Explicitly filter for null values (e.g., uncategorized folder)
            dataQuery = dataQuery.is(key, null);
          } else if (Array.isArray(value)) {
            dataQuery = dataQuery.in(key, value);
          } else {
            dataQuery = dataQuery.eq(key, value);
          }
        }
      });

      // Apply search query if provided
      if (searchQuery) {
        dataQuery = dataQuery.or(`metadata->>prompt.ilike.%${searchQuery}%,metadata->>model.ilike.%${searchQuery}%`);
      }

      // Apply source filter if provided
      if (sourceFilter) {
        dataQuery = dataQuery.eq('metadata->>source', sourceFilter);
      }

      // Apply metadata type filter if provided
      if (metadataTypeFilter) {
        dataQuery = dataQuery.eq('metadata->>type', metadataTypeFilter);
      }

      // Apply ordering and pagination
      dataQuery = dataQuery.order(orderBy, { ascending }).range(from, to);

      // Execute both queries
      const [{ count, error: countError }, { data: galleries, error: dataError }] = await Promise.all([
        countQuery,
        dataQuery,
      ]);

      if (countError || dataError) {
        return {
          data: [],
          error: DatabaseErrorHandler.handle(countError || dataError).message,
          total: 0,
          totalPages: 0,
        };
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSize);

      return {
        data: galleries || [],
        error: null,
        total,
        totalPages,
      };
    } catch (error) {
      return {
        data: [],
        error: DatabaseErrorHandler.handle(error).message,
        total: 0,
        totalPages: 0,
      };
    }
  }

  async update(id: string, data: GalleryUpdate): Promise<RepositoryResult<GalleryRow>> {
    try {
      const { data: gallery, error } = await this.client
        .from('gallery')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: gallery,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  async delete(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from('gallery')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: true,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  async findByPredictionId(predictionId: string): Promise<RepositoryResult<GalleryRow>> {
    try {
      const { data: gallery, error } = await this.client
        .from('gallery')
        .select('*')
        .eq('prediction_id', predictionId)
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: gallery,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  async updateByPredictionId(predictionId: string, data: GalleryUpdate): Promise<RepositoryResult<GalleryRow>> {
    try {
      const { data: gallery, error } = await this.client
        .from('gallery')
        .update(data)
        .eq('prediction_id', predictionId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: gallery,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  async getInfinite(
    filters: GalleryFilters = {},
    options: {
      offset: number;
      limit: number;
      orderBy?: string;
      ascending?: boolean;
    }
  ): Promise<RepositoryListResult<GalleryRow> & { hasMore: boolean }> {
    try {
      const { offset, limit, orderBy = 'created_at', ascending = false } = options;

      // Fetch limit + 1 to check if there are more
      const from = offset;
      const to = from + limit; // fetch one extra

      // Build query with filters
      let query = this.client.from('gallery').select('*');

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value === null) {
            query = query.is(key, null);
          } else if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply ordering and range
      query = query.order(orderBy, { ascending }).range(from, to);

      const { data: galleries, error } = await query;

      if (error) {
        return {
          data: [],
          error: DatabaseErrorHandler.handle(error).message,
          hasMore: false,
        };
      }

      // Check if there are more items
      const hasMore = (galleries || []).length > limit;
      const data = hasMore ? galleries.slice(0, limit) : galleries || [];

      return {
        data,
        error: null,
        hasMore,
      };
    } catch (error) {
      return {
        data: [],
        error: DatabaseErrorHandler.handle(error).message,
        hasMore: false,
      };
    }
  }
}