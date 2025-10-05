export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'user' | 'admin';
          token_balance: number;
          total_tokens_purchased: number;
          total_tokens_consumed: number;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: 'user' | 'admin';
          token_balance?: number;
          total_tokens_purchased?: number;
          total_tokens_consumed?: number;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: 'user' | 'admin';
          token_balance?: number;
          total_tokens_purchased?: number;
          total_tokens_consumed?: number;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      token_packages: {
        Row: {
          id: string;
          name: string;
          token_amount: number;
          price: number;
          description: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          token_amount: number;
          price: number;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          token_amount?: number;
          price?: number;
          description?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          package_id: string | null;
          amount: number;
          token_amount: number;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          payment_method: string;
          payment_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id?: string | null;
          amount: number;
          token_amount: number;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          payment_method?: string;
          payment_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string | null;
          amount?: number;
          token_amount?: number;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          payment_method?: string;
          payment_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      token_usage: {
        Row: {
          id: string;
          user_id: string;
          tokens_consumed: number;
          chat_id: string;
          model_used: string;
          prompt_tokens: number;
          completion_tokens: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tokens_consumed: number;
          chat_id?: string;
          model_used?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tokens_consumed?: number;
          chat_id?: string;
          model_used?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          created_at?: string;
        };
      };
      admin_actions_log: {
        Row: {
          id: string;
          admin_id: string;
          action_type: string;
          target_user_id: string | null;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action_type: string;
          target_user_id?: string | null;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action_type?: string;
          target_user_id?: string | null;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          files: Json;
          preview_image: string | null;
          is_public: boolean | null;
          share_token: string;
          view_count: number | null;
          fork_count: number | null;
          like_count: number | null;
          thumbnail_url: string | null;
          tags: string[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          files?: Json;
          preview_image?: string | null;
          is_public?: boolean | null;
          share_token?: string;
          view_count?: number | null;
          fork_count?: number | null;
          like_count?: number | null;
          thumbnail_url?: string | null;
          tags?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          files?: Json;
          preview_image?: string | null;
          is_public?: boolean | null;
          share_token?: string;
          view_count?: number | null;
          fork_count?: number | null;
          like_count?: number | null;
          thumbnail_url?: string | null;
          tags?: string[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      project_deployments: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          platform: 'netlify' | 'vercel' | 'cloudflare';
          deployment_url: string;
          deployment_id: string;
          status: 'pending' | 'deploying' | 'success' | 'failed';
          error_message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          platform: 'netlify' | 'vercel' | 'cloudflare';
          deployment_url?: string;
          deployment_id?: string;
          status?: 'pending' | 'deploying' | 'success' | 'failed';
          error_message?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          platform?: 'netlify' | 'vercel' | 'cloudflare';
          deployment_url?: string;
          deployment_id?: string;
          status?: 'pending' | 'deploying' | 'success' | 'failed';
          error_message?: string;
          created_at?: string;
        };
      };
      project_forks: {
        Row: {
          id: string;
          original_project_id: string;
          forked_project_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          original_project_id: string;
          forked_project_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          original_project_id?: string;
          forked_project_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      chat_favorites: {
        Row: {
          id: string;
          user_id: string;
          chat_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chat_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chat_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      consume_tokens: {
        Args: {
          p_user_id: string;
          p_tokens: number;
          p_chat_id?: string;
          p_model_used?: string;
          p_prompt_tokens?: number;
          p_completion_tokens?: number;
        };
        Returns: boolean;
      };
      process_token_purchase: {
        Args: {
          p_transaction_id: string;
        };
        Returns: void;
      };
      increment_project_views: {
        Args: {
          p_project_id: string;
        };
        Returns: void;
      };
      fork_project: {
        Args: {
          p_original_project_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      get_project_by_share_token: {
        Args: {
          p_share_token: string;
        };
        Returns: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          files: Json;
          preview_image: string;
          view_count: number;
          fork_count: number;
          created_at: string;
          updated_at: string;
          owner_name: string;
        }[];
      };
    };
  };
};
