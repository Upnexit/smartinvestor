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
      activity_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip: string | null
          meta: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip?: string | null
          meta?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          meta?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      distributor_applications: {
        Row: {
          address: string
          created_at: string
          district: string
          division: string | null
          email: string
          experience: string | null
          father_name: string | null
          full_name: string
          id: string
          password: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          thana: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          district: string
          division?: string | null
          email: string
          experience?: string | null
          father_name?: string | null
          full_name: string
          id?: string
          password?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thana: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          district?: string
          division?: string | null
          email?: string
          experience?: string | null
          father_name?: string | null
          full_name?: string
          id?: string
          password?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: string
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          thana?: string
          updated_at?: string
        }
        Relationships: []
      }
      distributor_earnings: {
        Row: {
          amount: number
          created_at: string
          distributor_id: string
          id: string
          meta: Json | null
          related_user_id: string | null
          related_withdrawal_id: string | null
          source: string
        }
        Insert: {
          amount: number
          created_at?: string
          distributor_id: string
          id?: string
          meta?: Json | null
          related_user_id?: string | null
          related_withdrawal_id?: string | null
          source: string
        }
        Update: {
          amount?: number
          created_at?: string
          distributor_id?: string
          id?: string
          meta?: Json | null
          related_user_id?: string | null
          related_withdrawal_id?: string | null
          source?: string
        }
        Relationships: []
      }
      distributor_leads: {
        Row: {
          converted_user_id: string | null
          created_at: string
          distributor_id: string
          id: string
          name: string
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          converted_user_id?: string | null
          created_at?: string
          distributor_id: string
          id?: string
          name: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          converted_user_id?: string | null
          created_at?: string
          distributor_id?: string
          id?: string
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      distributor_tasks: {
        Row: {
          action_type: string
          created_at: string
          distributor_id: string
          fb_page_url: string
          id: string
          instruction: string | null
          published_at: string | null
          published_task_id: string | null
          reward: number
          status: string
          title: string
          verified_at: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          distributor_id: string
          fb_page_url: string
          id?: string
          instruction?: string | null
          published_at?: string | null
          published_task_id?: string | null
          reward?: number
          status?: string
          title: string
          verified_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          distributor_id?: string
          fb_page_url?: string
          id?: string
          instruction?: string | null
          published_at?: string | null
          published_task_id?: string | null
          reward?: number
          status?: string
          title?: string
          verified_at?: string | null
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
          daily_task_limit: number
          district: string | null
          email: string
          full_name: string
          locked_balance: number
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
          daily_task_limit?: number
          district?: string | null
          email: string
          full_name: string
          locked_balance?: number
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
          daily_task_limit?: number
          district?: string | null
          email?: string
          full_name?: string
          locked_balance?: number
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
          count: number
          created_at: string
          fingerprint: string | null
          id: string
          last_seen_at: string
          level: string
          message: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          source: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          count?: number
          created_at?: string
          fingerprint?: string | null
          id?: string
          last_seen_at?: string
          level?: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          count?: number
          created_at?: string
          fingerprint?: string | null
          id?: string
          last_seen_at?: string
          level?: string
          message?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      link_tasks: {
        Row: {
          action_type: string
          active: boolean
          category: string | null
          created_at: string
          created_by_distributor: string | null
          daily_limit: number
          description: string | null
          id: string
          is_draft: boolean
          link_url: string
          required_package_id: string | null
          reward: number
          scheduled_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          active?: boolean
          category?: string | null
          created_at?: string
          created_by_distributor?: string | null
          daily_limit?: number
          description?: string | null
          id?: string
          is_draft?: boolean
          link_url: string
          required_package_id?: string | null
          reward?: number
          scheduled_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          active?: boolean
          category?: string | null
          created_at?: string
          created_by_distributor?: string | null
          daily_limit?: number
          description?: string | null
          id?: string
          is_draft?: boolean
          link_url?: string
          required_package_id?: string | null
          reward?: number
          scheduled_date?: string | null
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
      notice_deletion_log: {
        Row: {
          audience_count: number
          body: string
          deleted_at: string
          dismissed_count: number
          id: string
          notice_created_at: string | null
          notice_id: string
          priority: string
          reason: string
          target_all_users: boolean
          target_package_ids: string[]
          target_user_ids: string[]
          title: string
        }
        Insert: {
          audience_count?: number
          body: string
          deleted_at?: string
          dismissed_count?: number
          id?: string
          notice_created_at?: string | null
          notice_id: string
          priority: string
          reason?: string
          target_all_users: boolean
          target_package_ids?: string[]
          target_user_ids?: string[]
          title: string
        }
        Update: {
          audience_count?: number
          body?: string
          deleted_at?: string
          dismissed_count?: number
          id?: string
          notice_created_at?: string | null
          notice_id?: string
          priority?: string
          reason?: string
          target_all_users?: boolean
          target_package_ids?: string[]
          target_user_ids?: string[]
          title?: string
        }
        Relationships: []
      }
      notice_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notice_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notice_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_dismissals_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published: boolean
          target_all_users: boolean
          target_package_ids: string[]
          target_user_ids: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published?: boolean
          target_all_users?: boolean
          target_package_ids?: string[]
          target_user_ids?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published?: boolean
          target_all_users?: boolean
          target_package_ids?: string[]
          target_user_ids?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          app_installed_at: string | null
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
          telegram_chat_id: number | null
          telegram_connect_code: string | null
          telegram_connected_at: string | null
          telegram_username: string | null
          total_earned: number
          updated_at: string
          user_code: string
        }
        Insert: {
          app_installed_at?: string | null
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
          telegram_chat_id?: number | null
          telegram_connect_code?: string | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          total_earned?: number
          updated_at?: string
          user_code: string
        }
        Update: {
          app_installed_at?: string | null
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
          telegram_chat_id?: number | null
          telegram_connect_code?: string | null
          telegram_connected_at?: string | null
          telegram_username?: string | null
          total_earned?: number
          updated_at?: string
          user_code?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_packages_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          balance_at_request: number | null
          created_at: string
          fee: number
          gross_amount: number | null
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
          balance_at_request?: number | null
          created_at?: string
          fee?: number
          gross_amount?: number | null
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
          balance_at_request?: number | null
          created_at?: string
          fee?: number
          gross_amount?: number | null
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
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_profiles_fkey"
            columns: ["user_id"]
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
      admin_delete_distributor: {
        Args: { _actor: string; _user_id: string }
        Returns: undefined
      }
      admin_delete_notice: {
        Args: { _actor: string; _id: string }
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
      admin_distributor_bundle: {
        Args: { _actor: string; _user_id: string }
        Returns: Json
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
          balance_at_request: number | null
          created_at: string
          fee: number
          gross_amount: number | null
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
      admin_save_notice: {
        Args: { _actor: string; _id: string; _patch: Json }
        Returns: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published: boolean
          target_all_users: boolean
          target_package_ids: string[]
          target_user_ids: string[]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
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
      admin_send_missed_task_notice: {
        Args: { _actor: string; _bd_date: string; _user_id: string }
        Returns: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published: boolean
          target_all_users: boolean
          target_package_ids: string[]
          target_user_ids: string[]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
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
          app_installed_at: string | null
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
          telegram_chat_id: number | null
          telegram_connect_code: string | null
          telegram_connected_at: string | null
          telegram_username: string | null
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
      admin_toggle_notice: {
        Args: { _actor: string; _id: string; _published: boolean }
        Returns: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published: boolean
          target_all_users: boolean
          target_package_ids: string[]
          target_user_ids: string[]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
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
          app_installed_at: string | null
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
          telegram_chat_id: number | null
          telegram_connect_code: string | null
          telegram_connected_at: string | null
          telegram_username: string | null
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
          daily_task_limit: number
          district: string | null
          email: string
          full_name: string
          locked_balance: number
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
      admin_user_withdraw_history: {
        Args: { _actor: string; _user_id: string }
        Returns: Json
      }
      auto_send_missed_task_notices: { Args: never; Returns: number }
      cleanup_old_link_tasks: { Args: never; Returns: number }
      distributor_stats: { Args: { _user_id: string }; Returns: Json }
      expire_user_packages: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_referred_friends: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          has_active_package: boolean
          id: string
          user_code: string
        }[]
      }
      notice_audience_count: {
        Args: {
          _target_all_users: boolean
          _target_package_ids: string[]
          _target_user_ids: string[]
        }
        Returns: number
      }
      package_active_user_count: { Args: { _pkg: string }; Returns: number }
      packages_active_user_counts: {
        Args: never
        Returns: {
          active_users: number
          package_id: string
        }[]
      }
      purge_old_activity_logs: { Args: never; Returns: undefined }
      record_error_log: {
        Args: {
          _context: Json
          _fingerprint: string
          _level: string
          _message: string
          _source: string
          _url: string
          _user_agent: string
          _user_id: string
        }
        Returns: string
      }
      telegram_chat_for_user: {
        Args: { _user_id: string }
        Returns: {
          chat_id: number
        }[]
      }
      telegram_connect_account: {
        Args: { _chat_id: number; _code: string; _username?: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      telegram_find_account_by_chat: {
        Args: { _chat_id: number }
        Returns: {
          active_package: string
          balance: number
          full_name: string
          locked_balance: number
          package_expires_at: string
          total_earned: number
          user_code: string
        }[]
      }
      telegram_notice_recipients:
        | {
            Args: {
              _actor: string
              _target_all_users: boolean
              _target_package_ids?: string[]
            }
            Returns: {
              chat_id: number
              full_name: string
              user_id: string
            }[]
          }
        | {
            Args: {
              _actor: string
              _target_all_users: boolean
              _target_package_ids?: string[]
              _target_user_ids?: string[]
            }
            Returns: {
              chat_id: number
              full_name: string
              user_id: string
            }[]
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
