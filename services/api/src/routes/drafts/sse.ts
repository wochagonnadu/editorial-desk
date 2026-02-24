// PATH: services/api/src/routes/drafts/sse.ts
// WHAT: Server-sent events response helper for pipeline endpoints
// WHY:  Keeps streaming route handlers concise and reusable
// RELEVANT: services/api/src/routes/drafts/pipeline.ts,specs/001-virtual-newsroom-mvp/contracts/api.md

const encoder = new TextEncoder();

export const sseResponse = (events: AsyncGenerator<Record<string, unknown>, void, void>): Response => {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
};
