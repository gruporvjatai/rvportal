// ============================================================================
// Edge Function "notify" - fan-out de notificacoes Web Push (VAPID).
//
// Dois modos de chamada:
//   1) Webhook do banco (pg_net): envia o header "x-webhook-secret".
//      Body: { event_key, ref_id, title, body, url }
//   2) Teste do app (JWT do usuario autenticado): event_key = "test".
//      Envia apenas para as inscricoes do proprio usuario.
//
// A "audiencia" (quais niveis recebem cada evento) vem da tabela
// notification_settings (definida pelo admin).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@gruporvjatai.com.br";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type Body = {
  event_key?: string;
  ref_id?: string;
  title?: string;
  body?: string;
  url?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: "VAPID keys nao configuradas" }, 500);
  }

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "json invalido" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ------------------------------------------------------------------
  // Autorizacao: webhook (secret) OU usuario autenticado (apenas test)
  // ------------------------------------------------------------------
  const secretHeader = req.headers.get("x-webhook-secret") ?? "";
  const isWebhook = WEBHOOK_SECRET !== "" && secretHeader === WEBHOOK_SECRET;

  let testEmail: string | null = null;
  if (!isWebhook) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "nao autorizado" }, 401);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) return json({ error: "nao autorizado" }, 401);
    if (payload.event_key !== "test") return json({ error: "nao autorizado" }, 401);
    testEmail = data.user.email;
  }

  // ------------------------------------------------------------------
  // Resolve publico + mensagem
  // ------------------------------------------------------------------
  let recipients: string[] = [];
  let eventKey = payload.event_key ?? "";
  let refId = payload.ref_id ?? "";
  let title = payload.title ?? "RV Portal";
  let bodyText = payload.body ?? "";
  const url = payload.url || "";
  let skipDedup = false;

  if (testEmail) {
    eventKey = "test";
    refId = "test:" + Date.now();
    recipients = [testEmail];
    title = payload.title || "Teste de notificacao";
    bodyText = payload.body || "Se voce recebeu isto, as notificacoes estao funcionando.";
    skipDedup = true;
  } else {
    if (!eventKey || !refId) return json({ error: "event_key e ref_id obrigatorios" }, 400);

    const { data: setting, error: sErr } = await supabase
      .from("notification_settings")
      .select("enabled, roles")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (sErr) return json({ error: sErr.message }, 500);
    if (!setting) return json({ ok: true, skipped: "evento desconhecido" });
    if (!setting.enabled) return json({ ok: true, skipped: "desativado" });

    const roles: string[] = setting.roles ?? ["admin"];
    const { data: users, error: uErr } = await supabase
      .from("usuarios")
      .select("email")
      .in("nivel_acesso", roles)
      .eq("ativo", true)
      .not("email", "is", null);

    if (uErr) return json({ error: uErr.message }, 500);
    recipients = (users ?? [])
      .map((u: { email: string | null }) => (u.email ?? "").trim().toLowerCase())
      .filter((e: string) => e.length > 0);
  }

  if (recipients.length === 0) return json({ ok: true, sent: 0, reason: "sem destinatarios" });

  // ------------------------------------------------------------------
  // Carrega inscricoes desses usuarios
  // ------------------------------------------------------------------
  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_email, endpoint, p256dh, auth")
    .in("user_email", recipients);

  if (subErr) return json({ error: subErr.message }, 500);
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0, reason: "sem inscricoes" });

  // ------------------------------------------------------------------
  // Idempotencia
  // ------------------------------------------------------------------
  let jaEnviados = new Set<string>();
  if (!skipDedup) {
    const { data: logs } = await supabase
      .from("notification_log")
      .select("user_email")
      .eq("event_key", eventKey)
      .eq("ref_id", refId);
    jaEnviados = new Set((logs ?? []).map((l: { user_email: string }) => l.user_email));
  }

  // ------------------------------------------------------------------
  // Envia
  // ------------------------------------------------------------------
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const pushBody = JSON.stringify({ title, body: bodyText, url });
  let sent = 0, skipped = 0, failed = 0;
  const deadSubs: number[] = [];

  for (const sub of subs) {
    if (!skipDedup && jaEnviados.has(sub.user_email)) {
      skipped++;
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushBody,
      );
      sent++;
      await supabase
        .from("notification_log")
        .upsert(
          { event_key: eventKey, ref_id: refId, user_email: sub.user_email },
          { onConflict: "event_key,ref_id,user_email", ignoreDuplicates: true },
        );
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        deadSubs.push(sub.id);
      } else {
        failed++;
        console.error("push falhou", sub.endpoint, status, String(err));
      }
    }
  }

  if (deadSubs.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadSubs);
  }

  return json({ ok: true, sent, skipped, failed, removed: deadSubs.length });
});
