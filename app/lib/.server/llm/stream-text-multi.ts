import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { AIModelManager } from './ai-model-manager';
import { createMultiModelProvider } from './multi-model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';
import type { TaskType } from '~/types/ai-models';

interface ToolResult<Name extends string, Args, Result> {
  state: 'result';
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export interface StreamTextOptions {
  messages: Messages;
  env: Env;
  userId?: string;
  taskType?: TaskType;
  request?: Request;
  enableCache?: boolean;
  onFinish?: (result: {
    text: string;
    finishReason: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }) => Promise<void>;
}

export async function streamTextMultiModel(options: StreamTextOptions) {
  const { messages, env, userId, taskType = 'chat', request, enableCache = true, onFinish } = options;

  const supabase = request ? createSupabaseServerClient(request) : null;
  const aiManager = supabase ? new AIModelManager(supabase) : null;
  const modelProvider = createMultiModelProvider(env);

  let selectedModel = null;
  let modelInfo = null;
  let providerInfo = null;
  const startTime = Date.now();

  if (aiManager && userId) {
    const userPrefs = await aiManager.getUserPreferences(userId);

    if (enableCache && userPrefs?.enable_cache) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        const cached = await aiManager.getCachedResponse(lastMessage.content);

        if (cached) {
          console.log('Using cached response');

          if (aiManager && userId) {
            await aiManager.logUsage(
              userId,
              cached.model_id,
              0,
              0,
              0,
              Date.now() - startTime,
              true,
              false,
              taskType,
              true,
              ''
            );
          }

          return {
            text: cached.response,
            wasCached: true,
          };
        }
      }
    }

    modelInfo = await aiManager.selectBestModel({
      taskType,
      userId,
    });

    if (modelInfo) {
      const providers = await aiManager.getAvailableProviders();
      providerInfo = providers.find((p) => p.id === modelInfo.provider_id);

      if (providerInfo) {
        const modelResult = await modelProvider.selectModelWithFallback(
          providerInfo.name,
          modelInfo.model_id,
          [
            { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20240620' },
            { provider: 'openai', modelId: 'gpt-4-turbo' },
            { provider: 'google', modelId: 'gemini-1.5-pro' },
          ]
        );

        if (modelResult) {
          selectedModel = modelResult.model;

          const finalOnFinish = async (result: any) => {
            const latency = Date.now() - startTime;

            if (aiManager && userId && modelInfo) {
              const cost = await aiManager.calculateCost(
                providerInfo!.id,
                modelInfo.id,
                result.usage?.promptTokens || 0,
                result.usage?.completionTokens || 0
              );

              await aiManager.logUsage(
                userId,
                modelInfo.id,
                result.usage?.promptTokens || 0,
                result.usage?.completionTokens || 0,
                cost,
                latency,
                false,
                modelResult.usedFallback,
                taskType,
                true,
                ''
              );

              if (enableCache && result.text) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.role === 'user') {
                  await aiManager.saveCachedResponse(
                    lastMessage.content,
                    result.text,
                    modelInfo.id,
                    result.usage?.totalTokens || 0
                  );
                }
              }
            }

            if (onFinish) {
              await onFinish(result);
            }
          };

          return _streamText({
            model: selectedModel,
            system: getSystemPrompt(),
            maxTokens: modelInfo.max_tokens || MAX_TOKENS,
            messages: convertToCoreMessages(messages),
            onFinish: finalOnFinish,
          });
        }
      }
    }
  }

  console.warn('Falling back to default Anthropic model');
  const fallbackModel = modelProvider.getModel('anthropic', 'claude-3-5-sonnet-20240620');

  if (!fallbackModel) {
    throw new Error('No AI models available');
  }

  return _streamText({
    model: fallbackModel,
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(messages),
    onFinish,
  });
}
