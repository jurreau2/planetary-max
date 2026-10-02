# planetary-max (Phase-18) — DEPRECATED

## Status
**This repository is officially deprecated.**  
It represents the **Phase-18 kernel + control surface** for the Portal-OS ecosystem and is **no longer deployable** on Cloudflare Workers.

Planetary-max has been **superseded** by the Phase-19 kernel:

➡️ https://github.com/jurreau2/portal-os

## Why It's Deprecated
Planetary-max was built on **Phase-18 substrate and envelope contracts**, including:
- JsonValue / JsonObject
- NormalizedSIMState
- TraceSpan.id / TraceSpan.end
- Phase-18 error codes
- Phase-18 state models
- Phase-18 envelope execution
- Phase-18 substrate mutation

Phase-19 (MAX-OS-1 + portal-os) introduced **breaking changes**:
- New substrate model
- New envelope executor
- New state model (StateModel<SIMState>)
- New TraceSpan (spanId + finish())
- New error code definitions
- New Worker bindings
- New service topology

Planetary-max is **not compatible** with Phase-19 and **cannot be deployed**.

## Replacement: portal-os (Phase-19 Kernel)
The new kernel lives here:

➡️ https://github.com/jurreau2/portal-os

Portal-OS provides:
- `/health` endpoint
- `/envelope` executor
- `/substrate` mutator
- Phase-19 contract layer
- Cloudflare Workers service binding for MAX-OS-1

## Migration Path (Summary)
1. **Create portal-os** (Phase-19 kernel) — ✓ Done
2. **Wire MAX-OS-1** to portal-os via Worker service binding
3. **Move any relevant logic** from planetary-max into portal-os
4. **Mark planetary-max as legacy** (this document) — ✓ Done
5. **Do not deploy planetary-max** — keep for historical reference only

## Legacy Value
This repository remains useful for:
- Historical reference
- Reviewing Phase-18 substrate/envelope logic
- Understanding the evolution of Portal-OS architecture

## Deployment Status
❌ **Not deployable**  
❌ **Not maintained**  
✔️ **Superseded by portal-os (Phase-19)**  
