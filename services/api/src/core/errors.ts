// PATH: services/api/src/core/errors.ts
// WHAT: Unified API error model and response formatter
// WHY:  Keeps error payload contract stable across routes
// RELEVANT: services/api/src/app.ts,specs/001-virtual-newsroom-mvp/contracts/api.md

import type { Context } from 'hono';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const toErrorResponse = (context: Context, error: unknown): Response => {
  if (error instanceof AppError) {
    return context.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      error.status,
    );
  }

  return context.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error',
      },
    },
    500,
  );
};
