// PATH: services/api/src/providers/llm.ts
// WHAT: OpenRouter adapter implementing ContentPort
// WHY:  Isolates LLM provider integration behind shared interface
// RELEVANT: packages/shared/src/ports/content-port.ts,specs/001-virtual-newsroom-mvp/research.md

import { generateObject as aiGenerateObject, streamText as aiStreamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { ContentObjectInput, ContentPort, ContentTextInput } from '@newsroom/shared';

const getProvider = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required');
  }
  return createOpenRouter({ apiKey });
};

const toModel = (model: string) => getProvider()(model);

export const createContentPort = (): ContentPort => ({
  async streamText(input: ContentTextInput): Promise<AsyncIterable<string>> {
    const result = aiStreamText({
      model: toModel(input.model),
      prompt: input.prompt,
      system: input.system,
    });
    return result.textStream;
  },
  async generateObject<T>(input: ContentObjectInput): Promise<T> {
    const result = await aiGenerateObject({
      model: toModel(input.model),
      prompt: input.prompt,
      system: input.system,
      schema: input.schema as never,
    });
    return result.object as T;
  },
});
