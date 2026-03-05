// PATH: services/api/src/providers/llm.ts
// WHAT: ContentPort factory backed by centralized LLM gateway
// WHY:  Keeps old port interface while moving flows to gateway
// RELEVANT: services/api/src/providers/llm/gateway.ts,packages/shared/src/ports/content-port.ts

import type { ContentObjectInput, ContentPort, ContentTextInput } from '@newsroom/shared';
import type { Logger } from './logger.js';
import { createLLMGateway } from './llm/gateway.js';

export const createContentPort = (logger: Logger): ContentPort => {
  const gateway = createLLMGateway(logger);
  return {
    streamText(input: ContentTextInput) {
      return gateway.streamText(input);
    },
    async generateObject<T>(input: ContentObjectInput): Promise<T> {
      return gateway.generateObject<T>(input);
    },
  };
};
