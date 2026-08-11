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
  cashflow: {
    Tables: {
      agent_tool_audit: {
        Row: {
          created_at: string
          channel: string
          id: string
          latency_ms: number
          owner_id: string
          request_id: string
          release_id: string
          status: string
          tenant_id: string
          tool_name: string
        }
        Insert: {
          created_at?: string
          channel?: string
          id?: string
          latency_ms: number
          owner_id: string
          request_id: string
          release_id?: string
          status: string
          tenant_id: string
          tool_name: string
        }
        Update: {
          created_at?: string
          channel?: string
          id?: string
          latency_ms?: number
          owner_id?: string
          request_id?: string
          release_id?: string
          status?: string
          tenant_id?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_account: {
        Row: {
          created_at: string
          currency: string
          current_balance: number
          id: string
          name: string
          owner_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          name: string
          owner_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          name?: string
          owner_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      expense: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          funded_by: string
          id: string
          net_amount: number
          owner_id: string
          provider: string | null
          record_date: string
          tenant_id: string
          total_amount: number
          updated_at: string
          vat_amount: number
          vat_status: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          funded_by?: string
          id?: string
          net_amount: number
          owner_id: string
          provider?: string | null
          record_date?: string
          tenant_id: string
          total_amount: number
          updated_at?: string
          vat_amount?: number
          vat_status?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          funded_by?: string
          id?: string
          net_amount?: number
          owner_id?: string
          provider?: string | null
          record_date?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
        Row: {
          contact_name: string | null
          created_at: string
          currency: string
          due_date: string
          external_id: string | null
          id: string
          issue_date: string
          owner_id: string
          source_system: string
          status: string
          tenant_id: string
          total_amount: number
          type: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          currency?: string
          due_date: string
          external_id?: string | null
          id?: string
          issue_date?: string
          owner_id: string
          source_system?: string
          status?: string
          tenant_id: string
          total_amount: number
          type: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          external_id?: string | null
          id?: string
          issue_date?: string
          owner_id?: string
          source_system?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contributions: {
        Row: {
          amount_clp: number
          created_at: string
          description: string | null
          financial_item: string | null
          id: string
          owner_id: string
          partner_name: string
          record_date: string
          tenant_id: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount_clp: number
          created_at?: string
          description?: string | null
          financial_item?: string | null
          id?: string
          owner_id: string
          partner_name: string
          record_date?: string
          tenant_id: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount_clp?: number
          created_at?: string
          description?: string | null
          financial_item?: string | null
          id?: string
          owner_id?: string
          partner_name?: string
          record_date?: string
          tenant_id?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contributions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_usage: {
        Row: {
          count: number
          owner_id: string
          period: string
          updated_at: string
        }
        Insert: {
          count?: number
          owner_id: string
          period: string
          updated_at?: string
        }
        Update: {
          count?: number
          owner_id?: string
          period?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transaction: {
        Row: {
          amount: number
          created_at: string
          currency: string
          frequency: string
          id: string
          name: string
          next_date: string
          owner_id: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          frequency: string
          id?: string
          name: string
          next_date: string
          owner_id: string
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          frequency?: string
          id?: string
          name?: string
          next_date?: string
          owner_id?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue: {
        Row: {
          client_name: string | null
          created_at: string
          exchange_rate: number
          gateway_commission: number
          gross_amount_clp: number
          gross_amount_usd: number
          id: string
          net_income_clp: number
          owner_id: string
          plan_name: string | null
          record_date: string
          tenant_id: string
          updated_at: string
          vat_amount: number
          vat_status: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          exchange_rate?: number
          gateway_commission?: number
          gross_amount_clp?: number
          gross_amount_usd?: number
          id?: string
          net_income_clp?: number
          owner_id: string
          plan_name?: string | null
          record_date?: string
          tenant_id: string
          updated_at?: string
          vat_amount?: number
          vat_status?: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          exchange_rate?: number
          gateway_commission?: number
          gross_amount_clp?: number
          gross_amount_usd?: number
          id?: string
          net_income_clp?: number
          owner_id?: string
          plan_name?: string | null
          record_date?: string
          tenant_id?: string
          updated_at?: string
          vat_amount?: number
          vat_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant: {
        Row: {
          business_model: string
          business_model_diagnosed_at: string | null
          business_model_source: string | null
          business_profile: Json
          created_at: string
          default_tax_rate: number
          financial_onboarding_completed_at: string | null
          id: string
          name: string
          owner_id: string
          ppm_rate: number
          updated_at: string
          weekly_alerts_enabled: boolean
          country_code: string | null
          base_currency: string | null
          timezone: string | null
          company_context_completed_at: string | null
          terms_accepted_at: string | null
          privacy_accepted_at: string | null
          legal_version: string | null
          is_demo: boolean
        }
        Insert: {
          business_model?: string
          business_model_diagnosed_at?: string | null
          business_model_source?: string | null
          business_profile?: Json
          created_at?: string
          default_tax_rate?: number
          financial_onboarding_completed_at?: string | null
          id?: string
          name?: string
          owner_id: string
          ppm_rate?: number
          updated_at?: string
          weekly_alerts_enabled?: boolean
          country_code?: string | null
          base_currency?: string | null
          timezone?: string | null
          company_context_completed_at?: string | null
          terms_accepted_at?: string | null
          privacy_accepted_at?: string | null
          legal_version?: string | null
          is_demo?: boolean
        }
        Update: {
          business_model?: string
          business_model_diagnosed_at?: string | null
          business_model_source?: string | null
          business_profile?: Json
          created_at?: string
          default_tax_rate?: number
          financial_onboarding_completed_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          ppm_rate?: number
          updated_at?: string
          weekly_alerts_enabled?: boolean
          country_code?: string | null
          base_currency?: string | null
          timezone?: string | null
          company_context_completed_at?: string | null
          terms_accepted_at?: string | null
          privacy_accepted_at?: string | null
          legal_version?: string | null
          is_demo?: boolean
        }
        Relationships: []
      }
      transaction: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          created_at: string
          id: string
          import_batch_id: string | null
          import_fingerprint: string | null
          owner_id: string
          source_reference: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          import_fingerprint?: string | null
          owner_id: string
          source_reference?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          import_fingerprint?: string | null
          owner_id?: string
          source_reference?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_account"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      list_denarius_tenants:{Args:Record<never,never>;Returns:Database["cashflow"]["Tables"]["tenant"]["Row"][]}
      get_active_denarius_tenant:{Args:Record<never,never>;Returns:Database["cashflow"]["Tables"]["tenant"]["Row"]|null}
      set_active_denarius_tenant:{Args:{p_tenant_id:string};Returns:Database["cashflow"]["Tables"]["tenant"]["Row"]}
      reset_denarius_demo_pyme:{Args:Record<never,never>;Returns:Database["cashflow"]["Tables"]["tenant"]["Row"]}
      reset_denarius_demo_startup:{Args:Record<never,never>;Returns:Database["cashflow"]["Tables"]["tenant"]["Row"]}
      save_copilot_history: { Args: { p_tenant_id: string; p_question: string; p_answer_summary: string; p_tool_name: string; p_as_of: string; p_deep_link: string; p_evidence: Json }; Returns: string }
      list_copilot_history: { Args: { p_tenant_id: string; p_tool_name?: string | null; p_limit?: number }; Returns: Json }
      delete_copilot_history: { Args: { p_tenant_id: string; p_entry_id?: string | null }; Returns: number }
      complete_financial_onboarding: {
        Args: { p_tenant_id: string; p_account_name: string; p_opening_balance: number; p_monthly_income: number; p_monthly_costs: number; p_first_projection_date?: string }
        Returns: Json
      }
      import_transactions_csv: {
        Args: { p_account_id: string; p_file_name: string; p_rows: Json }
        Returns: Json
      }
      preview_transaction_import: {
        Args: { p_account_id: string; p_rows: Json }
        Returns: Json
      }
      check_and_increment_pdf_usage: {
        Args: { p_limit?: number }
        Returns: Json
      }
      fmt_clp_short: {
        Args: { amount: number }
        Returns: string
      }
      financial_core_metrics: {
        Args: { p_as_of?: string; p_tenant_id: string }
        Returns: Json
      }
      financial_alert_center: {
        Args: { p_as_of?: string; p_tenant_id: string }
        Returns: Json
      }
      activation_status: { Args: { p_tenant_id: string }; Returns: Json }
      release_health: { Args: { p_release_id: string; p_since?: string }; Returns: Json }
      save_unit_economics_input: { Args: { p_tenant_id:string;p_period:string;p_acquisition_spend:number;p_delivery_costs:number;p_units_sold?:number|null;p_customers_acquired?:number|null }; Returns: undefined }
      unit_economics: { Args: { p_tenant_id:string;p_period?:string }; Returns: Json }
      weekly_close_workspace: { Args: { p_tenant_id:string;p_as_of?:string }; Returns: Json }
      complete_weekly_close: { Args: { p_tenant_id:string;p_as_of:string;p_acknowledged:boolean;p_note?:string|null }; Returns: string }
      complete_weekly_close_with_plan:{Args:{p_tenant_id:string;p_as_of:string;p_acknowledged:boolean;p_note?:string|null};Returns:Json}
      financial_action_plan_workspace:{Args:{p_tenant_id:string};Returns:Json}
      weekly_action_outcome:{Args:{p_tenant_id:string};Returns:Json}
      create_beta_support_case:{Args:{p_tenant_id:string;p_category:string;p_surface:string;p_priority:string;p_summary?:string|null};Returns:Json}
      beta_support_workspace:{Args:{p_tenant_id:string};Returns:Json}
      emergency_revoke_denarius_keys:{Args:{p_tenant_id:string};Returns:Json}
      data_freshness_workspace:{Args:{p_tenant_id:string;p_as_of?:string};Returns:Json}
      denarius_access_context:{Args:{p_tenant_id:string};Returns:Json}
      ensure_denarius_tenant:{Args:Record<never,never>;Returns:Database["cashflow"]["Tables"]["tenant"]["Row"]}
      save_company_context:{Args:{p_tenant_id:string;p_name:string;p_country_code:string;p_base_currency:string;p_timezone:string;p_accept_terms:boolean;p_accept_privacy:boolean;p_legal_version:string};Returns:Database["cashflow"]["Tables"]["tenant"]["Row"]}
      unit_economics_input_context:{Args:{p_tenant_id:string;p_period:string};Returns:Json}
      create_saas_subscription: {
        Args: { p_customer_name: string; p_monthly_mrr: number; p_plan_name: string; p_started_at?: string; p_tenant_id: string }
        Returns: string
      }
      change_saas_subscription: {
        Args: { p_effective_date?: string; p_new_mrr: number; p_status: string; p_subscription_id: string }
        Returns: undefined
      }
      update_saas_subscription: {
        Args: { p_effective_date?: string; p_new_mrr: number; p_new_plan_name: string; p_note?: string | null; p_status: string; p_subscription_id: string }
        Returns: string
      }
      saas_subscription_history: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      saas_retention_metrics: {
        Args: { p_months?: number; p_tenant_id: string }
        Returns: Json
      }
      saas_customer_risk: { Args: { p_tenant_id: string }; Returns: Json }
      update_saas_renewal: { Args: { p_note?: string|null; p_owner: string; p_renewal_date: string; p_status: string; p_subscription_id: string }; Returns: undefined }
      saas_renewal_workspace: { Args: { p_tenant_id: string }; Returns: Json }
      create_msp_task:{Args:{p_assignee:string;p_due_date:string|null;p_priority:string;p_source?:string;p_subscription_id?:string|null;p_tenant_id:string;p_title:string};Returns:string}
      update_msp_task_status:{Args:{p_comment?:string|null;p_status:string;p_task_id:string};Returns:undefined}
      comment_msp_task:{Args:{p_body:string;p_task_id:string};Returns:undefined}
      msp_task_workspace:{Args:{p_tenant_id:string};Returns:Json}
      create_financial_task:{Args:{p_assignee:string;p_due_date:string|null;p_priority:string;p_source?:string;p_subscription_id?:string|null;p_tenant_id:string;p_title:string};Returns:string}
      update_financial_task_status:{Args:{p_comment?:string|null;p_status:string;p_task_id:string};Returns:undefined}
      update_financial_action_details:{Args:{p_task_id:string;p_assignee:string;p_due_date:string;p_expected_cash_impact:number|null};Returns:undefined}
      comment_financial_task:{Args:{p_body:string;p_task_id:string};Returns:undefined}
      financial_task_workspace:{Args:{p_tenant_id:string};Returns:Json}
      saas_growth_metrics: {
        Args: { p_period?: string; p_tenant_id: string }
        Returns: Json
      }
      saas_subscription_workspace: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      metrics_pyme: {
        Args: { p_period?: string; p_tenant_id: string }
        Returns: Json
      }
      metrics_saas: {
        Args: { p_period?: string; p_tenant_id: string }
        Returns: Json
      }
      set_business_model_profile: {
        Args: {
          p_business_model: string
          p_profile?: Json
          p_source: string
          p_tenant_id: string
        }
        Returns: Database["cashflow"]["Tables"]["tenant"]["Row"]
      }
      create_denarius_api_key: {
        Args: { p_expires_at?: string | null; p_name: string; p_tenant_id: string }
        Returns: Json
      }
      list_denarius_api_keys: {
        Args: { p_tenant_id: string }
        Returns: {
          id: string
          name: string
          prefix: string
          scopes: string[]
          created_at: string
          last_used_at: string | null
          expires_at: string | null
          revoked_at: string | null
          rotated_from_id: string | null
          replacement_key_id: string | null
          rotation_grace_ends_at: string | null
        }[]
      }
      rotate_denarius_api_key: {
        Args: { p_key_id: string; p_grace_minutes?: number; p_expires_at?: string | null }
        Returns: Json
      }
      revoke_denarius_api_key: {
        Args: { p_key_id: string }
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
  cashflow: {
    Enums: {},
  },
} as const
