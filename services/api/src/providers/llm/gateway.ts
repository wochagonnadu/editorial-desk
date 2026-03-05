// PATH: services/api/src/providers/llm/gateway.ts
// WHAT: Central LLM gateway with prompt registry and policy guards
// WHY:  Unifies model calls with traceable metadata and fallback behavior
// RELEVANT: services/api/src/providers/llm/contracts.ts,services/api/src/providers/llm/policy.ts,services/api/src/providers/logger.ts

import { generateObject as aiGenerateObject, streamText as aiStreamText } from 'ai';
import { randomUUID } from 'node:crypto';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { ContentObjectInput, ContentTextInput } from '@newsroom/shared';
import type { Logger } from '../logger.js';
import { lookupPrompt } from './contracts.js';
import { useCasePolicy } from './policy.js';

const renderTemplate = (template: string, vars: Record<string, unknown>): string =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => String(vars[key] ?? ''));

const assertRequiredVars = (required: string[], vars: Record<string, unknown>) => {
  const missing = required.filter(
    (key) => vars[key] === undefined || vars[key] === null || vars[key] === '',
  );
  if (missing.length > 0)
    throw new Error(`VALIDATION_ERROR: missing prompt vars ${missing.join(',')}`);
};

const estimateCostUsd = (text: string): number =>
  Number(((text.length / 4 / 1000) * 0.0015).toFixed(6));

const resolveTraceId = (traceId?: string): string =>
  typeof traceId === 'string' && traceId.trim().length > 0 ? traceId : randomUUID();

const resolveModel = (
  primaryEnv: string,
  fallbackEnv: string,
): { primary: string; fallback: string } => ({
  primary: process.env[primaryEnv] ?? 'openai/gpt-4o-mini',
  fallback:
    process.env[fallbackEnv] ?? process.env.LLM_FALLBACK_DEFAULT_MODEL ?? 'openai/gpt-4o-mini',
});

export const createLLMGateway = (logger: Logger) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');
  const provider = createOpenRouter({ apiKey });

  const streamText = async (input: ContentTextInput): Promise<AsyncIterable<string>> => {
    if (!input.meta || !input.promptVars) {
      if (!input.model || !input.prompt) {
        throw new Error('VALIDATION_ERROR: meta or legacy model+prompt is required');
      }
      const legacy = aiStreamText({
        model: provider(input.model),
        prompt: input.prompt,
        system: input.system,
      });
      return legacy.textStream;
    }
    const meta = input.meta;
    const promptVars = input.promptVars;
    const prompt = lookupPrompt(meta);
    if (!prompt) throw new Error('VALIDATION_ERROR: prompt not found');
    const policy = useCasePolicy[meta.useCase];
    const traceId = resolveTraceId(meta.traceId);
    assertRequiredVars(prompt.requiredVars, promptVars);
    if (policy.requiresVoiceProfile && !input.voiceProfile)
      throw new Error('VOICE_PROFILE_REQUIRED');
    const renderedPrompt = renderTemplate(prompt.user, promptVars);
    const models = resolveModel(policy.primaryModelEnv, policy.fallbackModelEnv);

    let attempt = 1;
    while (attempt <= policy.retryMax) {
      const startedAt = Date.now();
      try {
        logger.info('llm.request.start', {
          trace_id: traceId,
          use_case: meta.useCase,
          provider: 'openrouter',
          model: models.primary,
          prompt_id: meta.promptId,
          prompt_version: meta.promptVersion,
          attempt,
          fallback_used: false,
        });
        const result = aiStreamText({
          model: provider(models.primary),
          prompt: renderedPrompt,
          system: prompt.system,
          abortSignal: AbortSignal.timeout(input.policyOverride?.timeoutMs ?? policy.timeoutMs),
        });
        const textStream = result.textStream;
        const wrapped = async function* () {
          let size = 0;
          for await (const chunk of textStream) {
            size += chunk.length;
            yield chunk;
          }
          logger.info('llm.request.success', {
            trace_id: traceId,
            use_case: meta.useCase,
            provider: 'openrouter',
            model: models.primary,
            prompt_id: meta.promptId,
            prompt_version: meta.promptVersion,
            latency_ms: Date.now() - startedAt,
            attempt,
            fallback_used: false,
            estimated_cost_usd: estimateCostUsd('x'.repeat(size)),
          });
        };
        return wrapped();
      } catch (error) {
        logger.warn('llm.request.error', {
          trace_id: traceId,
          use_case: meta.useCase,
          provider: 'openrouter',
          model: models.primary,
          prompt_id: meta.promptId,
          prompt_version: meta.promptVersion,
          latency_ms: Date.now() - startedAt,
          attempt,
          fallback_used: false,
          error_message: error instanceof Error ? error.message : String(error),
        });
      }
      attempt += 1;
    }
    logger.warn('llm.request.fallback', {
      trace_id: traceId,
      use_case: meta.useCase,
      prompt_id: meta.promptId,
      prompt_version: meta.promptVersion,
      primary_model: models.primary,
      fallback_model: models.fallback,
      attempt: policy.retryMax,
    });
    const fallbackStartedAt = Date.now();
    const fallbackResult = aiStreamText({
      model: provider(models.fallback),
      prompt: renderedPrompt,
      system: prompt.system,
      abortSignal: AbortSignal.timeout(input.policyOverride?.timeoutMs ?? policy.timeoutMs),
    });
    const wrappedFallback = async function* () {
      let size = 0;
      for await (const chunk of fallbackResult.textStream) {
        size += chunk.length;
        yield chunk;
      }
      logger.info('llm.request.success', {
        trace_id: traceId,
        use_case: meta.useCase,
        provider: 'openrouter',
        model: models.fallback,
        prompt_id: meta.promptId,
        prompt_version: meta.promptVersion,
        latency_ms: Date.now() - fallbackStartedAt,
        attempt: policy.retryMax,
        fallback_used: true,
        estimated_cost_usd: estimateCostUsd('x'.repeat(size)),
      });
    };
    return wrappedFallback();
  };

  const generateObject = async <T>(input: ContentObjectInput): Promise<T> => {
    if (!input.meta || !input.promptVars) {
      if (!input.model || !input.prompt) {
        throw new Error('VALIDATION_ERROR: meta or legacy model+prompt is required');
      }
      const legacy = await aiGenerateObject({
        model: provider(input.model),
        prompt: input.prompt,
        system: input.system,
        schema: input.schema as never,
      });
      return legacy.object as T;
    }
    const meta = input.meta;
    const promptVars = input.promptVars;
    const prompt = lookupPrompt(meta);
    if (!prompt) throw new Error('VALIDATION_ERROR: prompt not found');
    const policy = useCasePolicy[meta.useCase];
    const traceId = resolveTraceId(meta.traceId);
    assertRequiredVars(prompt.requiredVars, promptVars);
    if (policy.requiresVoiceProfile && !input.voiceProfile)
      throw new Error('VOICE_PROFILE_REQUIRED');
    const renderedPrompt = renderTemplate(prompt.user, promptVars);
    const models = resolveModel(policy.primaryModelEnv, policy.fallbackModelEnv);
    const startedAt = Date.now();
    try {
      logger.info('llm.request.start', {
        trace_id: traceId,
        use_case: meta.useCase,
        provider: 'openrouter',
        model: models.primary,
        prompt_id: meta.promptId,
        prompt_version: meta.promptVersion,
        attempt: 1,
        fallback_used: false,
      });
      const result = await aiGenerateObject({
        model: provider(models.primary),
        prompt: renderedPrompt,
        system: prompt.system,
        schema: input.schema as never,
        abortSignal: AbortSignal.timeout(input.policyOverride?.timeoutMs ?? policy.timeoutMs),
      });
      logger.info('llm.request.success', {
        trace_id: traceId,
        use_case: meta.useCase,
        provider: 'openrouter',
        model: models.primary,
        prompt_id: meta.promptId,
        prompt_version: meta.promptVersion,
        latency_ms: Date.now() - startedAt,
        attempt: 1,
        fallback_used: false,
        estimated_cost_usd: estimateCostUsd(renderedPrompt),
      });
      return result.object as T;
    } catch {
      logger.warn('llm.request.fallback', {
        trace_id: traceId,
        use_case: meta.useCase,
        prompt_id: meta.promptId,
        prompt_version: meta.promptVersion,
        primary_model: models.primary,
        fallback_model: models.fallback,
        attempt: 1,
      });
      const fallback = await aiGenerateObject({
        model: provider(models.fallback),
        prompt: renderedPrompt,
        system: prompt.system,
        schema: input.schema as never,
        abortSignal: AbortSignal.timeout(input.policyOverride?.timeoutMs ?? policy.timeoutMs),
      });
      logger.info('llm.request.success', {
        trace_id: traceId,
        use_case: meta.useCase,
        provider: 'openrouter',
        model: models.fallback,
        prompt_id: meta.promptId,
        prompt_version: meta.promptVersion,
        latency_ms: Date.now() - startedAt,
        attempt: 1,
        fallback_used: true,
        estimated_cost_usd: estimateCostUsd(renderedPrompt),
      });
      return fallback.object as T;
    }
  };

  return { streamText, generateObject };
};
