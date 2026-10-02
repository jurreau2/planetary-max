export async function callKernel(_env: unknown, _envelope: unknown): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, status: 200, body: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
}
