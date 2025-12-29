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
      bounties: {
        Row: {
          created_at: string
          description: string
          expires_at: string | null
          id: string
          image_url: string | null
          reward: string
          status: string | null
          title: string
          tx_signature: string | null
          wallet_address: string
          winner_wallet: string | null
        }
        Insert: {
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          reward: string
          status?: string | null
          title: string
          tx_signature?: string | null
          wallet_address: string
          winner_wallet?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          reward?: string
          status?: string | null
          title?: string
          tx_signature?: string | null
          wallet_address?: string
          winner_wallet?: string | null
        }
        Relationships: []
      }
      bounty_submissions: {
        Row: {
          bounty_id: string
          content: string
          created_at: string
          creator_feedback: string | null
          id: string
          proof_url: string | null
          status: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          bounty_id: string
          content: string
          created_at?: string
          creator_feedback?: string | null
          id?: string
          proof_url?: string | null
          status?: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          bounty_id?: string
          content?: string
          created_at?: string
          creator_feedback?: string | null
          id?: string
          proof_url?: string | null
          status?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounty_submissions_bounty_id_fkey"
            columns: ["bounty_id"]
            isOneToOne: false
            referencedRelation: "bounties"
            referencedColumns: ["id"]
          },
        ]
      }
      kol_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          kol_id: string
          parent_comment_id: string | null
          rating: number | null
          trade_signature: string | null
          wallet_address: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          kol_id: string
          parent_comment_id?: string | null
          rating?: number | null
          trade_signature?: string | null
          wallet_address: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          kol_id?: string
          parent_comment_id?: string | null
          rating?: number | null
          trade_signature?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "kol_comments_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kol_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "kol_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      kol_pnl_snapshots: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          kol_id: string
          loss_count: number | null
          month_year: string
          pnl_sol: number | null
          pnl_usd: number | null
          total_trades: number | null
          updated_at: string
          wallet_address: string
          win_count: number | null
          win_rate: number | null
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          kol_id: string
          loss_count?: number | null
          month_year: string
          pnl_sol?: number | null
          pnl_usd?: number | null
          total_trades?: number | null
          updated_at?: string
          wallet_address: string
          win_count?: number | null
          win_rate?: number | null
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          kol_id?: string
          loss_count?: number | null
          month_year?: string
          pnl_sol?: number | null
          pnl_usd?: number | null
          total_trades?: number | null
          updated_at?: string
          wallet_address?: string
          win_count?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kol_pnl_snapshots_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
            referencedColumns: ["id"]
          },
        ]
      }
      kol_votes: {
        Row: {
          created_at: string
          id: string
          kol_id: string
          last_vote_at: string | null
          vote_type: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          kol_id: string
          last_vote_at?: string | null
          vote_type: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          kol_id?: string
          last_vote_at?: string | null
          vote_type?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "kol_votes_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
            referencedColumns: ["id"]
          },
        ]
      }
      kols: {
        Row: {
          categories: string[] | null
          created_at: string
          downvotes: number | null
          id: string
          is_wallet_verified: boolean | null
          profile_pic_url: string | null
          rating: number | null
          total_votes: number | null
          twitter_handle: string
          upvotes: number | null
          username: string
          wallet_address: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          downvotes?: number | null
          id?: string
          is_wallet_verified?: boolean | null
          profile_pic_url?: string | null
          rating?: number | null
          total_votes?: number | null
          twitter_handle: string
          upvotes?: number | null
          username: string
          wallet_address?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          downvotes?: number | null
          id?: string
          is_wallet_verified?: boolean | null
          profile_pic_url?: string | null
          rating?: number | null
          total_votes?: number | null
          twitter_handle?: string
          upvotes?: number | null
          username?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_friends: {
        Row: {
          created_at: string
          friend_wallet: string
          id: string
          user_wallet: string
        }
        Insert: {
          created_at?: string
          friend_wallet: string
          id?: string
          user_wallet: string
        }
        Update: {
          created_at?: string
          friend_wallet?: string
          id?: string
          user_wallet?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string | null
          has_changed_name: boolean
          id: string
          is_profile_public: boolean | null
          is_verified: boolean | null
          profile_pic_url: string | null
          updated_at: string
          wallet_address: string
          worn_badge: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          has_changed_name?: boolean
          id?: string
          is_profile_public?: boolean | null
          is_verified?: boolean | null
          profile_pic_url?: string | null
          updated_at?: string
          wallet_address: string
          worn_badge?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          has_changed_name?: boolean
          id?: string
          is_profile_public?: boolean | null
          is_verified?: boolean | null
          profile_pic_url?: string | null
          updated_at?: string
          wallet_address?: string
          worn_badge?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_verifications: {
        Row: {
          created_at: string
          id: string
          kol_id: string
          message: string
          signature: string
          verified_at: string
          verified_by_wallet: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          kol_id: string
          message: string
          signature: string
          verified_at?: string
          verified_by_wallet: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          kol_id?: string
          message?: string
          signature?: string
          verified_at?: string
          verified_by_wallet?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_verifications_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_bounty: {
        Args: { p_bounty_id: string; p_wallet_address: string }
        Returns: Json
      }
      admin_delete_comment: {
        Args: { p_comment_id: string; p_wallet_address: string }
        Returns: Json
      }
      admin_delete_kol: {
        Args: { p_kol_id: string; p_wallet_address: string }
        Returns: Json
      }
      admin_delete_submission: {
        Args: { p_submission_id: string; p_wallet_address: string }
        Returns: Json
      }
      cleanup_expired_bounties: { Args: never; Returns: undefined }
      delete_bounty_submission: {
        Args: { p_submission_id: string; p_wallet_address: string }
        Returns: Json
      }
      delete_comment: {
        Args: { p_comment_id: string; p_wallet_address: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _wallet_address: string
        }
        Returns: boolean
      }
      is_admin_wallet: { Args: { wallet_address: string }; Returns: boolean }
      remove_friend: {
        Args: { p_friend_wallet: string; p_user_wallet: string }
        Returns: Json
      }
      vote_for_kol: {
        Args: {
          p_kol_id: string
          p_vote_type: string
          p_wallet_address: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
