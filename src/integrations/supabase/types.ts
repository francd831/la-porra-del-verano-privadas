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
      award_predictions: {
        Row: {
          award_type: string
          created_at: string
          id: string
          player_name: string
          submission_id: string | null
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          award_type: string
          created_at?: string
          id?: string
          player_name: string
          submission_id?: string | null
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          award_type?: string
          created_at?: string
          id?: string
          player_name?: string
          submission_id?: string | null
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_predictions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      champion_predictions: {
        Row: {
          created_at: string
          id: string
          predicted_winner_team_id: string
          submission_id: string | null
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          predicted_winner_team_id: string
          submission_id?: string | null
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          predicted_winner_team_id?: string
          submission_id?: string | null
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "champion_predictions_predicted_winner_team_id_fkey"
            columns: ["predicted_winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "champion_predictions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_user_points: {
        Row: {
          created_at: string
          details: Json | null
          event_id: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_id: string
          id?: string
          points?: number
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_id?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_user_points_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      events_queue: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string | null
          error: string | null
          id: string
          payload: Json | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          error?: string | null
          id?: string
          payload?: Json | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          error?: string | null
          id?: string
          payload?: Json | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_standings_override: {
        Row: {
          created_at: string
          group_id: string
          id: string
          team_order: string[]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          team_order: string[]
          tournament_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          team_order?: string[]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_teams: {
        Row: {
          group_id: string
          id: string
          team_id: string
        }
        Insert: {
          group_id: string
          id?: string
          team_id: string
        }
        Update: {
          group_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_awards: {
        Row: {
          award_type: string
          created_at: string
          id: string
          tournament_id: string
          updated_at: string
          winner_name: string | null
        }
        Insert: {
          award_type: string
          created_at?: string
          id?: string
          tournament_id: string
          updated_at?: string
          winner_name?: string | null
        }
        Update: {
          award_type?: string
          created_at?: string
          id?: string
          tournament_id?: string
          updated_at?: string
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_awards_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          max_members: number
          name: string
          owner_id: string
          plan: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          max_members?: number
          name: string
          owner_id: string
          plan?: string
          tournament_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
          owner_id?: string
          plan?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_snapshot: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rank: number
          total_points: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rank: number
          total_points?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rank?: number
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshot_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          created_at: string
          external_id: number | null
          group_id: string | null
          home_goals: number | null
          home_team_id: string | null
          id: string
          match_date: string | null
          match_type: string
          round: string | null
          status: string
          tournament_id: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: number | null
          group_id?: string | null
          home_goals?: number | null
          home_team_id?: string | null
          id: string
          match_date?: string | null
          match_type: string
          round?: string | null
          status?: string
          tournament_id: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: number | null
          group_id?: string | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          match_date?: string | null
          match_type?: string
          round?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          body: string
          created_at: string
          delivered_at: string | null
          error: string | null
          event_id: string
          id: string
          sent_at: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          event_id: string
          id?: string
          sent_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          event_id?: string
          id?: string
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          id: string
          key: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pdf_template_config: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          tournament_id?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_goals: number | null
          created_at: string
          home_goals: number | null
          id: string
          match_id: string | null
          playoff_round: string | null
          predicted_winner_team_id: string | null
          submission_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          away_goals?: number | null
          created_at?: string
          home_goals?: number | null
          id?: string
          match_id?: string | null
          playoff_round?: string | null
          predicted_winner_team_id?: string | null
          submission_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          away_goals?: number | null
          created_at?: string
          home_goals?: number | null
          id?: string
          match_id?: string | null
          playoff_round?: string | null
          predicted_winner_team_id?: string | null
          submission_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_predicted_winner_team_id_fkey"
            columns: ["predicted_winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          auth: string
          created_at: string
          endpoint: string
          id: string
          invalid_reason: string | null
          invalidated_at: string | null
          last_seen_at: string | null
          p256dh: string
          platform: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          vapid_public_key: string | null
        }
        Insert: {
          active?: boolean
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          invalid_reason?: string | null
          invalidated_at?: string | null
          last_seen_at?: string | null
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          vapid_public_key?: string | null
        }
        Update: {
          active?: boolean
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          invalid_reason?: string | null
          invalidated_at?: string | null
          last_seen_at?: string | null
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          vapid_public_key?: string | null
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          rule_type: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          rule_type: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          rule_type?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          code: string
          created_at: string
          flag: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          flag: string
          id: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          flag?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tournament_winners: {
        Row: {
          created_at: string
          id: string
          tournament_id: string
          winner_team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tournament_id: string
          winner_team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tournament_id?: string
          winner_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_winners_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_winners_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          id: string
          name: string
          predictions_locked: boolean
          rankings_visible: boolean
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          predictions_locked?: boolean
          rankings_visible?: boolean
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          predictions_locked?: boolean
          rankings_visible?: boolean
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_submissions: {
        Row: {
          awards_predicted: boolean | null
          champion_predicted: boolean | null
          id: string
          is_complete: boolean
          points_awards: number | null
          points_champion: number | null
          points_final: number | null
          points_group_order: number | null
          points_groups: number | null
          points_playoffs: number | null
          points_qf: number | null
          points_r16: number | null
          points_r32: number | null
          points_sf: number | null
          points_total: number | null
          prize_participation_requested: boolean | null
          prize_payment_completed: boolean | null
          prize_payment_date: string | null
          submitted_at: string
          total_predictions: number | null
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awards_predicted?: boolean | null
          champion_predicted?: boolean | null
          id?: string
          is_complete?: boolean
          points_awards?: number | null
          points_champion?: number | null
          points_final?: number | null
          points_group_order?: number | null
          points_groups?: number | null
          points_playoffs?: number | null
          points_qf?: number | null
          points_r16?: number | null
          points_r32?: number | null
          points_sf?: number | null
          points_total?: number | null
          prize_participation_requested?: boolean | null
          prize_payment_completed?: boolean | null
          prize_payment_date?: string | null
          submitted_at?: string
          total_predictions?: number | null
          tournament_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awards_predicted?: boolean | null
          champion_predicted?: boolean | null
          id?: string
          is_complete?: boolean
          points_awards?: number | null
          points_champion?: number | null
          points_final?: number | null
          points_group_order?: number | null
          points_groups?: number | null
          points_playoffs?: number | null
          points_qf?: number | null
          points_r16?: number | null
          points_r32?: number | null
          points_sf?: number | null
          points_total?: number | null
          prize_participation_requested?: boolean | null
          prize_payment_completed?: boolean | null
          prize_payment_date?: string | null
          submitted_at?: string
          total_predictions?: number | null
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_user_points: {
        Args: { p_tournament_id: string; p_user_id: string }
        Returns: {
          awards_points: number
          champion_points: number
          final_points: number
          group_order_bonus: number
          groups_points: number
          playoffs_points: number
          qf_points: number
          r16_points: number
          r32_points: number
          sf_points: number
          total_points: number
        }[]
      }
      get_default_tournament_id: { Args: never; Returns: string }
      get_user_display_name: { Args: { p_user_id: string }; Returns: string }
      get_user_display_names: {
        Args: { p_user_ids: string[] }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_display_name_available: {
        Args: { p_display_name: string }
        Returns: boolean
      }
      is_league_admin: {
        Args: { p_league_id: string; p_user_id: string }
        Returns: boolean
      }
      is_league_member: {
        Args: { p_league_id: string; p_user_id: string }
        Returns: boolean
      }
      join_league_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: string
      }
      league_plan_member_limit: {
        Args: { p_plan: string }
        Returns: number
      }
      update_league_plan_for_testing: {
        Args: { p_league_id: string; p_plan: string }
        Returns: Database["public"]["Tables"]["leagues"]["Row"]
      }
      update_all_user_points: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
