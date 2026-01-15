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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_requests: {
        Row: {
          club_name: string
          created_at: string
          description: string | null
          id: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          club_name: string
          created_at?: string
          description?: string | null
          id?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          club_name?: string
          created_at?: string
          description?: string | null
          id?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_approved: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_approved?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_approved?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      duel_answers: {
        Row: {
          answer: string
          answer_time_ms: number | null
          created_at: string
          id: string
          is_correct: boolean | null
          player_id: string
          room_id: string
          route_index: number
        }
        Insert: {
          answer: string
          answer_time_ms?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          player_id: string
          room_id: string
          route_index: number
        }
        Update: {
          answer?: string
          answer_time_ms?: number | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          player_id?: string
          room_id?: string
          route_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_answers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "duel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_rooms: {
        Row: {
          created_at: string
          current_route_index: number | null
          game_ends_at: string | null
          game_started_at: string | null
          guest_id: string | null
          guest_name: string | null
          guest_ready: boolean | null
          guest_score: number | null
          host_id: string
          host_name: string | null
          host_ready: boolean | null
          host_score: number | null
          id: string
          room_code: string
          routes: Json | null
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_route_index?: number | null
          game_ends_at?: string | null
          game_started_at?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_ready?: boolean | null
          guest_score?: number | null
          host_id: string
          host_name?: string | null
          host_ready?: boolean | null
          host_score?: number | null
          id?: string
          room_code: string
          routes?: Json | null
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_route_index?: number | null
          game_ends_at?: string | null
          game_started_at?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_ready?: boolean | null
          guest_score?: number | null
          host_id?: string
          host_name?: string | null
          host_ready?: boolean | null
          host_score?: number | null
          id?: string
          room_code?: string
          routes?: Json | null
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      maps: {
        Row: {
          created_at: string
          description: string | null
          file_url: string
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url: string
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      route_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          map_name: string
          response_time: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          map_name: string
          response_time: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          map_name?: string
          response_time?: number
          user_id?: string
        }
        Relationships: []
      }
      route_images: {
        Row: {
          alt_route_length: number | null
          alt_route_lengths: Json | null
          aspect_ratio: string
          candidate_index: number
          created_at: string
          id: string
          image_path: string
          main_route_length: number | null
          map_id: string
          num_alternates: number | null
          shortest_side: string
        }
        Insert: {
          alt_route_length?: number | null
          alt_route_lengths?: Json | null
          aspect_ratio: string
          candidate_index: number
          created_at?: string
          id?: string
          image_path: string
          main_route_length?: number | null
          map_id: string
          num_alternates?: number | null
          shortest_side: string
        }
        Update: {
          alt_route_length?: number | null
          alt_route_lengths?: Json | null
          aspect_ratio?: string
          candidate_index?: number
          created_at?: string
          id?: string
          image_path?: string
          main_route_length?: number | null
          map_id?: string
          num_alternates?: number | null
          shortest_side?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_images_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "route_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      route_maps: {
        Row: {
          country_code: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          logo_path: string | null
          map_category: string | null
          map_type: string | null
          name: string
          source_map_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          logo_path?: string | null
          map_category?: string | null
          map_type?: string | null
          name: string
          source_map_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          logo_path?: string | null
          map_category?: string | null
          map_type?: string | null
          name?: string
          source_map_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_route_maps_source_map"
            columns: ["source_map_id"]
            isOneToOne: false
            referencedRelation: "user_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_map_stats: {
        Row: {
          accuracy: number | null
          attempts: Json | null
          created_at: string
          id: string
          map_name: string
          previous_rank: number | null
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          attempts?: Json | null
          created_at?: string
          id?: string
          map_name: string
          previous_rank?: number | null
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          attempts?: Json | null
          created_at?: string
          id?: string
          map_name?: string
          previous_rank?: number | null
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_map_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_maps: {
        Row: {
          bw_tif_path: string
          color_tif_path: string
          created_at: string
          error_message: string | null
          id: string
          is_tiled: boolean | null
          last_activity_at: string | null
          name: string
          processing_parameters: Json | null
          r2_bw_key: string | null
          r2_color_key: string | null
          roi_coordinates: Json
          status: string
          storage_provider: string | null
          tile_grid: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bw_tif_path: string
          color_tif_path: string
          created_at?: string
          error_message?: string | null
          id?: string
          is_tiled?: boolean | null
          last_activity_at?: string | null
          name: string
          processing_parameters?: Json | null
          r2_bw_key?: string | null
          r2_color_key?: string | null
          roi_coordinates: Json
          status?: string
          storage_provider?: string | null
          tile_grid?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bw_tif_path?: string
          color_tif_path?: string
          created_at?: string
          error_message?: string | null
          id?: string
          is_tiled?: boolean | null
          last_activity_at?: string | null
          name?: string
          processing_parameters?: Json | null
          r2_bw_key?: string | null
          r2_color_key?: string | null
          roi_coordinates?: Json
          status?: string
          storage_provider?: string | null
          tile_grid?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          accuracy: number | null
          alltime_correct: number | null
          alltime_time_sum: number | null
          alltime_total: number | null
          attempts: Json | null
          bio: string | null
          created_at: string
          id: string
          name: string | null
          previous_rank: number | null
          profile_image: string | null
          speed: number | null
          tutorial_seen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          alltime_correct?: number | null
          alltime_time_sum?: number | null
          alltime_total?: number | null
          attempts?: Json | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string | null
          previous_rank?: number | null
          profile_image?: string | null
          speed?: number | null
          tutorial_seen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          alltime_correct?: number | null
          alltime_time_sum?: number | null
          alltime_total?: number | null
          attempts?: Json | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string | null
          previous_rank?: number | null
          profile_image?: string | null
          speed?: number | null
          tutorial_seen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_duel_rooms: { Args: never; Returns: undefined }
      generate_room_code: { Args: never; Returns: string }
      has_pro_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "pro"
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
      app_role: ["admin", "user", "pro"],
    },
  },
} as const
