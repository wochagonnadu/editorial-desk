// PATH: packages/shared/src/ports/content-port.ts
// WHAT: LLM content generation and extraction port
// WHY:  Keeps model provider choice outside core modules
// RELEVANT: services/api/src/providers/llm.ts,specs/001-virtual-newsroom-mvp/research.md

export interface ContentTextInput {
  meta?: {
    useCase:
      | 'draft.generate'
      | 'draft.revise'
      | 'factcheck.extract'
      | 'factcheck.verify'
      | 'topics.suggest'
      | 'expert.voice.synthesize'
      | 'expert.voice.test.generate';
    promptId: string;
    promptVersion: `${number}.${number}.${number}`;
    traceId?: string;
    companyId?: string;
    expertId?: string;
  };
  promptVars?: Record<string, unknown>;
  voiceProfile?: {
    status: 'draft' | 'confirmed';
    confidence: number;
    version?: string;
  };
  policyOverride?: Partial<{ timeoutMs: number; retryMax: number }>;

  // Legacy fields kept for phased migration compatibility.
  model?: string;
  prompt?: string;
  system?: string;
}

export interface ContentObjectInput {
  meta?: {
    useCase:
      | 'draft.generate'
      | 'draft.revise'
      | 'factcheck.extract'
      | 'factcheck.verify'
      | 'topics.suggest'
      | 'expert.voice.synthesize'
      | 'expert.voice.test.generate';
    promptId: string;
    promptVersion: `${number}.${number}.${number}`;
    traceId?: string;
    companyId?: string;
    expertId?: string;
  };
  promptVars?: Record<string, unknown>;
  voiceProfile?: {
    status: 'draft' | 'confirmed';
    confidence: number;
    version?: string;
  };
  policyOverride?: Partial<{ timeoutMs: number; retryMax: number }>;

  // Legacy fields kept for phased migration compatibility.
  model?: string;
  prompt?: string;
  schema: unknown;
  system?: string;
}

export interface ContentPort {
  streamText(input: ContentTextInput): Promise<AsyncIterable<string>>;
  generateObject<T>(input: ContentObjectInput): Promise<T>;
}
