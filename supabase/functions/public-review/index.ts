import { createClient } from "npm:@supabase/supabase-js@2";

// Only public client configuration belongs in frontend bundles. This credential stays at the edge.
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  const headers = { 'Access-Control-Allow-Origin': configured.includes(origin) ? origin : (configured[0] || '*'), 'Access-Control-Allow-Headers': 'authorization,apikey,x-client-info,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (configured.length && origin && !configured.includes(origin)) return reply({ error: 'Origin not allowed' }, 403);
  try {
    if (Number(req.headers.get('content-length') || 0) > 16000) return reply({ error: 'Request too large' }, 413);
    const raw = await req.text();
    if (raw.length > 16000) return reply({ error: 'Request too large' }, 413);
    const body = JSON.parse(raw);
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return reply({ error: 'Review link unavailable' }, 404);
    const action = body.action || 'read';
    if (!['read','comment','reply','decision'].includes(action)) return reply({ error: 'Invalid action' }, 400);
    const { data, error } = await db.rpc('public_review', { p_token: body.token, p_action: action, p_version: body.version_id || null, p_name: body.name || null, p_payload: body.payload || {} });
    if (error) return reply({ error: action === 'read' ? 'This review link is unavailable, revoked, or expired.' : 'This action could not be saved. Check your name, comment length, and link validity.' }, 403);
    if (action === 'read') {
      const versions = await Promise.all(data.versions.map(async (v: {storage_path: string}) => {
        const { data: signed, error: signError } = await db.storage.from('frameproof-assets').createSignedUrl(v.storage_path, 120);
        if (signError) throw new Error('Image unavailable');
        const { storage_path: _path, ...visible } = v;
        return { ...visible, signed_url: signed.signedUrl };
      }));
      return reply({ ...data, versions });
    }
    return reply(data);
  } catch { return reply({ error: 'Unable to process this review request.' }, 400); }
});
