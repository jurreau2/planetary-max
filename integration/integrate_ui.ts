export const API_SURFACE = ['/api/status', '/api/state', '/api/write', '/api/snapshot', '/api/planet', '/api/kernel', '/api/umbrella', '/api/quantum'] as const;
export async function fetchPortalData() { const responses = await Promise.all(API_SURFACE.filter(path => path !== '/api/write').map(async path => [path, await (await fetch(path)).json()] as const)); return Object.fromEntries(responses); }
