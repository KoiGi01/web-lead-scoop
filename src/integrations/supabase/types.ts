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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          service_type: string
          service_other: string | null
          client_type: string
          pricing_tier: string
          location: string | null
          sells_online: boolean
          created_at: string
        }
        Insert: {
          id: string
          service_type: string
          service_other?: string | null
          client_type: string
          pricing_tier: string
          location?: string | null
          sells_online?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          service_type?: string
          service_other?: string | null
          client_type?: string
          pricing_tier?: string
          location?: string | null
          sells_online?: boolean
          created_at?: string
        }
      }
      domain_intelligence: {
        Row: {
          domain: string
          opportunity_score: number | null
          business_maturity: string | null
          positioning: string | null
          detected_issues: Json | null
          opportunity_summary: string | null
          analyzed_at: string
        }
        Insert: {
          domain: string
          opportunity_score?: number | null
          business_maturity?: string | null
          positioning?: string | null
          detected_issues?: Json | null
          opportunity_summary?: string | null
          analyzed_at?: string
        }
        Update: {
          domain?: string
          opportunity_score?: number | null
          business_maturity?: string | null
          positioning?: string | null
          detected_issues?: Json | null
          opportunity_summary?: string | null
          analyzed_at?: string
        }
      }
      user_credits: {
        Row: {
          id: string
          user_id: string
          balance: number
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          plan?: string
          created_at?: string
          updated_at?: string
        }
      }
      search_sessions: {
        Row: {
          id: string
          user_id: string
          keyword: string
          location: string
          lead_count: number
          email_count: number
          whatsapp_count: number
          credits_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          keyword: string
          location: string
          lead_count?: number
          email_count?: number
          whatsapp_count?: number
          credits_used?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          keyword?: string
          location?: string
          lead_count?: number
          email_count?: number
          whatsapp_count?: number
          credits_used?: number
          created_at?: string
        }
      }
      saved_leads: {
        Row: {
          id: string
          user_id: string
          session_id: string
          name: string | null
          address: string | null
          phone: string | null
          website: string | null
          category: string | null
          emails: Json | null
          whatsapp: Json | null
          contacts: Json
          contact_page_found: boolean
          intelligence: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          name?: string | null
          address?: string | null
          phone?: string | null
          website?: string | null
          category?: string | null
          emails?: Json | null
          whatsapp?: Json | null
          contacts?: Json
          contact_page_found?: boolean
          intelligence?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          name?: string | null
          address?: string | null
          phone?: string | null
          website?: string | null
          category?: string | null
          emails?: Json | null
          whatsapp?: Json | null
          contacts?: Json
          contact_page_found?: boolean
          intelligence?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
