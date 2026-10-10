// ============================================================================
// Service Worker - RV PORTAL
// Responsavel por receber os eventos de push e abrir o app ao clicar.
// Tambem cacheia as FOTOS DE PRODUTO (bucket publico) para que carreguem
// instantaneamente e funcionem mesmo com sinal fraco/offline no campo.
// ============================================================================

const DEFAULT_ICON = "logo.png";
const DEFAULT_URL = "index.html";

// Cache somente das fotos de produto (nao afeta dados nem outras requisicoes).
const FOTO_CACHE = "rv-prod-fotos-v1";
const FOTO_BUCKET_MARKER = "/storage/v1/object/public/produtos-fotos/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("rv-prod-fotos-") && k !== FOTO_CACHE)
          .map((k) => caches.delete(k)),
      );
    } catch (_) { /* ignore */ }
    await self.clients.claim();
  })());
});

// Fotos de produto: cache-first (offline-friendly). Fallback para cache se a
// rede falhar. So intercepta GET do bucket "produtos-fotos".
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (!url.pathname.includes(FOTO_BUCKET_MARKER)) return;

  event.respondWith((async () => {
    const cache = await caches.open(FOTO_CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const resp = await fetch(req);
      // Respostas de imagem cross-origin chegam como "opaque" (nao permitem
      // ler o status), mas podem ser cacheadas normalmente.
      if (resp && (resp.ok || resp.type === "opaque") && resp.status !== 404) {
        try { await cache.put(req, resp.clone()); } catch (_) { /* ignore */ }
      }
      return resp;
    } catch (err) {
      const fallback = await cache.match(req, { ignoreSearch: true });
      if (fallback) return fallback;
      throw err;
    }
  })());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "RV Portal";
  const options = {
    body: data.body || "",
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_ICON,
    data: { url: data.url || DEFAULT_URL },
    tag: data.tag || undefined,
    renotify: !!data.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || DEFAULT_URL, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
