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
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      }),
      {
        status: error.status,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error',
      },
    }),
    {
      status: 500,
      headers: { 'content-type': 'application/json' },
    },
  );
};
