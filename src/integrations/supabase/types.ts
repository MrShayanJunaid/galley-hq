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
  public: {
    Tables: {
      ai_generation_events: {
        Row: {
          client_id: string | null
          completion_tokens: number | null
          content_item_id: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          generation_type: string
          id: string
          model: string | null
          prompt_tokens: number | null
          provider: string | null
          status: string
          total_tokens: number | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          completion_tokens?: number | null
          content_item_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          generation_type: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          completion_tokens?: number | null
          content_item_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          generation_type?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_events_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_analysis_runs: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          extracted: Json | null
          id: string
          pages: Json
          status: string
          updated_at: string
          website_url: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          extracted?: Json | null
          id?: string
          pages?: Json
          status?: string
          updated_at?: string
          website_url: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          extracted?: Json | null
          id?: string
          pages?: Json
          status?: string
          updated_at?: string
          website_url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_analysis_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_analysis_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_brand_profiles: {
        Row: {
          ai_suggestions: Json
          ai_suggestions_at: string | null
          brand_name: string | null
          brand_notes: string | null
          brand_positioning: string | null
          brand_voice: string | null
          client_id: string
          completed_at: string | null
          content_formats: string | null
          content_goals: string | null
          content_instructions: string | null
          content_topics: string | null
          created_at: string
          created_by: string | null
          cta_preferences: string | null
          customer_problems: string | null
          description: string | null
          desired_perception: string | null
          extras: Json
          field_sources: Json
          id: string
          industry: string | null
          key_differentiators: string | null
          key_offerings: string | null
          onboarding_status: string
          products_services: string | null
          reference_visual_analyzed_at: string | null
          reference_visual_error: string | null
          reference_visual_profile: Json
          reference_visual_signature: string | null
          reference_visual_status: string
          target_audience: string | null
          tone_preferences: string | null
          updated_at: string
          usp: string | null
          visual_config: Json
          voice_config: Json
          website_analysis: Json | null
          website_analysis_error: string | null
          website_analysis_status: string
          website_analyzed_at: string | null
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          ai_suggestions?: Json
          ai_suggestions_at?: string | null
          brand_name?: string | null
          brand_notes?: string | null
          brand_positioning?: string | null
          brand_voice?: string | null
          client_id: string
          completed_at?: string | null
          content_formats?: string | null
          content_goals?: string | null
          content_instructions?: string | null
          content_topics?: string | null
          created_at?: string
          created_by?: string | null
          cta_preferences?: string | null
          customer_problems?: string | null
          description?: string | null
          desired_perception?: string | null
          extras?: Json
          field_sources?: Json
          id?: string
          industry?: string | null
          key_differentiators?: string | null
          key_offerings?: string | null
          onboarding_status?: string
          products_services?: string | null
          reference_visual_analyzed_at?: string | null
          reference_visual_error?: string | null
          reference_visual_profile?: Json
          reference_visual_signature?: string | null
          reference_visual_status?: string
          target_audience?: string | null
          tone_preferences?: string | null
          updated_at?: string
          usp?: string | null
          visual_config?: Json
          voice_config?: Json
          website_analysis?: Json | null
          website_analysis_error?: string | null
          website_analysis_status?: string
          website_analyzed_at?: string | null
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          ai_suggestions?: Json
          ai_suggestions_at?: string | null
          brand_name?: string | null
          brand_notes?: string | null
          brand_positioning?: string | null
          brand_voice?: string | null
          client_id?: string
          completed_at?: string | null
          content_formats?: string | null
          content_goals?: string | null
          content_instructions?: string | null
          content_topics?: string | null
          created_at?: string
          created_by?: string | null
          cta_preferences?: string | null
          customer_problems?: string | null
          description?: string | null
          desired_perception?: string | null
          extras?: Json
          field_sources?: Json
          id?: string
          industry?: string | null
          key_differentiators?: string | null
          key_offerings?: string | null
          onboarding_status?: string
          products_services?: string | null
          reference_visual_analyzed_at?: string | null
          reference_visual_error?: string | null
          reference_visual_profile?: Json
          reference_visual_signature?: string | null
          reference_visual_status?: string
          target_audience?: string | null
          tone_preferences?: string | null
          updated_at?: string
          usp?: string | null
          visual_config?: Json
          voice_config?: Json
          website_analysis?: Json | null
          website_analysis_error?: string | null
          website_analysis_status?: string
          website_analyzed_at?: string | null
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_brand_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_brand_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_brand_references: {
        Row: {
          byte_size: number | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mime_type: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          byte_size?: number | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mime_type?: string | null
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          byte_size?: number | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mime_type?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_brand_references_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_brand_references_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_creatives: {
        Row: {
          aspect_ratio: string | null
          asset_type: string
          byte_size: number | null
          client_id: string
          concept: string | null
          content_item_id: string
          created_at: string
          created_by: string | null
          error_code: string | null
          error_message: string | null
          format_id: string | null
          id: string
          mime_type: string | null
          model: string | null
          prompt: string | null
          prompt_reference: Json
          provider: string | null
          reference_paths: Json
          status: string
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
          variant_index: number
          variant_label: string | null
          version: number
          workspace_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          asset_type?: string
          byte_size?: number | null
          client_id: string
          concept?: string | null
          content_item_id: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          format_id?: string | null
          id?: string
          mime_type?: string | null
          model?: string | null
          prompt?: string | null
          prompt_reference?: Json
          provider?: string | null
          reference_paths?: Json
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
          variant_index?: number
          variant_label?: string | null
          version?: number
          workspace_id: string
        }
        Update: {
          aspect_ratio?: string | null
          asset_type?: string
          byte_size?: number | null
          client_id?: string
          concept?: string | null
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          format_id?: string | null
          id?: string
          mime_type?: string | null
          model?: string | null
          prompt?: string | null
          prompt_reference?: Json
          provider?: string | null
          reference_paths?: Json
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
          variant_index?: number
          variant_label?: string | null
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_creatives_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_creatives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          body: string | null
          client_id: string
          content_type: string
          created_at: string
          created_by: string | null
          creative_prompt: Json
          cta: string | null
          generation_meta: Json
          hashtags: string[]
          hook: string | null
          id: string
          idea: Json
          objective: string
          platform: string
          status: string
          title: string | null
          topic: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          client_id: string
          content_type: string
          created_at?: string
          created_by?: string | null
          creative_prompt?: Json
          cta?: string | null
          generation_meta?: Json
          hashtags?: string[]
          hook?: string | null
          id?: string
          idea?: Json
          objective: string
          platform: string
          status?: string
          title?: string | null
          topic?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          client_id?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          creative_prompt?: Json
          cta?: string | null
          generation_meta?: Json
          hashtags?: string[]
          hook?: string | null
          id?: string
          idea?: Json
          objective?: string
          platform?: string
          status?: string
          title?: string | null
          topic?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_clients: number | null
          max_members: number | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_members?: number | null
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_clients?: number | null
          max_members?: number | null
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_provider: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_provider?: Database["public"]["Enums"]["billing_provider"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_user: {
        Args: { _full_name?: string; _workspace_name?: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["workspace_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "support"
      billing_provider: "none" | "stripe" | "paddle" | "manual"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "expired"
      workspace_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "support"],
      billing_provider: ["none", "stripe", "paddle", "manual"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "expired",
      ],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
