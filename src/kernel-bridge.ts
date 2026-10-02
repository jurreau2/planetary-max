import type {
  Envelope,
  NormalizedKernelResponse,
} from "./types";

export type KernelExecutionContext = {
  identity: string;
  governanceContext: Record<string, unknown>;
  planetaryMode: string;
  umbrellaEnforcement: string;
  storage: DurableObjectStorage;
};

export class KernelEngine {
  private readonly config: Record<string, unknown>;

  constructor(config: Record<string, unknown>) {
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
