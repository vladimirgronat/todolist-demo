export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          environment_id: string;
          parent_id: string | null;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          environment_id: string;
          parent_id?: string | null;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          environment_id?: string;
          parent_id?: string | null;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      environments: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      environment_members: {
        Row: {
          id: string;
          environment_id: string;
          user_id: string;
          role: string;
          invited_at: string;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          environment_id: string;
          user_id: string;
          role: string;
          invited_at?: string;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          environment_id?: string;
          user_id?: string;
          role?: string;
          invited_at?: string;
          joined_at?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          environment_id: string;
          title: string;
          description: string | null;
          state: string;
          category_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          environment_id: string;
          title: string;
          description?: string | null;
          state?: string;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          environment_id?: string;
          title?: string;
          description?: string | null;
          state?: string;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          environment_id: string;
          name: string;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          environment_id: string;
          name: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          environment_id?: string;
          name?: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
        };
        Update: {
          task_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      task_dependencies: {
        Row: {
          task_id: string;
          depends_on_task_id: string;
        };
        Insert: {
          task_id: string;
          depends_on_task_id: string;
        };
        Update: {
          task_id?: string;
          depends_on_task_id?: string;
        };
        Relationships: [];
      };
      task_photos: {
        Row: {
          id: string;
          task_id: string;
          storage_path: string;
          filename: string;
          size_bytes: number;
          is_completion_photo: boolean;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          storage_path: string;
          filename: string;
          size_bytes: number;
          is_completion_photo?: boolean;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          storage_path?: string;
          filename?: string;
          size_bytes?: number;
          is_completion_photo?: boolean;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_environment_member: {
        Args: { env_id: string };
        Returns: boolean;
      };
      get_user_id_by_email: {
        Args: { email_input: string };
        Returns: string | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
