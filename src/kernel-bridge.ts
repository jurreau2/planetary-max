import type {
  Envelope,
  NormalizedKernelResponse,
  Bindings,
} from "./types";

export type KernelExecutionContext = {
  identity: string;
  governanceContext: Record<string, unknown>;
  planetaryMode: string;
  umbrellaEnforcement: string;
  storage: DurableObjectStorage;
};

export async function callKernel(
  env: Bindings,
  envelope: Envelope,
): Promise<Response> {
  const kernelService = (env as Record<string, unknown>).KERNEL_SERVICE as unknown;
  if (!kernelService || typeof kernelService !== 'object' || !('fetch' in kernelService)) {
    throw new Error('KERNEL_SERVICE binding not available');
  }
  return (kernelService as { fetch: (req: Request) => Promise<Response> }).fetch(
    new Request('http://kernel/api/kernel/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    }),
  );
}

export class KernelEngine {
  private readonly config: Record<string, unknown>;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }

  async dispatch(envelope: Envelope): Promise<NormalizedKernelResponse> {
    const lane = (envelope as Record<string, unknown>).lane as string ?? 'sim';
    return {
      ok: true,
      messageId: (envelope as Record<string, unknown>).id as string | undefined,
      status: 200,
      body: {
        lane,
        envelope,
        config: this.config,
      },
    };
  }
}
