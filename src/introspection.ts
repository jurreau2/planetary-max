import type { Envelope, NormalizedKernelResponse } from "./types";

export async function callKernel(_env: unknown, _envelope: Envelope): Promise<Response> {
  const response: NormalizedKernelResponse = {
    ok: true,
    messageId: _envelope.id,
    status: 200,
    data: { received: true, lane: _envelope.metadata?.route?.lane ?? "sim" },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
