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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      courses: {
        Row: {
          created_at: string
          details: string | null
          difficulty_tier: string | null
          id: string
          lat: number | null
          lng: number | null
          location: string
          name: string
          slug: string
          source_url: string | null
          terrain_type: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          difficulty_tier?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location: string
          name: string
          slug: string
          source_url?: string | null
          terrain_type?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          difficulty_tier?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string
          name?: string
          slug?: string
          source_url?: string | null
          terrain_type?: string | null
        }
        Relationships: []
      }
      hole_scores: {
        Row: {
          created_at: string
          fairway_hit: boolean | null
          hole_id: string
          id: string
          ob: boolean
          participant_id: string
          round_id: string
          strokes: number
        }
        Insert: {
          created_at?: string
          fairway_hit?: boolean | null
          hole_id: string
          id?: string
          ob?: boolean
          participant_id: string
          round_id: string
          strokes: number
        }
        Update: {
          created_at?: string
          fairway_hit?: boolean | null
          hole_id?: string
          id?: string
          ob?: boolean
          participant_id?: string
          round_id?: string
          strokes?: number
        }
        Relationships: [
          {
            foreignKeyName: "hole_scores_hole_id_fkey"
            columns: ["hole_id"]
            isOneToOne: false
            referencedRelation: "holes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hole_scores_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "round_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hole_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      holes: {
        Row: {
          created_at: string
          distance_m: number
          hole_map_url: string | null
          hole_number: number
          id: string
          layout_id: string
          notes: string | null
          par: number
        }
        Insert: {
          created_at?: string
          distance_m: number
          hole_map_url?: string | null
          hole_number: number
          id?: string
          layout_id: string
          notes?: string | null
          par: number
        }
        Update: {
          created_at?: string
          distance_m?: number
          hole_map_url?: string | null
          hole_number?: number
          id?: string
          layout_id?: string
          notes?: string | null
          par?: number
        }
        Relationships: [
          {
            foreignKeyName: "holes_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      layouts: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          map_url: string | null
          name: string
          slug: string
          total_distance_m: number
          total_par: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          map_url?: string | null
          name: string
          slug: string
          total_distance_m: number
          total_par: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          map_url?: string | null
          name?: string
          slug?: string
          total_distance_m?: number
          total_par?: number
        }
        Relationships: [
          {
            foreignKeyName: "layouts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          visibility: string
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          visibility?: string
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          visibility?: string
        }
        Relationships: []
      }
      round_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          round_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          round_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          round_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_invitations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_participants: {
        Row: {
          created_at: string
          guest_name: string | null
          id: string
          joined_at: string
          round_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_name?: string | null
          id?: string
          joined_at?: string
          round_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_name?: string | null
          id?: string
          joined_at?: string
          round_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_participants_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          layout_id: string
          scorer_id: string
          started_at: string
          starting_hole: number
          status: string
          tournament_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          layout_id: string
          scorer_id: string
          started_at?: string
          starting_hole?: number
          status?: string
          tournament_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          layout_id?: string
          scorer_id?: string
          started_at?: string
          starting_hole?: number
          status?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_round_invite: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
      is_round_member: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
      is_round_scorer: {
        Args: { p_round_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
