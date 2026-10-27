// ============================================================================
// Edge Function "robo-comando"
//
// O ERP (qualquer PC/celular) chama AQUI. Esta função NÃO envia WhatsApp e
// NÃO consegue falar com 127.0.0.1 do computador da Central.
//
// Ela só enfileira um pedido em public.robo_comandos. O robô local, se
// estiver ligado e com WhatsApp conectado, puxa o pedido e decide o destino
// (travas de números reais, número de teste, 24h).
//
// Body: { comando: "vencido", cliente_id: number, confirm: true }
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_ORIGINS = [
  "https://gruporvjatai.github.io",
  "http://127.0.0.1:3010",
  "http://localhost:3010",
];

function corsFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow = !origin || origin === "null" || ALLOWED_ORIGINS.includes(origin)
    ? (origin && origin !== "null" ? origin : ALLOWED_ORIGINS[0])
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);

  const origin = req.headers.get("origin") || "";
  if (origin && origin !== "null" && !ALLOWED_ORIGINS.includes(origin)) {
    return json(req, { error: "origem não autorizada" }, 403);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "não autorizado" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.email) return json(req, { error: "não autorizado" }, 401);
  const email = userData.user.email;

  const { data: perfil, error: pErr } = await admin
    .from("usuarios")
    .select("email, nivel_acesso, ativo")
    .eq("email", email)
    .maybeSingle();
  if (pErr) return json(req, { error: pErr.message }, 500);
  const nivel = String(perfil?.nivel_acesso || "").toLowerCase();
  if (!perfil || perfil.ativo === false || !["admin", "superadmin"].includes(nivel)) {
    return json(req, { error: "só admin pode disparar cobrança" }, 403);
  }

  let body: { comando?: string; cliente_id?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "json inválido" }, 400);
  }

  if (body?.confirm !== true) {
    return json(req, { error: "Confirme o envio (confirm: true)" }, 400);
  }
  if (body?.comando !== "vencido") {
    return json(req, { error: "comando desconhecido" }, 400);
  }
  const clienteId = Number(body.cliente_id);
  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return json(req, { error: "Informe cliente_id" }, 400);
  }

  const { data, error } = await admin
    .from("robo_comandos")
    .insert({
      comando: "vencido",
      cliente_id: clienteId,
      confirm: true,
      status: "queued",
      requested_by: email,
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    if (String(error.message || "").toLowerCase().includes("robo_comandos_um_pendente")
      || error.code === "23505") {
      return json(req, { error: "Já existe um pedido deste cliente na fila do robô." }, 409);
    }
    return json(req, { error: error.message }, 500);
  }

  return json(req, {
    ok: true,
    id: data.id,
    status: data.status,
    message: "Pedido na fila. O robô local envia se o WhatsApp estiver conectado.",
  });
});
