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
      bids: {
        Row: {
          bid_amount_eth: number | null
          bid_amount_usdc: number
          created_at: string | null
          estimated_duration_weeks: number | null
          freelancer_id: string
          id: string
          job_id: string
          proposal_text: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bid_amount_eth?: number | null
          bid_amount_usdc: number
          created_at?: string | null
          estimated_duration_weeks?: number | null
          freelancer_id: string
          id?: string
          job_id: string
          proposal_text: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bid_amount_eth?: number | null
          bid_amount_usdc?: number
          created_at?: string | null
          estimated_duration_weeks?: number | null
          freelancer_id?: string
          id?: string
          job_id?: string
          proposal_text?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          arbitration_deposit_eth: number | null
          client_amount_eth: number | null
          evidence_bundle: Json | null
          freelancer_amount_eth: number | null
          id: string
          job_id: string
          raised_at: string | null
          raised_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          arbitration_deposit_eth?: number | null
          client_amount_eth?: number | null
          evidence_bundle?: Json | null
          freelancer_amount_eth?: number | null
          id?: string
          job_id: string
          raised_at?: string | null
          raised_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          arbitration_deposit_eth?: number | null
          client_amount_eth?: number | null
          evidence_bundle?: Json | null
          freelancer_amount_eth?: number | null
          id?: string
          job_id?: string
          raised_at?: string | null
          raised_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_milestones: {
        Row: {
          amount_eth: number | null
          amount_usdc: number
          completed_at: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          job_id: string
          milestone_number: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount_eth?: number | null
          amount_usdc: number
          completed_at?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          job_id: string
          milestone_number: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_eth?: number | null
          amount_usdc?: number
          completed_at?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          job_id?: string
          milestone_number?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_revisions: {
        Row: {
          git_commit_hash: string | null
          id: string
          ipfs_hash: string
          job_id: string
          notes: string | null
          repository_url: string | null
          revision_number: number
          submitted_at: string | null
          submitted_by: string
        }
        Insert: {
          git_commit_hash?: string | null
          id?: string
          ipfs_hash: string
          job_id: string
          notes?: string | null
          repository_url?: string | null
          revision_number: number
          submitted_at?: string | null
          submitted_by: string
        }
        Update: {
          git_commit_hash?: string | null
          id?: string
          ipfs_hash?: string
          job_id?: string
          notes?: string | null
          repository_url?: string | null
          revision_number?: number
          submitted_at?: string | null
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_revisions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_revisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          accepted_bid_id: string | null
          allowed_revisions: number | null
          attachment_urls: string[] | null
          budget_eth: number | null
          budget_usdc: number
          category: string | null
          client_id: string
          completed_at: string | null
          contract_address: string | null
          created_at: string | null
          current_revision_number: number | null
          deadline: string | null
          description: string
          duration_weeks: number | null
          experience_level: string | null
          freelancer_id: string | null
          freelancer_wallet_address: string | null
          freelancers_needed: number | null
          git_commit_hash: string | null
          id: string
          ipfs_hash: string | null
          listing_id: string | null
          location_type: string | null
          payment_type: string | null
          project_type: string | null
          questions_for_freelancer: string[] | null
          repository_url: string | null
          review_deadline: string | null
          skills_required: string[] | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          timezone_preference: string | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          accepted_bid_id?: string | null
          allowed_revisions?: number | null
          attachment_urls?: string[] | null
          budget_eth?: number | null
          budget_usdc: number
          category?: string | null
          client_id: string
          completed_at?: string | null
          contract_address?: string | null
          created_at?: string | null
          current_revision_number?: number | null
          deadline?: string | null
          description: string
          duration_weeks?: number | null
          experience_level?: string | null
          freelancer_id?: string | null
          freelancer_wallet_address?: string | null
          freelancers_needed?: number | null
          git_commit_hash?: string | null
          id?: string
          ipfs_hash?: string | null
          listing_id?: string | null
          location_type?: string | null
          payment_type?: string | null
          project_type?: string | null
          questions_for_freelancer?: string[] | null
          repository_url?: string | null
          review_deadline?: string | null
          skills_required?: string[] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          timezone_preference?: string | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          accepted_bid_id?: string | null
          allowed_revisions?: number | null
          attachment_urls?: string[] | null
          budget_eth?: number | null
          budget_usdc?: number
          category?: string | null
          client_id?: string
          completed_at?: string | null
          contract_address?: string | null
          created_at?: string | null
          current_revision_number?: number | null
          deadline?: string | null
          description?: string
          duration_weeks?: number | null
          experience_level?: string | null
          freelancer_id?: string | null
          freelancer_wallet_address?: string | null
          freelancers_needed?: number | null
          git_commit_hash?: string | null
          id?: string
          ipfs_hash?: string | null
          listing_id?: string | null
          location_type?: string | null
          payment_type?: string | null
          project_type?: string | null
          questions_for_freelancer?: string[] | null
          repository_url?: string | null
          review_deadline?: string | null
          skills_required?: string[] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          timezone_preference?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_accepted_bid_id_fkey"
            columns: ["accepted_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "social_media_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
          telegram_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
          telegram_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
          telegram_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          created_at: string | null
          freelancer_amount: number
          freelancer_tx_hash: string
          freelancer_wallet: string
          id: string
          job_id: string | null
          platform_fee: number
          platform_tx_hash: string
          platform_wallet: string
          processed_at: string
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          freelancer_amount: number
          freelancer_tx_hash: string
          freelancer_wallet: string
          id?: string
          job_id?: string | null
          platform_fee: number
          platform_tx_hash: string
          platform_wallet: string
          processed_at?: string
          status?: string
          total_amount: number
        }
        Update: {
          created_at?: string | null
          freelancer_amount?: number
          freelancer_tx_hash?: string
          freelancer_wallet?: string
          id?: string
          job_id?: string | null
          platform_fee?: number
          platform_tx_hash?: string
          platform_wallet?: string
          processed_at?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_reviews: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          completed_jobs: number | null
          created_at: string | null
          display_name: string | null
          dispute_strikes: number | null
          failed_disputes: number | null
          hourly_rate: number | null
          id: string
          last_notified_conversation_id: string | null
          location: string | null
          portfolio_items: Json | null
          skills: string[] | null
          success_rate: number | null
          telegram_chat_id: string | null
          telegram_username: string | null
          total_earnings: number | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          completed_jobs?: number | null
          created_at?: string | null
          display_name?: string | null
          dispute_strikes?: number | null
          failed_disputes?: number | null
          hourly_rate?: number | null
          id: string
          last_notified_conversation_id?: string | null
          location?: string | null
          portfolio_items?: Json | null
          skills?: string[] | null
          success_rate?: number | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          completed_jobs?: number | null
          created_at?: string | null
          display_name?: string | null
          dispute_strikes?: number | null
          failed_disputes?: number | null
          hourly_rate?: number | null
          id?: string
          last_notified_conversation_id?: string | null
          location?: string | null
          portfolio_items?: Json | null
          skills?: string[] | null
          success_rate?: number | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_last_notified_conversation_id_fkey"
            columns: ["last_notified_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          job_id: string
          rating: number
          review_type: string | null
          reviewee_id: string
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          rating: number
          review_type?: string | null
          reviewee_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          rating?: number
          review_type?: string | null
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_favorites: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "social_media_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_listings: {
        Row: {
          account_name: string
          created_at: string | null
          description: string
          followers_count: number
          id: string
          metadata: Json | null
          platform: string
          price_usdc: number
          screenshot_url: string | null
          screenshot_urls: string[] | null
          seller_id: string
          status: string | null
          updated_at: string | null
          verification_proof: string | null
        }
        Insert: {
          account_name: string
          created_at?: string | null
          description: string
          followers_count: number
          id?: string
          metadata?: Json | null
          platform: string
          price_usdc: number
          screenshot_url?: string | null
          screenshot_urls?: string[] | null
          seller_id: string
          status?: string | null
          updated_at?: string | null
          verification_proof?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string | null
          description?: string
          followers_count?: number
          id?: string
          metadata?: Json | null
          platform?: string
          price_usdc?: number
          screenshot_url?: string | null
          screenshot_urls?: string[] | null
          seller_id?: string
          status?: string | null
          updated_at?: string | null
          verification_proof?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      assign_admin_role: { Args: { user_email: string }; Returns: undefined }
      get_job_bid_count: { Args: { job_id_param: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_completed_jobs: {
        Args: { user_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "arbitrator" | "admin"
      job_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "under_review"
        | "revision_requested"
        | "disputed"
        | "completed"
        | "cancelled"
        | "refunded"
        | "awaiting_escrow_verification"
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
      app_role: ["user", "arbitrator", "admin"],
      job_status: [
        "open",
        "assigned",
        "in_progress",
        "under_review",
        "revision_requested",
        "disputed",
        "completed",
        "cancelled",
        "refunded",
        "awaiting_escrow_verification",
      ],
    },
  },
} as const
