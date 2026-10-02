import type { Bindings, Envelope, NormalizedKernelResponse } from "./types";

export type KernelExecutionContext = {
  identity: string;
  governanceContext: object;
  planetaryMode?: string;
  umbrellaEnforcement?: string;
  storage: DurableObjectStorage;
};

export default class KernelEngine {
  private readonly config: KernelExecutionContext;

  constructor(config: KernelExecutionContext) {
    this.config = config;
  }

  async dispatch(envelope: Envelope): Promise<NormalizedKernelResponse> {
    const lane = envelope.metadata?.route?.lane ?? "sim";

    return {
      ok: true,
      messageId: envelope.id,
      status: 200,
      data: {
        lane,
        envelope,
        config: this.config,
      },
    };
  }
}
