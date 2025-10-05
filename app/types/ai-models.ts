export interface AIProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  api_key_required: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  priority: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIModel {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  description: string;
  is_active: boolean;
  max_tokens: number;
  context_window: number;
  capabilities: string[];
  cost_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface AIResponseCache {
  id: string;
  prompt_hash: string;
  prompt: string;
  response: string;
  model_id: string;
  tokens_used: number;
  hit_count: number;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  latency_ms: number;
  was_cached: boolean;
  fallback_used: boolean;
  task_type: string;
  success: boolean;
  error_message: string;
  created_at: string;
}

export interface UserAIPreferences {
  id: string;
  user_id: string;
  preferred_provider: string;
  preferred_model_id: string | null;
  enable_auto_selection: boolean;
  enable_cache: boolean;
  max_cost_per_request: number;
  created_at: string;
  updated_at: string;
}

export type TaskType =
  | 'code_generation'
  | 'debugging'
  | 'analysis'
  | 'chat'
  | 'refactoring'
  | 'documentation'
  | 'testing';

export interface ModelSelectionOptions {
  taskType?: TaskType;
  userId?: string;
  maxCost?: number;
  preferredProvider?: string;
}

export interface AIRequestMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  wasCached: boolean;
  fallbackUsed: boolean;
}
