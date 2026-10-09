// ============================================================================
// Edge Function "produto-foto" - upload/remocao de fotos de produto.
//
// Por que existe: o bucket "produtos-fotos" e publico para LEITURA, mas as
// policies de storage.objects nao podem ser criadas por este ambiente. Entao
// o upload/remocao e feito aqui, no servidor, com a service_role (que ignora
// a RLS). O cliente (navegador) envia a imagem ja redimensionada em base64.
//
// Requer JWT do usuario autenticado (verify_jwt = true no config.toml).
//
// Body (acao "upload"):
//   { action: "upload", id: <produtoId>, dataUrl: "data:image/jpeg;base64,..." }
//   -> { url, path }
//
// Body (acao "remove"):
//   { action: "remove", url: "<url publica antiga>" }
//   -> { ok: true }
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "produtos-fotos";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = String(url || "").indexOf(marker);
  if (idx === -1) return null;
  const raw = String(url).substring(idx + marker.length).split("?")[0];
  try { return decodeURIComponent(raw); } catch (_e) { return raw; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing authorization" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Valida o usuario logado (JWT) no Auth.
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "upload";

    if (action === "remove") {
      const path = pathFromPublicUrl(body?.url);
      if (!path) return json({ ok: true, skipped: true });
      const { error } = await admin.storage.from(BUCKET).remove([path]);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    const id = body?.id;
    const dataUrl = body?.dataUrl;
    if (!id || !dataUrl) return json({ error: "missing id/dataUrl" }, 400);

    const m = String(dataUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!m) return json({ error: "invalid dataUrl" }, 400);

    const contentType = m[1];
    const b64 = m[2];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const path = `produto_${id}_${Date.now()}.jpg`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, new Blob([bytes], { type: contentType }), {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    if (upErr) return json({ error: upErr.message }, 500);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    return json({ url: pub.publicUrl, path });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
