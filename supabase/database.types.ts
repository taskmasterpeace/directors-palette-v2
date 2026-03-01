export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          tagline: string | null
          industry: string | null
          audience_json: Json | null
          voice_json: Json | null
          visual_identity_json: Json | null
          music_json: Json | null
          visual_style_json: Json | null
          brand_guide_image_url: string | null
          raw_company_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          tagline?: string | null
          industry?: string | null
          audience_json?: Json | null
          voice_json?: Json | null
          visual_identity_json?: Json | null
          music_json?: Json | null
          visual_style_json?: Json | null
          brand_guide_image_url?: string | null
          raw_company_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          tagline?: string | null
          industry?: string | null
          audience_json?: Json | null
          voice_json?: Json | null
          visual_identity_json?: Json | null
          music_json?: Json | null
          visual_style_json?: Json | null
          brand_guide_image_url?: string | null
          raw_company_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gallery: {
        Row: {
          created_at: string
          error_message: string | null
          file_size: number | null
          folder_id: string | null
          generation_type: Database["public"]["Enums"]["generation_type"]
          id: string
          metadata: Json | null
          mime_type: string | null
          prediction_id: string
          public_url: string | null
          status: Database["public"]["Enums"]["status"]
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          folder_id?: string | null
          generation_type?: Database["public"]["Enums"]["generation_type"]
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          prediction_id: string
          public_url?: string | null
          status?: Database["public"]["Enums"]["status"]
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_size?: number | null
          folder_id?: string | null
          generation_type?: Database["public"]["Enums"]["generation_type"]
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          prediction_id?: string
          public_url?: string | null
          status?: Database["public"]["Enums"]["status"]
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reference: {
        Row: {
          category: string
          created_at: string
          gallery_id: string
          id: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          gallery_id: string
          id?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          gallery_id?: string
          id?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          config: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wildcards: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string | null
          content: string
          description: string | null
          is_shared: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string | null
          content: string
          description?: string | null
          is_shared?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string | null
          content?: string
          description?: string | null
          is_shared?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      generation_events: {
        Row: {
          id: string
          user_id: string
          user_email: string | null
          gallery_id: string | null
          prediction_id: string | null
          generation_type: string
          model_id: string
          model_name: string | null
          status: string
          credits_cost: number
          is_admin_generation: boolean
          prompt: string | null
          settings: Json | null
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          user_email?: string | null
          gallery_id?: string | null
          prediction_id?: string | null
          generation_type?: string
          model_id: string
          model_name?: string | null
          status?: string
          credits_cost?: number
          is_admin_generation?: boolean
          prompt?: string | null
          settings?: Json | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          user_email?: string | null
          gallery_id?: string | null
          prediction_id?: string | null
          generation_type?: string
          model_id?: string
          model_name?: string | null
          status?: string
          credits_cost?: number
          is_admin_generation?: boolean
          prompt?: string | null
          settings?: Json | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_events_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery"
            referencedColumns: ["id"]
          }
        ]
      }
      community_items: {
        Row: {
          id: string
          type: string
          name: string
          description: string | null
          category: string
          tags: string[]
          content: Json
          submitted_by: string | null
          submitted_by_name: string
          submitted_at: string
          status: string
          approved_by: string | null
          approved_at: string | null
          rejected_reason: string | null
          add_count: number
          rating_sum: number
          rating_count: number
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          name: string
          description?: string | null
          category: string
          tags?: string[]
          content: Json
          submitted_by?: string | null
          submitted_by_name: string
          submitted_at?: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          add_count?: number
          rating_sum?: number
          rating_count?: number
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          name?: string
          description?: string | null
          category?: string
          tags?: string[]
          content?: Json
          submitted_by?: string | null
          submitted_by_name?: string
          submitted_at?: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          add_count?: number
          rating_sum?: number
          rating_count?: number
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_ratings: {
        Row: {
          id: string
          user_id: string
          community_item_id: string
          rating: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          community_item_id: string
          rating: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          community_item_id?: string
          rating?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_ratings_community_item_id_fkey"
            columns: ["community_item_id"]
            isOneToOne: false
            referencedRelation: "community_items"
            referencedColumns: ["id"]
          }
        ]
      }
      user_library_items: {
        Row: {
          id: string
          user_id: string
          community_item_id: string | null
          type: string
          name: string
          content: Json
          is_modified: boolean
          submitted_to_community: boolean
          community_status: string | null
          added_at: string
          modified_at: string
        }
        Insert: {
          id?: string
          user_id: string
          community_item_id?: string | null
          type: string
          name: string
          content: Json
          is_modified?: boolean
          submitted_to_community?: boolean
          community_status?: string | null
          added_at?: string
          modified_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          community_item_id?: string | null
          type?: string
          name?: string
          content?: Json
          is_modified?: boolean
          submitted_to_community?: boolean
          community_status?: string | null
          added_at?: string
          modified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_library_items_community_item_id_fkey"
            columns: ["community_item_id"]
            isOneToOne: false
            referencedRelation: "community_items"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      generation_type: "image" | "video"
      status: "pending" | "processing" | "completed" | "failed" | "canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      generation_type: ["image", "video"],
      status: ["pending", "processing", "completed", "failed", "canceled"],
    },
  },
} as const
