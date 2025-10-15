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
          bid_amount_eth: number
          bid_amount_usdc: number
          created_at: string | null
          estimated_duration_weeks: number | null
          freelancer_id: string
          id: string
          ipfs_hash: string | null
          job_id: string
          proposal_text: string
          status: Database["public"]["Enums"]["bid_status"] | null
          updated_at: string | null
        }
        Insert: {
          bid_amount_eth: number
          bid_amount_usdc?: number
          created_at?: string | null
          estimated_duration_weeks?: number | null
          freelancer_id: string
          id?: string
          ipfs_hash?: string | null
          job_id: string
          proposal_text: string
          status?: Database["public"]["Enums"]["bid_status"] | null
          updated_at?: string | null
        }
        Update: {
          bid_amount_eth?: number
          bid_amount_usdc?: number
          created_at?: string | null
          estimated_duration_weeks?: number | null
          freelancer_id?: string
          id?: string
          ipfs_hash?: string | null
          job_id?: string
          proposal_text?: string
          status?: Database["public"]["Enums"]["bid_status"] | null
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
          {
            foreignKeyName: "conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          arbitration_deposit_eth: number
          arbitration_deposit_usdc: number | null
          client_amount_eth: number | null
          client_amount_usdc: number | null
          evidence_bundle: Json | null
          freelancer_amount_eth: number | null
          freelancer_amount_usdc: number | null
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
          arbitration_deposit_eth: number
          arbitration_deposit_usdc?: number | null
          client_amount_eth?: number | null
          client_amount_usdc?: number | null
          evidence_bundle?: Json | null
          freelancer_amount_eth?: number | null
          freelancer_amount_usdc?: number | null
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
          arbitration_deposit_eth?: number
          arbitration_deposit_usdc?: number | null
          client_amount_eth?: number | null
          client_amount_usdc?: number | null
          evidence_bundle?: Json | null
          freelancer_amount_eth?: number | null
          freelancer_amount_usdc?: number | null
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
        ]
      }
      job_milestones: {
        Row: {
          amount_eth: number
          amount_usdc: number | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          ipfs_hash: string | null
          is_completed: boolean | null
          is_paid: boolean | null
          job_id: string
          order_index: number
          paid_at: string | null
          title: string
        }
        Insert: {
          amount_eth: number
          amount_usdc?: number | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ipfs_hash?: string | null
          is_completed?: boolean | null
          is_paid?: boolean | null
          job_id: string
          order_index: number
          paid_at?: string | null
          title: string
        }
        Update: {
          amount_eth?: number
          amount_usdc?: number | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ipfs_hash?: string | null
          is_completed?: boolean | null
          is_paid?: boolean | null
          job_id?: string
          order_index?: number
          paid_at?: string | null
          title?: string
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
        ]
      }
      jobs: {
        Row: {
          accepted_bid_id: string | null
          allowed_revisions: number | null
          arbitration_deposit_percentage: number | null
          auto_release_enabled: boolean | null
          budget_eth: number
          budget_usd: number | null
          budget_usdc: number
          client_id: string
          completed_at: string | null
          contract_address: string | null
          created_at: string | null
          current_revision_number: number | null
          deadline: string | null
          description: string
          dispute_id: string | null
          duration_weeks: number | null
          escrow_address: string | null
          freelancer_id: string | null
          freelancer_stake_eth: number | null
          freelancer_stake_usdc: number | null
          git_commit_hash: string | null
          id: string
          ipfs_hash: string | null
          requires_freelancer_stake: boolean | null
          review_deadline: string | null
          skills_required: string[]
          stake_percentage: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accepted_bid_id?: string | null
          allowed_revisions?: number | null
          arbitration_deposit_percentage?: number | null
          auto_release_enabled?: boolean | null
          budget_eth: number
          budget_usd?: number | null
          budget_usdc?: number
          client_id: string
          completed_at?: string | null
          contract_address?: string | null
          created_at?: string | null
          current_revision_number?: number | null
          deadline?: string | null
          description: string
          dispute_id?: string | null
          duration_weeks?: number | null
          escrow_address?: string | null
          freelancer_id?: string | null
          freelancer_stake_eth?: number | null
          freelancer_stake_usdc?: number | null
          git_commit_hash?: string | null
          id?: string
          ipfs_hash?: string | null
          requires_freelancer_stake?: boolean | null
          review_deadline?: string | null
          skills_required: string[]
          stake_percentage?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accepted_bid_id?: string | null
          allowed_revisions?: number | null
          arbitration_deposit_percentage?: number | null
          auto_release_enabled?: boolean | null
          budget_eth?: number
          budget_usd?: number | null
          budget_usdc?: number
          client_id?: string
          completed_at?: string | null
          contract_address?: string | null
          created_at?: string | null
          current_revision_number?: number | null
          deadline?: string | null
          description?: string
          dispute_id?: string | null
          duration_weeks?: number | null
          escrow_address?: string | null
          freelancer_id?: string | null
          freelancer_stake_eth?: number | null
          freelancer_stake_usdc?: number | null
          git_commit_hash?: string | null
          id?: string
          ipfs_hash?: string | null
          requires_freelancer_stake?: boolean | null
          review_deadline?: string | null
          skills_required?: string[]
          stake_percentage?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          job_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
          is_banned: boolean | null
          last_notified_conversation_id: string | null
          location: string | null
          portfolio_items: Json | null
          reputation_score: number | null
          requires_kyc: boolean | null
          skills: string[] | null
          success_rate: number | null
          successful_disputes: number | null
          telegram_chat_id: string | null
          telegram_username: string | null
          total_earnings: number | null
          total_earnings_usdc: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          wallet_address: string
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
          is_banned?: boolean | null
          last_notified_conversation_id?: string | null
          location?: string | null
          portfolio_items?: Json | null
          reputation_score?: number | null
          requires_kyc?: boolean | null
          skills?: string[] | null
          success_rate?: number | null
          successful_disputes?: number | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          total_earnings?: number | null
          total_earnings_usdc?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          wallet_address: string
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
          is_banned?: boolean | null
          last_notified_conversation_id?: string | null
          location?: string | null
          portfolio_items?: Json | null
          reputation_score?: number | null
          requires_kyc?: boolean | null
          skills?: string[] | null
          success_rate?: number | null
          successful_disputes?: number | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          total_earnings?: number | null
          total_earnings_usdc?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
          wallet_address?: string
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
          is_verified: boolean | null
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          transaction_hash: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          job_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          transaction_hash?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          job_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          transaction_hash?: string | null
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
          account_link: string
          account_name: string
          created_at: string | null
          description: string | null
          followers_count: string | null
          id: string
          is_verified: boolean | null
          metadata: Json | null
          platform: string
          price_usdc: number
          screenshots: string[] | null
          seller_id: string
          seller_wallet_address: string | null
          status: string | null
          updated_at: string | null
          verification_code: string | null
        }
        Insert: {
          account_link: string
          account_name: string
          created_at?: string | null
          description?: string | null
          followers_count?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          platform: string
          price_usdc: number
          screenshots?: string[] | null
          seller_id: string
          seller_wallet_address?: string | null
          status?: string | null
          updated_at?: string | null
          verification_code?: string | null
        }
        Update: {
          account_link?: string
          account_name?: string
          created_at?: string | null
          description?: string | null
          followers_count?: string | null
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          platform?: string
          price_usdc?: number
          screenshots?: string[] | null
          seller_id?: string
          seller_wallet_address?: string | null
          status?: string | null
          updated_at?: string | null
          verification_code?: string | null
        }
        Relationships: []
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
      assign_admin_role: {
        Args: { user_email: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_completed_jobs: {
        Args: { amount: number; freelancer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "arbitrator" | "user"
      bid_status: "pending" | "accepted" | "rejected" | "withdrawn"
      job_status:
        | "open"
        | "in_progress"
        | "under_review"
        | "completed"
        | "disputed"
        | "cancelled"
        | "revision_requested"
        | "refunded"
        | "funded"
        | "submitted"
      priority_level: "low" | "medium" | "high"
      user_type: "freelancer" | "client" | "both"
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
      app_role: ["admin", "arbitrator", "user"],
      bid_status: ["pending", "accepted", "rejected", "withdrawn"],
      job_status: [
        "open",
        "in_progress",
        "under_review",
        "completed",
        "disputed",
        "cancelled",
        "revision_requested",
        "refunded",
        "funded",
        "submitted",
      ],
      priority_level: ["low", "medium", "high"],
      user_type: ["freelancer", "client", "both"],
    },
  },
} as const
