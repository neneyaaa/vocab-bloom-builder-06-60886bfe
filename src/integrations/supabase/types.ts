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
      checkin_plans: {
        Row: {
          completed_at: string | null
          created_at: string
          daily_reward: number
          days_completed: number
          enroll_cost: number
          id: string
          last_checkin_date: string | null
          required_accuracy: number
          required_days: number
          reward_total: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          daily_reward?: number
          days_completed?: number
          enroll_cost?: number
          id?: string
          last_checkin_date?: string | null
          required_accuracy?: number
          required_days?: number
          reward_total?: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          daily_reward?: number
          days_completed?: number
          enroll_cost?: number
          id?: string
          last_checkin_date?: string | null
          required_accuracy?: number
          required_days?: number
          reward_total?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      checkin_records: {
        Row: {
          accuracy: number
          checkin_date: string
          created_at: string
          id: string
          plan_id: string
          reward_coins: number
          test_run_id: string | null
          user_id: string
        }
        Insert: {
          accuracy: number
          checkin_date: string
          created_at?: string
          id?: string
          plan_id: string
          reward_coins?: number
          test_run_id?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number
          checkin_date?: string
          created_at?: string
          id?: string
          plan_id?: string
          reward_coins?: number
          test_run_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inquiry_followups: {
        Row: {
          author_id: string
          channel: string
          content: string
          created_at: string
          id: string
          inquiry_id: string
        }
        Insert: {
          author_id: string
          channel?: string
          content: string
          created_at?: string
          id?: string
          inquiry_id: string
        }
        Update: {
          author_id?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          inquiry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_followups_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "partner_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_reads: {
        Row: {
          inquiry_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          inquiry_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          inquiry_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_reads_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "partner_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          created_at: string
          id: string
          match_id: string
          opponent_id: string | null
          opponent_score: number
          result: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          opponent_id?: string | null
          opponent_score?: number
          result: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          opponent_id?: string | null
          opponent_score?: number
          result?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      partner_inquiries: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          company_name: string
          contact_name: string
          created_at: string
          deal_value: number | null
          email: string
          id: string
          inquiry_type: string
          message: string
          next_followup_at: string | null
          phone: string | null
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          deal_value?: number | null
          email: string
          id?: string
          inquiry_type: string
          message: string
          next_followup_at?: string | null
          phone?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          deal_value?: number | null
          email?: string
          id?: string
          inquiry_type?: string
          message?: string
          next_followup_at?: string | null
          phone?: string | null
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pk_match_answers: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: string
          id: string
          is_correct: boolean
          match_id: string
          question_index: number
          time_taken_ms: number | null
          user_answer: string | null
          user_id: string
          word: string
          word_id: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty: string
          id?: string
          is_correct: boolean
          match_id: string
          question_index: number
          time_taken_ms?: number | null
          user_answer?: string | null
          user_id: string
          word: string
          word_id?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_correct?: boolean
          match_id?: string
          question_index?: number
          time_taken_ms?: number | null
          user_answer?: string | null
          user_id?: string
          word?: string
          word_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          image_url: string
          placement: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          image_url: string
          placement?: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          image_url?: string
          placement?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_run_answers: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: string
          id: string
          is_correct: boolean
          question_index: number
          test_run_id: string
          user_answer: string | null
          user_id: string
          word: string
          word_id: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty: string
          id?: string
          is_correct: boolean
          question_index: number
          test_run_id: string
          user_answer?: string | null
          user_id: string
          word: string
          word_id?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_correct?: boolean
          question_index?: number
          test_run_id?: string
          user_answer?: string | null
          user_id?: string
          word?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_run_answers_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          accuracy: number
          correct_count: number
          created_at: string
          duration_seconds: number
          estimated_vocabulary: number
          id: string
          level: string
          level_description: string | null
          suggestion: string | null
          total_questions: number
          unknown_count: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          accuracy: number
          correct_count: number
          created_at?: string
          duration_seconds?: number
          estimated_vocabulary?: number
          id?: string
          level: string
          level_description?: string | null
          suggestion?: string | null
          total_questions: number
          unknown_count: number
          user_id: string
          wrong_count: number
        }
        Update: {
          accuracy?: number
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          estimated_vocabulary?: number
          id?: string
          level?: string
          level_description?: string | null
          suggestion?: string | null
          total_questions?: number
          unknown_count?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string | null
          created_at: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          reason?: string | null
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
      wallets: {
        Row: {
          coins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          difficulty: string
          enabled: boolean
          id: string
          meaning: string
          options: Json
          updated_at: string
          word: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          difficulty: string
          enabled?: boolean
          id?: string
          meaning: string
          options: Json
          updated_at?: string
          word: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          enabled?: boolean
          id?: string
          meaning?: string
          options?: Json
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_business_staff: { Args: { _user_id: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "business_dev"
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
      app_role: ["admin", "user", "business_dev"],
    },
  },
} as const
