// ============================================================================
// push.js - Notificacoes Web Push do RV PORTAL (client compartilhado).
//
// Usado por sistema.html e mobile.html. Expoe:
//   - openPushSettings()  : abre o modal de configuracoes
//   - initPush()          : registra o service worker (chamado automaticamente)
//   - maybePromptPushOnLogin() : pergunta no login se ainda nao ha inscricao
//
// O "o que notificar" e definido pelo ADMIN e vale para todos os usuarios.
// Cada usuario ativa/desativa o recebimento apenas NESTE dispositivo.
// ============================================================================

(function () {
  const EVENTOS = [
    { key: 'nova_venda',         label: 'Nova venda finalizada' },
    { key: 'conta_receber',      label: 'Contas a receber (hoje/atrasadas)' },
    { key: 'conta_pagar',        label: 'Contas a pagar (hoje/atrasadas)' },
    { key: 'instalacao_proxima', label: 'Instalacao agendada (hoje/amanha)' },
    { key: 'instalacao_status',  label: 'Instalacao reagendada/cancelada/concluida' },
    { key: 'estoque_baixo',      label: 'Estoque baixo/zerado' },
    { key: 'folha_gerada',       label: 'Folha gerada' },
    { key: 'vale_lancado',       label: 'Vale lancado' },
    { key: 'folha_pendente',     label: 'Folha pendente' },
  ];
  const PAPEIS = [
    { key: 'admin', label: 'Admin' },
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'instalador', label: 'Instalador' },
  ];

  const PROMPT_PENDENTE_KEY = 'rv_push_prompt_pendente';

  let modalEl = null;

  function optOutKey(uid) { return 'rv_push_optout:' + String(uid); }
  function promptCheckKey(uid) { return 'rv_push_checado:' + String(uid); }
  function marcarOptOut(uid) {
    if (!uid) return;
    try { localStorage.setItem(optOutKey(uid), '1'); } catch (_) { /* ignore */ }
  }
  function limparOptOut(uid) {
    if (!uid) return;
    try { localStorage.removeItem(optOutKey(uid)); } catch (_) { /* ignore */ }
  }

  function vapidConfigured() {
    const k = window.VAPID_PUBLIC_KEY;
    return !!(k && String(k).indexOf('__') !== 0 && k.length > 20);
  }

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function client() {
    try {
      if (typeof sb !== 'undefined' && sb) return sb;
    } catch (_) { /* ignore */ }
    if (!window.__pushSb) {
      window.__pushSb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return window.__pushSb;
  }

  async function registration() {
    if (!supported()) throw new Error('Este navegador nao suporta notificacoes push.');
    return await navigator.serviceWorker.register('sw.js');
  }

  async function currentSubscription() {
    if (!supported()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
  }

  async function userInfo() {
    const { data } = await client().auth.getUser();
    return { email: data?.user?.email || null, id: data?.user?.id || null };
  }

  // Verifica se a inscricao local ainda existe no banco. O Edge Function
  // remove inscricoes mortas (404/410); sem esta checagem o modal continuaria
  // mostrando "Ativo" mesmo sem nenhuma linha em push_subscriptions.
  async function subscriptionPersistida(endpoint) {
    if (!endpoint) return false;
    try {
      const { data, error } = await client()
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', endpoint)
        .maybeSingle();
      if (error) return true; // falha de leitura nao deve marcar como inativo
      return Boolean(data);
    } catch (_) {
      return true;
    }
  }

  async function subscribeDevice(forceFresh = false) {
    if (!vapidConfigured()) throw new Error('Chave VAPID nao configurada no deploy.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Permissao de notificacao negada.');
    const reg = await registration();
    await navigator.serviceWorker.ready;
    if (forceFresh) {
      // Inscricao orfa/morta: descarta o endpoint antigo para o navegador
      // gerar um novo, em vez de regravar o mesmo endpoint invalido.
      const antiga = await reg.pushManager.getSubscription();
      if (antiga) await antiga.unsubscribe();
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    const { email, id } = await userInfo();
    if (!email) throw new Error('Usuario sem e-mail cadastrado.');
    const { error } = await client().from('push_subscriptions').upsert({
      user_email: email.trim().toLowerCase(),
      user_id: id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) throw new Error(error.message);
    if (id) limparOptOut(id);
  }

  async function unsubscribeDevice() {
    const { id } = await userInfo();
    const sub = await currentSubscription();
    if (sub) {
      await client().from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
    // Desativar e uma escolha explicita: nao voltar a perguntar sozinho.
    if (id) marcarOptOut(id);
  }

  async function sendTest() {
    const { data } = await client().auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Sessao expirada. Faca login novamente.');
    const res = await fetch(window.SUPABASE_URL + '/functions/v1/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ event_key: 'test' }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Falha ao enviar teste.');
    if (!out.sent) throw new Error('Nenhum dispositivo inscrito recebeu o teste. Reative as notificacoes neste dispositivo.');
    return out;
  }

  function showPushPrompt(uid, stale) {
    if (document.getElementById('push-prompt-modal')) return;
    try { sessionStorage.removeItem(PROMPT_PENDENTE_KEY); } catch (_) { /* ignore */ }

    const el = document.createElement('div');
    el.id = 'push-prompt-modal';
    el.className = 'fixed inset-0 bg-slate-900/70 z-[130] flex items-end justify-center sm:items-center p-4';
    el.innerHTML = `
      <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <i data-lucide="bell" class="w-5 h-5"></i>
          </div>
          <div class="flex-1">
            <h3 class="font-black text-slate-800 text-base">${stale ? 'Reativar notificacoes?' : 'Ativar notificacoes?'}</h3>
            <p class="text-sm text-slate-600 mt-1">${stale
              ? 'A inscricao deste dispositivo expirou. Reative para voltar a receber os avisos.'
              : 'Receba avisos de vendas, contas e instalacoes neste dispositivo.'}</p>
          </div>
        </div>
        <label class="mt-4 flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" id="push-prompt-never" class="accent-indigo-600">
          Nao perguntar novamente neste dispositivo
        </label>
        <div class="mt-4 flex gap-2">
          <button type="button" id="push-prompt-later" class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">Agora nao</button>
          <button type="button" id="push-prompt-activate" class="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">${stale ? 'Reativar' : 'Ativar'}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    if (window.lucide) window.lucide.createIcons();

    const fechar = () => el.remove();
    el.querySelector('#push-prompt-later').addEventListener('click', () => {
      if (el.querySelector('#push-prompt-never').checked) marcarOptOut(uid);
      fechar();
    });
    el.querySelector('#push-prompt-activate').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await subscribeDevice(stale);
        toast('Notificacoes ativadas neste dispositivo.');
        fechar();
      } catch (err) {
        toast(String(err.message || err), true);
        btn.disabled = false;
      }
    });
  }

  // Chamado depois do login/carga dos dados. Se o usuario ja tem inscricao
  // valida (local + banco), nao pergunta. Se marcou "nao perguntar", respeita.
  async function maybePromptPushOnLogin() {
    if (!supported() || !vapidConfigured()) return;
    if (document.getElementById('push-prompt-modal')) return;
    const settingsModal = document.getElementById('push-settings-modal');
    if (settingsModal && !settingsModal.classList.contains('hidden')) return;

    let user = null;
    try {
      const { data } = await client().auth.getSession();
      user = data?.session?.user || null;
    } catch (_) {
      return;
    }
    if (!user || !user.id) return;

    const uid = String(user.id);
    let pendente = false;
    try { pendente = sessionStorage.getItem(PROMPT_PENDENTE_KEY) === '1'; } catch (_) { /* ignore */ }

    if (!pendente) {
      let checado = false;
      try { checado = sessionStorage.getItem(promptCheckKey(uid)) === '1'; } catch (_) { /* ignore */ }
      if (checado) return;
    }

    let optOut = false;
    try { optOut = localStorage.getItem(optOutKey(uid)) === '1'; } catch (_) { /* ignore */ }
    if (optOut) {
      try { sessionStorage.removeItem(PROMPT_PENDENTE_KEY); } catch (_) { /* ignore */ }
      return;
    }

    try { sessionStorage.setItem(promptCheckKey(uid), '1'); } catch (_) { /* ignore */ }

    if (Notification.permission === 'denied') {
      try { sessionStorage.removeItem(PROMPT_PENDENTE_KEY); } catch (_) { /* ignore */ }
      return;
    }

    let sub = null;
    try { sub = await currentSubscription(); } catch (_) { return; }

    if (Notification.permission === 'granted') {
      const persistida = sub ? await subscriptionPersistida(sub.endpoint) : false;
      if (sub && persistida) {
        try { sessionStorage.removeItem(PROMPT_PENDENTE_KEY); } catch (_) { /* ignore */ }
        return;
      }
    }

    showPushPrompt(uid, Boolean(sub) && Notification.permission === 'granted');
  }

  async function loadSettings() {
    const { data, error } = await client().from('notification_settings').select('*');
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function saveSettings(rows) {
    const { error } = await client().from('notification_settings').upsert(rows, { onConflict: 'event_key' });
    if (error) throw new Error(error.message);
  }

  function toast(msg, isError) {
    if (typeof window.showToast === 'function') return window.showToast(msg, !!isError);
    window.alert(msg);
  }

  async function refreshDeviceStatus() {
    const statusEl = document.getElementById('push-device-status');
    const btn = document.getElementById('push-toggle-btn');
    if (!statusEl || !btn) return;
    if (!supported()) {
      statusEl.textContent = 'Navegador sem suporte a notificacoes push.';
      btn.disabled = true;
      return;
    }
    if (!vapidConfigured()) {
      statusEl.textContent = 'Notificacoes indisponiveis (VAPID nao configurada no deploy).';
      btn.disabled = true;
      return;
    }
    const sub = await currentSubscription();
    let orfa = false;
    if (sub && Notification.permission === 'granted') {
      orfa = !(await subscriptionPersistida(sub.endpoint));
    }
    if (sub && Notification.permission === 'granted' && !orfa) {
      statusEl.innerHTML = '<span class="text-emerald-600 font-bold">Ativo neste dispositivo</span>';
      btn.textContent = 'Desativar neste dispositivo';
      btn.dataset.state = 'on';
      btn.dataset.stale = '';
    } else if (sub && Notification.permission === 'granted' && orfa) {
      statusEl.textContent = 'Inscricao expirada. Reative neste dispositivo.';
      btn.textContent = 'Reativar neste dispositivo';
      btn.dataset.state = 'off';
      btn.dataset.stale = '1';
    } else {
      statusEl.textContent = 'Inativo neste dispositivo.';
      btn.textContent = 'Ativar neste dispositivo';
      btn.dataset.state = 'off';
      btn.dataset.stale = '';
    }
    btn.disabled = false;
  }

  function buildModal() {
    if (modalEl) return modalEl;
    const el = document.createElement('div');
    el.id = 'push-settings-modal';
    el.className = 'hidden fixed inset-0 bg-slate-900/70 z-[120] flex items-end justify-center sm:items-center';
    el.innerHTML = `
      <div class="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div class="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 class="font-black text-lg text-slate-800 flex items-center gap-2">
            <i data-lucide="settings" class="w-5 h-5 text-indigo-600"></i> Notificacoes
          </h3>
          <button type="button" data-push-close class="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <i data-lucide="x"></i>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p class="text-xs font-bold text-slate-500 uppercase mb-2">Este dispositivo</p>
            <p id="push-device-status" class="text-sm text-slate-600 mb-3">Verificando...</p>
            <div class="flex flex-wrap gap-2">
              <button type="button" id="push-toggle-btn" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold active:scale-95 transition-transform">... </button>
              <button type="button" id="push-test-btn" class="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold active:scale-95 transition-transform">Enviar teste</button>
            </div>
          </div>

          <div id="push-admin-section" class="hidden">
            <p class="text-xs font-bold text-slate-500 uppercase mb-2">O que notificar (admin)</p>
            <div id="push-events" class="space-y-3"></div>
            <button type="button" id="push-save-btn" class="mt-4 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold active:scale-95 transition-transform">Salvar configuracoes</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector('[data-push-close]').addEventListener('click', () => el.classList.add('hidden'));
    el.addEventListener('click', (e) => { if (e.target === el) el.classList.add('hidden'); });
    // Fecha o modal de Notificacoes com a tecla Esc.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (!el.classList.contains('hidden')) el.classList.add('hidden');
    });
    el.querySelector('#push-toggle-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        if (btn.dataset.state === 'on') {
          await unsubscribeDevice();
          toast('Notificacoes desativadas neste dispositivo.');
        } else {
          await subscribeDevice(btn.dataset.stale === '1');
          toast('Notificacoes ativadas neste dispositivo.');
        }
      } catch (err) { toast(String(err.message || err), true); }
      btn.disabled = false;
      await refreshDeviceStatus();
    });
    el.querySelector('#push-test-btn').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try { await sendTest(); toast('Teste enviado!'); }
      catch (err) { toast(String(err.message || err), true); }
      e.currentTarget.disabled = false;
    });
    el.querySelector('#push-save-btn').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        const rows = [];
        for (const ev of EVENTOS) {
          const enabled = document.getElementById('push-en-' + ev.key)?.checked || false;
          const roles = PAPEIS
            .filter((p) => document.getElementById('push-role-' + ev.key + '-' + p.key)?.checked)
            .map((p) => p.key);
          rows.push({ event_key: ev.key, enabled, roles: roles.length ? roles : ['admin'], updated_at: new Date().toISOString() });
        }
        await saveSettings(rows);
        toast('Configuracoes salvas.');
      } catch (err) { toast(String(err.message || err), true); }
      e.currentTarget.disabled = false;
    });

    modalEl = el;
    return el;
  }

  function renderEvents(settings) {
    const map = {};
    settings.forEach((s) => { map[s.event_key] = s; });
    const box = document.getElementById('push-events');
    if (!box) return;
    box.innerHTML = EVENTOS.map((ev) => {
      const s = map[ev.key] || { enabled: true, roles: ['admin'] };
      const roles = s.roles || ['admin'];
      const roleInputs = PAPEIS.map((p) => `
        <label class="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" id="push-role-${ev.key}-${p.key}" ${roles.includes(p.key) ? 'checked' : ''} class="accent-indigo-600">
          ${p.label}
        </label>`).join('');
      return `
        <div class="p-3 rounded-xl border border-slate-200">
          <label class="flex items-center justify-between gap-3 cursor-pointer">
            <span class="text-sm font-bold text-slate-700">${ev.label}</span>
            <input type="checkbox" id="push-en-${ev.key}" ${s.enabled ? 'checked' : ''} class="w-5 h-5 accent-emerald-600">
          </label>
          <div class="mt-2 flex flex-wrap gap-3 pl-1">${roleInputs}</div>
        </div>`;
    }).join('');
  }

  async function openPushSettings() {
    const prompt = document.getElementById('push-prompt-modal');
    if (prompt) prompt.remove();
    buildModal().classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    await refreshDeviceStatus();

    const adminSection = document.getElementById('push-admin-section');
    const isAdmin = (typeof dadosUsuario !== 'undefined' && dadosUsuario && (dadosUsuario.nivel === 'admin' || dadosUsuario.nivel === 'superadmin'));
    if (isAdmin) {
      adminSection.classList.remove('hidden');
      try {
        const settings = await loadSettings();
        renderEvents(settings);
      } catch (err) {
        toast('Nao foi possivel carregar as configuracoes: ' + (err.message || err), true);
      }
    } else {
      adminSection.classList.add('hidden');
    }
  }

  function initPush() {
    if (!supported()) return;
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Falha ao registrar o service worker de push:', err);
    });
  }

  window.openPushSettings = openPushSettings;
  window.initPush = initPush;
  window.maybePromptPushOnLogin = maybePromptPushOnLogin;

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initPush();
  } else {
    window.addEventListener('DOMContentLoaded', initPush);
  }
})();
