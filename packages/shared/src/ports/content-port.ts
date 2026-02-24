// PATH: packages/shared/src/ports/content-port.ts
// WHAT: LLM content generation and extraction port
// WHY:  Keeps model provider choice outside core modules
// RELEVANT: services/api/src/providers/llm.ts,specs/001-virtual-newsroom-mvp/research.md

export interface ContentTextInput {
  model: string;
  prompt: string;
  system?: string;
}

export interface ContentObjectInput {
  model: string;
  prompt: string;
  schema: unknown;
  system?: string;
}

export interface ContentPort {
  streamText(input: ContentTextInput): Promise<AsyncIterable<string>>;
  generateObject<T>(input: ContentObjectInput): Promise<T>;
}
