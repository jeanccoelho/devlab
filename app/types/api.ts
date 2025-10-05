export interface SaveProjectResponse {
  success?: boolean;
  error?: string;
  project?: {
    id: string;
    user_id: string;
    name: string;
    description: string;
    files: any;
    is_public: boolean;
    share_token: string;
    view_count: number;
    fork_count: number;
    created_at: string;
    updated_at: string;
  };
}

export interface DeployProjectResponse {
  success?: boolean;
  error?: string;
  message?: string;
  deployment?: {
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
}
