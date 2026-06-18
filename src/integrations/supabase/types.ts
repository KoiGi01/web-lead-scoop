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
          company_name: string | null
          full_name: string | null
          role_title: string | null
          company_website: string | null
          phone: string | null
          pipeline_stage_prefs: Json | null
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
          company_name?: string | null
          full_name?: string | null
          role_title?: string | null
          company_website?: string | null
          phone?: string | null
          pipeline_stage_prefs?: Json | null
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
          company_name?: string | null
          full_name?: string | null
          role_title?: string | null
          company_website?: string | null
          phone?: string | null
          pipeline_stage_prefs?: Json | null
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
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          current_period_start: string | null
          current_period_end: string | null
          included_monthly_credits: number
          monthly_credits_reset_at: string | null
          plan_source: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          included_monthly_credits?: number
          monthly_credits_reset_at?: string | null
          plan_source?: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          included_monthly_credits?: number
          monthly_credits_reset_at?: string | null
          plan_source?: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          owner_user_id: string
          plan: string
          seat_limit: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_user_id: string
          plan?: string
          seat_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_user_id?: string
          plan?: string
          seat_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_memberships: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_user_id: string | null
          target_user_id: string | null
          action: string
          before_data: Json
          after_data: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id?: string | null
          target_user_id?: string | null
          action: string
          before_data?: Json
          after_data?: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string | null
          target_user_id?: string | null
          action?: string
          before_data?: Json
          after_data?: Json
          metadata?: Json
          created_at?: string
        }
      }
      stripe_events: {
        Row: {
          id: string
          event_type: string
          processed_at: string
          metadata: Json
        }
        Insert: {
          id: string
          event_type: string
          processed_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          event_type?: string
          processed_at?: string
          metadata?: Json
        }
      }
      admin_users: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      api_usage_events: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          search_session_id: string | null
          lead_id: string | null
          depth: string | null
          enrich_mode: boolean
          usage_type: string
          provider: string
          operation: string
          endpoint: string | null
          status_code: number | null
          success: boolean
          latency_ms: number | null
          billable_units: number
          estimated_cost_usd: number
          credits_charged_to_user: number
          request_fingerprint: string | null
          result_count: number
          error_code: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          search_session_id?: string | null
          lead_id?: string | null
          depth?: string | null
          enrich_mode?: boolean
          usage_type?: string
          provider: string
          operation: string
          endpoint?: string | null
          status_code?: number | null
          success?: boolean
          latency_ms?: number | null
          billable_units?: number
          estimated_cost_usd?: number
          credits_charged_to_user?: number
          request_fingerprint?: string | null
          result_count?: number
          error_code?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          search_session_id?: string | null
          lead_id?: string | null
          depth?: string | null
          enrich_mode?: boolean
          usage_type?: string
          provider?: string
          operation?: string
          endpoint?: string | null
          status_code?: number | null
          success?: boolean
          latency_ms?: number | null
          billable_units?: number
          estimated_cost_usd?: number
          credits_charged_to_user?: number
          request_fingerprint?: string | null
          result_count?: number
          error_code?: string | null
          metadata?: Json
        }
      }
      credit_transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          search_session_id: string | null
          type: string
          amount: number
          balance_after: number | null
          usage_type: string
          description: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          search_session_id?: string | null
          type: string
          amount: number
          balance_after?: number | null
          usage_type?: string
          description?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          search_session_id?: string | null
          type?: string
          amount?: number
          balance_after?: number | null
          usage_type?: string
          description?: string | null
          metadata?: Json
        }
      }
      stripe_payments: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          checkout_session_id: string | null
          payment_intent_id: string | null
          stripe_customer_id: string | null
          bundle_key: string | null
          gross_usd: number
          stripe_fee_estimated_usd: number
          net_usd: number
          credits_granted: number
          currency: string
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          checkout_session_id?: string | null
          payment_intent_id?: string | null
          stripe_customer_id?: string | null
          bundle_key?: string | null
          gross_usd?: number
          stripe_fee_estimated_usd?: number
          net_usd?: number
          credits_granted?: number
          currency?: string
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          checkout_session_id?: string | null
          payment_intent_id?: string | null
          stripe_customer_id?: string | null
          bundle_key?: string | null
          gross_usd?: number
          stripe_fee_estimated_usd?: number
          net_usd?: number
          credits_granted?: number
          currency?: string
          metadata?: Json
        }
      }
      search_sessions: {
        Row: {
          id: string
          user_id: string
          keyword: string
          location: string
          depth: string | null
          enrich_mode: boolean
          selected_service: string | null
          opportunity_signals: string[]
          usage_type: string
          status: string
          lead_count: number
          email_count: number
          whatsapp_count: number
          credits_used: number
          estimated_cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          keyword: string
          location: string
          depth?: string | null
          enrich_mode?: boolean
          selected_service?: string | null
          opportunity_signals?: string[]
          usage_type?: string
          status?: string
          lead_count?: number
          email_count?: number
          whatsapp_count?: number
          credits_used?: number
          estimated_cost_usd?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          keyword?: string
          location?: string
          depth?: string | null
          enrich_mode?: boolean
          selected_service?: string | null
          opportunity_signals?: string[]
          usage_type?: string
          status?: string
          lead_count?: number
          email_count?: number
          whatsapp_count?: number
          credits_used?: number
          estimated_cost_usd?: number
          created_at?: string
        }
      }
      lead_list_previews: {
        Row: {
          id: string
          token: string
          created_by: string | null
          title: string
          description: string
          search_config: Json
          leads: Json
          lead_count: number
          is_public: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          created_by?: string | null
          title: string
          description?: string
          search_config?: Json
          leads?: Json
          lead_count?: number
          is_public?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          created_by?: string | null
          title?: string
          description?: string
          search_config?: Json
          leads?: Json
          lead_count?: number
          is_public?: boolean
          expires_at?: string | null
          created_at?: string
        }
      }
      email_campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          subject: string
          body: string
          signature: string
          image_url: string | null
          font_family: string
          from_name: string
          reply_to: string | null
          status: string
          scheduled_at: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          subject: string
          body: string
          signature?: string
          image_url?: string | null
          font_family?: string
          from_name?: string
          reply_to?: string | null
          status?: string
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          subject?: string
          body?: string
          signature?: string
          image_url?: string | null
          font_family?: string
          from_name?: string
          reply_to?: string | null
          status?: string
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_campaign_recipients: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          lead_id: string | null
          recipient_email: string
          recipient_name: string | null
          company_name: string | null
          status: string
          provider_message_id: string | null
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          lead_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          company_name?: string | null
          status?: string
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          lead_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          company_name?: string | null
          status?: string
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
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
          selected_service: string | null
          emails: Json | null
          whatsapp: Json | null
          contacts: Json
          linkedin_url: string | null
          social_links: Json
          contact_page_found: boolean
          intelligence: Json | null
          crm_status: string
          crm_priority: string
          crm_notes: string
          next_follow_up_at: string | null
          last_contacted_at: string | null
          crm_updated_at: string
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
          selected_service?: string | null
          emails?: Json | null
          whatsapp?: Json | null
          contacts?: Json
          linkedin_url?: string | null
          social_links?: Json
          contact_page_found?: boolean
          intelligence?: Json | null
          crm_status?: string
          crm_priority?: string
          crm_notes?: string
          next_follow_up_at?: string | null
          last_contacted_at?: string | null
          crm_updated_at?: string
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
          selected_service?: string | null
          emails?: Json | null
          whatsapp?: Json | null
          contacts?: Json
          linkedin_url?: string | null
          social_links?: Json
          contact_page_found?: boolean
          intelligence?: Json | null
          crm_status?: string
          crm_priority?: string
          crm_notes?: string
          next_follow_up_at?: string | null
          last_contacted_at?: string | null
          crm_updated_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      spend_credits: {
        Args: {
          p_amount: number
        }
        Returns: number
      }
      grant_user_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_stripe_customer_id?: string | null
        }
        Returns: number
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
  public: {
    Enums: {},
  },
} as const
