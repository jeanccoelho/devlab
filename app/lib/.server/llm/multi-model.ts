import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import type { LanguageModelV1 } from 'ai';

export interface ModelProviderConfig {
  provider: string;
  apiKey: string;
}

export class MultiModelProvider {
  private anthropic: ReturnType<typeof createAnthropic> | null = null;
  private openai: ReturnType<typeof createOpenAI> | null = null;
  private google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
  private mistral: ReturnType<typeof createMistral> | null = null;

  constructor(private env: Env) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (this.env.ANTHROPIC_API_KEY) {
      this.anthropic = createAnthropic({
        apiKey: this.env.ANTHROPIC_API_KEY,
      });
    }

    if (this.env.OPENAI_API_KEY) {
      this.openai = createOpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
    }

    if (this.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.google = createGoogleGenerativeAI({
        apiKey: this.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
    }

    if (this.env.MISTRAL_API_KEY) {
      this.mistral = createMistral({
        apiKey: this.env.MISTRAL_API_KEY,
      });
    }
  }

  getModel(provider: string, modelId: string): LanguageModelV1 | null {
    switch (provider) {
      case 'anthropic':
        return this.anthropic ? this.anthropic(modelId) as any as LanguageModelV1 : null;

      case 'openai':
        return this.openai ? this.openai(modelId) as any as LanguageModelV1 : null;

      case 'google':
        return this.google ? this.google(modelId) as any as LanguageModelV1 : null;

      case 'mistral':
        return this.mistral ? this.mistral(modelId) as any as LanguageModelV1 : null;

      default:
        console.warn(`Unknown provider: ${provider}`);
        return null;
    }
  }

  async getAvailableProviders(): Promise<string[]> {
    const providers: string[] = [];

    if (this.anthropic) providers.push('anthropic');
    if (this.openai) providers.push('openai');
    if (this.google) providers.push('google');
    if (this.mistral) providers.push('mistral');

    return providers;
  }

  isProviderAvailable(provider: string): boolean {
    switch (provider) {
      case 'anthropic':
        return this.anthropic !== null;
      case 'openai':
        return this.openai !== null;
      case 'google':
        return this.google !== null;
      case 'mistral':
        return this.mistral !== null;
      default:
        return false;
    }
  }

  async selectModelWithFallback(
    primaryProvider: string,
    primaryModelId: string,
    fallbackProviders: Array<{ provider: string; modelId: string }>
  ): Promise<{ model: LanguageModelV1; provider: string; modelId: string; usedFallback: boolean } | null> {
    const primaryModel = this.getModel(primaryProvider, primaryModelId);

    if (primaryModel && this.isProviderAvailable(primaryProvider)) {
      return {
        model: primaryModel,
        provider: primaryProvider,
        modelId: primaryModelId,
        usedFallback: false,
      };
    }

    console.warn(`Primary provider ${primaryProvider} not available, trying fallbacks...`);

    for (const fallback of fallbackProviders) {
      const fallbackModel = this.getModel(fallback.provider, fallback.modelId);

      if (fallbackModel && this.isProviderAvailable(fallback.provider)) {
        console.log(`Using fallback provider: ${fallback.provider}`);
        return {
          model: fallbackModel,
          provider: fallback.provider,
          modelId: fallback.modelId,
          usedFallback: true,
        };
      }
    }

    console.error('No available providers found');
    return null;
  }
}

export function createMultiModelProvider(env: Env): MultiModelProvider {
  return new MultiModelProvider(env);
}
