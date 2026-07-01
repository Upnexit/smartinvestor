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
      communities: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_bans: {
        Row: {
          banned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          user_id: string
          voice_duration_ms: number | null
          voice_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
          voice_duration_ms?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
          voice_duration_ms?: number | null
          voice_url?: string | null
        }
        Relationships: []
      }
      distributor_withdrawals: {
        Row: {
          account_number: string
          amount: number
          created_at: string
          distributor_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_number: string
          amount: number
          created_at?: string
          distributor_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          amount?: number
          created_at?: string
          distributor_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      distributors: {
        Row: {
          address: string | null
          balance: number
          commission_rate: number
          created_at: string
          created_by: string | null
          district: string | null
          email: string
          full_name: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_number: string | null
          phone: string | null
          status: string
          thana: string | null
          total_earned: number
          total_users: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          balance?: number
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          district?: string | null
          email: string
          full_name: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_number?: string | null
          phone?: string | null
          status?: string
          thana?: string | null
          total_earned?: number
          total_users?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          balance?: number
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          district?: string | null
          email?: string
          full_name?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_number?: string | null
          phone?: string | null
          status?: string
          thana?: string | null
          total_earned?: number
          total_users?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          source: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message: string
          source?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string | null
        }
        Relationships: []
      }
      link_tasks: {
        Row: {
          action_type: string
          active: boolean
          category: string | null
          created_at: string
          daily_limit: number
          description: string | null
          id: string
          link_url: string
          required_package_id: string | null
          reward: number
          title: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          active?: boolean
          category?: string | null
          created_at?: string
          daily_limit?: number
          description?: string | null
          id?: string
          link_url: string
          required_package_id?: string | null
          reward?: number
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          active?: boolean
          category?: string | null
          created_at?: string
          daily_limit?: number
          description?: string | null
          id?: string
          link_url?: string
          required_package_id?: string | null
          reward?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_tasks_required_package_id_fkey"
            columns: ["required_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          created_at: string
          daily_income: number
          daily_tasks: number
          description: string | null
          duration_days: number
          featured: boolean
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_income?: number
          daily_tasks?: number
          description?: string | null
          duration_days?: number
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_income?: number
          daily_tasks?: number
          description?: string | null
          duration_days?: number
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          distributor_id: string | null
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          locked_balance: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          signup_bonus_paid: boolean
          status: Database["public"]["Enums"]["user_status"]
          suspend_reason: string | null
          tasks_completed: number
          total_earned: number
          updated_at: string
          user_code: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          distributor_id?: string | null
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id: string
          locked_balance?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          signup_bonus_paid?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          suspend_reason?: string | null
          tasks_completed?: number
          total_earned?: number
          updated_at?: string
          user_code: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          distributor_id?: string | null
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          locked_balance?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          signup_bonus_paid?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          suspend_reason?: string | null
          tasks_completed?: number
          total_earned?: number
          updated_at?: string
          user_code?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          source: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          source?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          source?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          created_at: string
          id: string
          proof_url: string | null
          rejection_reason: string | null
          reward_credited: number
          status: Database["public"]["Enums"]["submission_status"]
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_url?: string | null
          rejection_reason?: string | null
          reward_credited?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_url?: string | null
          rejection_reason?: string | null
          reward_credited?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "link_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_packages: {
        Row: {
          activated_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          package_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_txn: string | null
          purchased_at: string
          rejection_reason: string | null
          reviewed_at: string | null
          screenshot_url: string | null
          sender_number: string | null
          status: Database["public"]["Enums"]["package_status"]
          submitted_at: string | null
          trx_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_txn?: string | null
          purchased_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          screenshot_url?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["package_status"]
          submitted_at?: string | null
          trx_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_txn?: string | null
          purchased_at?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          screenshot_url?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["package_status"]
          submitted_at?: string | null
          trx_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payment_methods: {
        Row: {
          account_name: string | null
          account_number: string
          created_at: string
          id: string
          is_default: boolean
          method: Database["public"]["Enums"]["payment_method"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          created_at?: string
          id?: string
          is_default?: boolean
          method: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          created_at?: string
          id?: string
          is_default?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
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
      withdrawals: {
        Row: {
          account_number: string
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          trx_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          trx_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          trx_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_distributor: {
        Args: { _actor: string; _user_id: string }
        Returns: undefined
      }
      admin_delete_package: {
        Args: { _actor: string; _id: string }
        Returns: undefined
      }
      admin_delete_user_data: {
        Args: { _actor: string; _user_id: string }
        Returns: undefined
      }
      admin_review_user_package: {
        Args: {
          _action: string
          _actor_user_id: string
          _order_id: string
          _reason?: string
        }
        Returns: {
          activated_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          package_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_txn: string | null
          purchased_at: string
          rejection_reason: string | null
          reviewed_at: string | null
          screenshot_url: string | null
          sender_number: string | null
          status: Database["public"]["Enums"]["package_status"]
          submitted_at: string | null
          trx_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_packages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_withdrawal: {
        Args: { _action: string; _actor: string; _id: string; _note?: string }
        Returns: {
          account_number: string
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          trx_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_save_package: {
        Args: { _actor: string; _id: string; _patch: Json }
        Returns: {
          active: boolean
          created_at: string
          daily_income: number
          daily_tasks: number
          description: string | null
          duration_days: number
          featured: boolean
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "packages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_status: {
        Args: {
          _actor: string
          _reason?: string
          _status: Database["public"]["Enums"]["user_status"]
          _user_id: string
        }
        Returns: {
          avatar_url: string | null
          balance: number
          created_at: string
          distributor_id: string | null
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          locked_balance: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          signup_bonus_paid: boolean
          status: Database["public"]["Enums"]["user_status"]
          suspend_reason: string | null
          tasks_completed: number
          total_earned: number
          updated_at: string
          user_code: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_toggle_package: {
        Args: { _active: boolean; _actor: string; _id: string }
        Returns: {
          active: boolean
          created_at: string
          daily_income: number
          daily_tasks: number
          description: string | null
          duration_days: number
          featured: boolean
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "packages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_user_profile: {
        Args: { _actor: string; _patch: Json; _user_id: string }
        Returns: {
          avatar_url: string | null
          balance: number
          created_at: string
          distributor_id: string | null
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          locked_balance: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          signup_bonus_paid: boolean
          status: Database["public"]["Enums"]["user_status"]
          suspend_reason: string | null
          tasks_completed: number
          total_earned: number
          updated_at: string
          user_code: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_distributor: {
        Args: { _actor: string; _patch: Json; _user_id: string }
        Returns: {
          address: string | null
          balance: number
          commission_rate: number
          created_at: string
          created_by: string | null
          district: string | null
          email: string
          full_name: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_number: string | null
          phone: string | null
          status: string
          thana: string | null
          total_earned: number
          total_users: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "distributors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      distributor_stats: { Args: { _user_id: string }; Returns: Json }
      expire_user_packages: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "distributor"
      package_status: "pending" | "active" | "rejected" | "expired"
      payment_method: "bkash" | "nagad" | "rocket"
      submission_status: "pending" | "approved" | "rejected"
      user_status: "active" | "suspended" | "banned"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      app_role: ["admin", "user", "distributor"],
      package_status: ["pending", "active", "rejected", "expired"],
      payment_method: ["bkash", "nagad", "rocket"],
      submission_status: ["pending", "approved", "rejected"],
      user_status: ["active", "suspended", "banned"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
