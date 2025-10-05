import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIModel,
  AIProvider,
  ModelSelectionOptions,
  TaskType,
  UserAIPreferences,
} from '~/types/ai-models';
import crypto from 'crypto';

export class AIModelManager {
  constructor(private supabase: SupabaseClient) {}

  async getAvailableProviders(): Promise<AIProvider[]> {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch providers: ${error.message}`);
    }

    return data || [];
  }

  async getAvailableModels(providerId?: string): Promise<AIModel[]> {
    let query = this.supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true);

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch models: ${error.message}`);
    }

    return data || [];
  }

  async selectBestModel(options: ModelSelectionOptions): Promise<AIModel | null> {
    const { taskType = 'chat', userId, preferredProvider } = options;

    if (userId) {
      const userPrefs = await this.getUserPreferences(userId);

      if (userPrefs && !userPrefs.enable_auto_selection && userPrefs.preferred_model_id) {
        const model = await this.getModelById(userPrefs.preferred_model_id);
        if (model) {
          return model;
        }
      }
    }

    const { data, error } = await this.supabase.rpc('select_best_model_for_task', {
      p_task_type: taskType,
      p_user_id: userId || null,
    });

    if (error) {
      console.error('Error selecting best model:', error);
      return null;
    }

    if (data) {
      return await this.getModelById(data);
    }

    return null;
  }

  async getModelById(modelId: string): Promise<AIModel | null> {
    const { data, error } = await this.supabase
      .from('ai_models')
      .select('*')
      .eq('id', modelId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching model:', error);
      return null;
    }

    return data;
  }

  async getUserPreferences(userId: string): Promise<UserAIPreferences | null> {
    const { data, error } = await this.supabase
      .from('user_ai_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data;
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserAIPreferences>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_ai_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }

    return true;
  }

  async getCachedResponse(prompt: string): Promise<{
    response: string;
    model_id: string;
    tokens_used: number;
  } | null> {
    const promptHash = this.hashPrompt(prompt);

    const { data, error } = await this.supabase.rpc('get_cached_response', {
      p_prompt_hash: promptHash,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  }

  async saveCachedResponse(
    prompt: string,
    response: string,
    modelId: string,
    tokensUsed: number,
    cacheDurationHours: number = 24
  ): Promise<boolean> {
    const promptHash = this.hashPrompt(prompt);

    const { error } = await this.supabase.rpc('save_cached_response', {
      p_prompt_hash: promptHash,
      p_prompt: prompt,
      p_response: response,
      p_model_id: modelId,
      p_tokens_used: tokensUsed,
      p_cache_duration_hours: cacheDurationHours,
    });

    if (error) {
      console.error('Error saving cached response:', error);
      return false;
    }

    return true;
  }

  async logUsage(
    userId: string,
    modelId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    latencyMs: number,
    wasCached: boolean = false,
    fallbackUsed: boolean = false,
    taskType: string = '',
    success: boolean = true,
    errorMessage: string = ''
  ): Promise<boolean> {
    const { error } = await this.supabase.rpc('log_ai_usage', {
      p_user_id: userId,
      p_model_id: modelId,
      p_prompt_tokens: promptTokens,
      p_completion_tokens: completionTokens,
      p_cost: cost,
      p_latency_ms: latencyMs,
      p_was_cached: wasCached,
      p_fallback_used: fallbackUsed,
      p_task_type: taskType,
      p_success: success,
      p_error_message: errorMessage,
    });

    if (error) {
      console.error('Error logging AI usage:', error);
      return false;
    }

    return true;
  }

  async calculateCost(
    providerId: string,
    modelId: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<number> {
    const provider = await this.supabase
      .from('ai_providers')
      .select('cost_per_1k_input_tokens, cost_per_1k_output_tokens')
      .eq('id', providerId)
      .maybeSingle();

    const model = await this.supabase
      .from('ai_models')
      .select('cost_multiplier')
      .eq('id', modelId)
      .maybeSingle();

    if (provider.error || model.error || !provider.data || !model.data) {
      return 0;
    }

    const inputCost = (promptTokens / 1000) * provider.data.cost_per_1k_input_tokens;
    const outputCost = (completionTokens / 1000) * provider.data.cost_per_1k_output_tokens;

    return (inputCost + outputCost) * model.data.cost_multiplier;
  }

  private hashPrompt(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex');
  }
}
