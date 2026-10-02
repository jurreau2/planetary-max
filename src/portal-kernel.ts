export class KernelEngine {
  async dispatch(_input: unknown): Promise<{ ok: boolean; status: number; body: unknown }> {
    return { ok: true, status: 200, body: {} };
  }
}
