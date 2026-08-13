export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          pin: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          pin: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          pin?: string;
        };
        Relationships: [];
      };
            groups: {
        Row: {
          class_id: string | null;
          created_at: string;
          id: string;
          is_solo: boolean;
          name: string;
          question_order: string[];
          total_points: number | null;
          user_id: string | null;
        };
        Insert: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          is_solo?: boolean;
          name: string;
          question_order: string[];
          total_points?: number | null;
          user_id?: string | null;
        };
        Update: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          is_solo?: boolean;
          name?: string;
          question_order?: string[];
          total_points?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      answers: {
        Row: {
          admin_comment: string | null;
          admin_graded: boolean;
          admin_points: number | null;
          answer_text: string;
          attempts: number;
          completed_at: string;
          group_id: string;
          id: string;
          photo_url: string | null;
          points_earned: number;
          question_id: number;
        };
        Insert: {
          admin_comment?: string | null;
          admin_graded?: boolean;
          admin_points?: number | null;
          answer_text: string;
          attempts: number;
          completed_at?: string;
          group_id: string;
          id?: string;
          photo_url?: string | null;
          points_earned: number;
          question_id: number;
        };
        Update: {
          admin_comment?: string | null;
          admin_graded?: boolean;
          admin_points?: number | null;
          answer_text?: string;
          attempts?: number;
          completed_at?: string;
          group_id?: string;
          id?: string;
          photo_url?: string | null;
          points_earned?: number;
          question_id?: number;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          answer_mode: string;
          auto_grade: boolean;
          background_url: string | null;
          correct_answer: string | null;
          gutenberg_note: string | null;
          id: number;
          is_fixed_first: boolean | null;
          is_fixed_last: boolean | null;
          legend_text: string;
          max_points: number | null;
          order_number: number;
          qr_value: string;
          question_text: string;
        };
        Insert: {
          answer_mode?: string;
          auto_grade?: boolean;
          background_url?: string | null;
          correct_answer?: string | null;
          gutenberg_note?: string | null;
          id?: number;
          is_fixed_first?: boolean | null;
          is_fixed_last?: boolean | null;
          legend_text: string;
          max_points?: number | null;
          order_number: number;
          qr_value: string;
          question_text: string;
        };
        Update: {
          answer_mode?: string;
          auto_grade?: boolean;
          background_url?: string | null;
          correct_answer?: string | null;
          gutenberg_note?: string | null;
          id?: number;
          is_fixed_first?: boolean | null;
          is_fixed_last?: boolean | null;
          legend_text?: string;
          max_points?: number | null;
          order_number?: number;
          qr_value?: string;
          question_text?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      increment_group_points: {
        Args: { gid: string; pts: number };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};