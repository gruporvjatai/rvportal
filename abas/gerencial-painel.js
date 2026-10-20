// gerencial-painel.js – interface da aba Painel Executivo (desktop).
(function () {
  'use strict';

  const CORE = window.GerencialPainelCore;
  let ultimo = null;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(v) {
    const n = Number(v) || 0;
    if (typeof window.formatMoney === 'function') return window.formatMoney(n);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function num(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function pct(v) {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  function hojeLocal() {
    if (typeof window.getHojeLocalStr === 'function') return window.getHojeLocalStr();
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function mesAtual() {
    return hojeLocal().slice(0, 7);
  }

  function fmtData(iso) {
    if (!iso) return '—';
    if (typeof window.formatDate === 'function') return window.formatDate(iso);
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  function getHTML() {
    const mes = mesAtual();
    const p = CORE && CORE.periodoDoMes ? CORE.periodoDoMes(mes) : null;
    return `
      <div class="space-y-5">
        <div class="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i data-lucide="layout-dashboard" class="text-emerald-600"></i> Painel Executivo
            </h2>
            <p class="text-xs text-slate-500 mt-1">Caixa, DRE por competência, contas em aberto e projeção. Valores conferem com o Financeiro.</p>
          </div>
          <button onclick="imprimirAba('painel-executivo')" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2 no-print">
            <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
          </button>
        </div>

        <div class="flex flex-wrap items-end gap-3 bg-white p-3 rounded-xl shadow-sm border no-print">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Mes</label>
            <input type="month" id="gp-mes" value="${esc(mes)}" class="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Inicio</label>
            <input type="date" id="gp-inicio" value="${p ? p.inicio : ''}" class="p-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Fim</label>
            <input type="date" id="gp-fim" value="${p ? p.fim : ''}" class="p-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none" />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Comparar com</label>
            <select id="gp-comparar" class="p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 outline-none">
              <option value="mes-anterior">Mes anterior</option>
              <option value="ano-anterior">Mesmo mes do ano anterior</option>
              <option value="periodo-anterior">Periodo anterior igual</option>
              <option value="nenhum">Sem comparacao</option>
            </select>
          </div>
          <button id="gp-aplicar" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">Aplicar</button>
          <button id="gp-atualizar" class="bg-white hover:bg-slate-50 text-slate-700 border px-4 py-2 rounded-lg font-bold text-sm shadow-sm">Atualizar dados</button>
          <span id="gp-periodo-label" class="text-xs text-slate-500 ml-auto"></span>
        </div>

        <div id="ger-print-area-painel" class="space-y-5">
          <div id="gp-cards" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"></div>
          <div id="gp-alertas"></div>
          <div id="gp-conciliacao"></div>
          <div id="gp-fluxo"></div>
          <div id="gp-dre"></div>
          <div id="gp-contas"></div>
          <div id="gp-despesas"></div>
          <div id="gp-entradas"></div>
          <div id="gp-qualidade"></div>
        </div>
      </div>`;
  }

  function inicializar() {
    if (!CORE) {
      const box = document.getElementById('gp-cards');
      if (box) box.innerHTML = '<div class="col-span-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">Modulo de calculo do Painel Executivo nao carregado.</div>';
      return;
    }
    const aplicar = document.getElementById('gp-aplicar');
    if (aplicar) aplicar.onclick = carregar;
    const atualizar = document.getElementById('gp-atualizar');
    if (atualizar) atualizar.onclick = carregar;
    const mes = document.getElementById('gp-mes');
    if (mes) mes.onchange = function () {
      const p = CORE.periodoDoMes(this.value);
      if (p) {
        const ini = document.getElementById('gp-inicio');
        const fim = document.getElementById('gp-fim');
        if (ini) ini.value = p.inicio;
        if (fim) fim.value = p.fim;
      }
      carregar();
    };
    carregar();
  }

  function lerFiltro() {
    let inicio = (document.getElementById('gp-inicio') || {}).value || '';
    let fim = (document.getElementById('gp-fim') || {}).value || '';
    const mes = (document.getElementById('gp-mes') || {}).value || '';
    if ((!inicio || !fim) && mes) {
      const p = CORE.periodoDoMes(mes);
      if (p) { inicio = p.inicio; fim = p.fim; }
    }
    if (!inicio || !fim) {
      const p = CORE.periodoDoMes(mesAtual());
      inicio = p.inicio;
      fim = p.fim;
    }
    if (inicio > fim) { const t = inicio; inicio = fim; fim = t; }
    return {
      inicio: inicio,
      fim: fim,
      comparar: (document.getElementById('gp-comparar') || {}).value || 'mes-anterior',
      hoje: hojeLocal()
    };
  }

  function carregar() {
    if (!CORE) return;
    const filtro = lerFiltro();
    const deps = (window.GerencialCmv && typeof window.GerencialCmv.calcularCustoPorProduto === 'function')
      ? { calcularCustoPorProduto: window.GerencialCmv.calcularCustoPorProduto }
      : {};
    try {
      const state = (typeof STATE !== 'undefined' && STATE) ? STATE : (window.STATE || {});
      ultimo = CORE.calcularPainel(state, Object.assign({}, filtro, { deps: deps }));
    } catch (err) {
      console.error('Falha ao calcular o Painel Executivo:', err);
      const box = document.getElementById('gp-cards');
      if (box) box.innerHTML = `<div class="col-span-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">Nao foi possivel calcular o painel: ${esc(err.message)}</div>`;
      return;
    }
    render();
  }

  function render() {
    if (!ultimo) return;
    renderPeriodo();
    renderCards();
    renderAlertas();
    renderConciliacao();
    renderFluxo();
    renderDre();
    renderContas();
    renderDespesas();
    renderEntradas();
    renderQualidade();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }

  function renderPeriodo() {
    const el = document.getElementById('gp-periodo-label');
    if (!el) return;
    const p = ultimo.periodo;
    let txt = `${fmtData(p.inicio)} a ${fmtData(p.fim)}`;
    if (ultimo.comparacao) txt += ` · compara com ${fmtData(ultimo.comparacao.inicio)} a ${fmtData(ultimo.comparacao.fim)}`;
    el.textContent = txt;
  }

  function variacao(nome) {
    if (!ultimo.variacoes) return null;
    return ultimo.variacoes.find((v) => v.nome === nome) || null;
  }

  function badgeVar(nome) {
    const v = variacao(nome);
    if (!v) return '<span class="text-[10px] text-slate-400">sem comparativo</span>';
    const bom = v.inverso ? v.delta <= 0 : v.delta >= 0;
    const cor = Math.abs(v.delta) < 0.005 ? 'text-slate-400 bg-slate-100' : (bom ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50');
    const seta = v.delta > 0 ? '↑' : (v.delta < 0 ? '↓' : '→');
    return `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${cor}">${seta} ${v.pct == null ? money(Math.abs(v.delta)) : pct(Math.abs(v.pct))}</span>`;
  }

  function card(titulo, valor, detalhe, cor, nomeVar) {
    return `
      <div class="bg-white rounded-xl border shadow-sm p-4">
        <div class="flex items-start justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500">${esc(titulo)}</span>
          ${nomeVar ? badgeVar(nomeVar) : ''}
        </div>
        <div class="text-xl font-black mt-2 ${cor || 'text-slate-800'}">${money(valor)}</div>
        <div class="text-[11px] text-slate-500 mt-1">${detalhe || ''}</div>
      </div>`;
  }

  function renderCards() {
    const el = document.getElementById('gp-cards');
    if (!el) return;
    const c = ultimo.atual.caixa;
    const ch = ultimo.caixaHoje;
    const a = ultimo.atual;
    const resultadoCaixa = c.saldoFinalFinanceiro - c.saldoInicialFinanceiro;
    el.innerHTML = [
      card('Caixa hoje (Financeiro)', ch.financeiro, `Apurado com avulsos: ${money(ch.apurado)} · realizado: ${money(ch.realizado)}`, ch.financeiro < 0 ? 'text-red-700' : 'text-emerald-700'),
      card('Entradas do periodo', c.entradasRealizadas, `Legado separado: ${money(c.entradasLegado)} · avulsos: ${money(c.entradasAvulsas)}`, 'text-emerald-700', 'Entradas de caixa'),
      card('Saidas do periodo', c.saidasRealizadas, `Legado separado: ${money(c.saidasLegado)} · avulsos: ${money(c.saidasAvulsas)}`, 'text-red-700', 'Saidas de caixa'),
      card('Resultado de caixa', resultadoCaixa, 'Variacao do caixa base Financeiro', resultadoCaixa < 0 ? 'text-red-700' : 'text-slate-800', 'Resultado de caixa'),
      card('Faturamento', a.receita, `Titulos no periodo · ${a.flags.itensSemCusto} item(ns) sem custo`, 'text-slate-800', 'Faturamento'),
      card('CMV', a.cmv, `Margem bruta ${pct(a.margemBruta)}`, 'text-slate-800'),
      card('Lucro bruto', a.lucroBruto, `Receita menos CMV`, a.lucroBruto < 0 ? 'text-red-700' : 'text-emerald-700', 'Lucro bruto'),
      card('Resultado liquido', a.resultadoLiquido, `Margem liquida ${pct(a.margemLiquida)}`, a.resultadoLiquido < 0 ? 'text-red-700' : 'text-emerald-700', 'Resultado liquido')
    ].join('');
  }

  function renderAlertas() {
    const el = document.getElementById('gp-alertas');
    if (!el) return;
    const alertas = ultimo.alertas || [];
    if (!alertas.length) {
      el.innerHTML = '<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-semibold">Nenhum alerta critico no periodo.</div>';
      return;
    }
    const cor = { danger: 'border-red-200 bg-red-50 text-red-800', warn: 'border-amber-200 bg-amber-50 text-amber-800', info: 'border-slate-200 bg-slate-50 text-slate-700' };
    el.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">${alertas.map((a) => `
      <div class="border rounded-xl px-4 py-3 ${cor[a.nivel] || cor.info}">
        <div class="text-xs font-bold">${esc(a.titulo)}</div>
        <div class="text-[11px] mt-0.5">${esc(a.detalhe)}</div>
      </div>`).join('')}</div>`;
  }

  function linha(label, valor, classe, detalhe) {
    return `<tr class="${classe || ''}">
      <td class="p-2.5">${label}${detalhe ? `<div class="text-[10px] text-slate-400">${detalhe}</div>` : ''}</td>
      <td class="p-2.5 text-right font-semibold">${money(valor)}</td>
    </tr>`;
  }

  function renderConciliacao() {
    const el = document.getElementById('gp-conciliacao');
    if (!el) return;
    const c = ultimo.atual.caixa;
    const ch = ultimo.caixaHoje;
    const legado = c.entradasLegado - c.saidasLegado;
    const avulsos = c.saidasAvulsas - c.entradasAvulsas;
    el.innerHTML = `
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-slate-50">
          <h3 class="font-bold text-slate-700 text-sm">Conciliacao do caixa</h3>
          <p class="text-[11px] text-slate-500">O caixa realizado usa apenas baixas/pagamentos vinculados. Legado e lancamentos avulsos ficam em linhas separadas.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <tbody class="divide-y">
              ${linha('Entradas vinculadas no periodo', c.entradasRealizadas, '', `${c.entradasPorForma.length} forma(s) de recebimento`)}
              ${linha('Saidas vinculadas no periodo', -c.saidasRealizadas, '', `${c.saidasPorGrupo.length} grupo(s) de despesa`)}
              ${linha('<b>= Caixa realizado</b>', c.saldoFinalRealizado - c.saldoInicialRealizado, 'bg-slate-50', 'Entradas menos saidas vinculadas')}
              ${linha('Ajustes legados de entradas', c.entradasLegado, '', `${c.entradasLegadoQtd} titulo(s) PAGO sem baixa`)}
              ${linha('Ajustes legados de saidas', -c.saidasLegado, '', `${c.saidasLegadoQtd} despesa(s) PAGO sem baixa`)}
              ${linha('<b>= Caixa base Financeiro</b>', c.saldoFinalFinanceiro - c.saldoInicialFinanceiro, 'bg-emerald-50 text-emerald-800', 'Mesma base dos cards do Financeiro')}
              ${linha('Entradas avulsas (sem vinculo)', c.entradasAvulsas, '', 'Recebimentos sem referencia de titulo')}
              ${linha('Saidas avulsas (sem vinculo)', -c.saidasAvulsas, '', 'Pagamentos sem referencia de despesa')}
              ${linha('<b>= Caixa apurado</b>', c.saldoFinalApurado - c.saldoInicialApurado, 'bg-slate-800 text-white', 'Inclui legado e avulsos')}
            </tbody>
          </table>
        </div>
        <div class="px-4 py-3 border-t grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div><div class="text-slate-400 font-bold uppercase text-[9px]">Caixa hoje realizado</div><div class="font-black">${money(ch.realizado)}</div></div>
          <div><div class="text-slate-400 font-bold uppercase text-[9px]">Caixa hoje Financeiro</div><div class="font-black">${money(ch.financeiro)}</div></div>
          <div><div class="text-slate-400 font-bold uppercase text-[9px]">Caixa hoje apurado</div><div class="font-black">${money(ch.apurado)}</div></div>
          <div><div class="text-slate-400 font-bold uppercase text-[9px]">Ajuste legado</div><div class="font-black">${money(legado)}</div></div>
          <div><div class="text-slate-400 font-bold uppercase text-[9px]">Avulsos</div><div class="font-black">${money(-avulsos)}</div></div>
        </div>
      </div>`;
  }

  function svgFluxo(diario) {
    if (!diario || diario.length < 2) return '<div class="p-6 text-center text-slate-400 text-sm">Sem dados diarios no periodo.</div>';
    const W = 820, H = 220, PL = 62, PR = 16, PT = 16, PB = 28;
    const saldos = diario.map((d) => d.saldo);
    let min = Math.min(0, ...saldos);
    let max = Math.max(0, ...saldos);
    if (Math.abs(max - min) < 1) { max += 1; min -= 1; }
    const pad = (max - min) * 0.08;
    min -= pad; max += pad;
    const x = (i) => PL + (i / (diario.length - 1)) * (W - PL - PR);
    const y = (v) => PT + ((max - v) / (max - min)) * (H - PT - PB);
    const linha = diario.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.saldo).toFixed(1)}`).join(' ');
    const area = `${linha} L${x(diario.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
    const zero = y(0);
    const ticks = [max, (max + min) / 2, min];
    return `
      <svg viewBox="0 0 ${W} ${H}" class="w-full h-56" role="img" aria-label="Fluxo de caixa diario">
        <defs><linearGradient id="gp-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.28"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.02"/>
        </linearGradient></defs>
        <line x1="${PL}" x2="${W - PR}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}" stroke="#cbd5e1" stroke-dasharray="4 4"/>
        ${ticks.map((t) => `<line x1="${PL}" x2="${W - PR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="#f1f5f9"/><text x="${PL - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${num(t)}</text>`).join('')}
        <path d="${area}" fill="url(#gp-grad)"/>
        <path d="${linha}" fill="none" stroke="#059669" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${x(diario.length - 1).toFixed(1)}" cy="${y(diario[diario.length - 1].saldo).toFixed(1)}" r="3.2" fill="#059669"/>
        <text x="${PL}" y="${H - 7}" font-size="9" fill="#94a3b8">${fmtData(diario[0].data)}</text>
        <text x="${W - PR}" y="${H - 7}" font-size="9" fill="#94a3b8" text-anchor="end">${fmtData(diario[diario.length - 1].data)}</text>
      </svg>`;
  }

  function renderFluxo() {
    const el = document.getElementById('gp-fluxo');
    if (!el) return;
    const c = ultimo.atual.caixa;
    const formas = c.entradasPorForma || [];
    const grupos = c.saidasPorGrupo || [];
    el.innerHTML = `
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-slate-50 flex flex-wrap justify-between gap-2">
          <div>
            <h3 class="font-bold text-slate-700 text-sm">Fluxo de caixa diario</h3>
            <p class="text-[11px] text-slate-500">Saldo documentado (vinculado + avulsos). Legado nao entra na linha diaria.</p>
          </div>
          <div class="flex gap-2 text-[11px]">
            <span class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold">Entradas ${money(c.entradasDocumentadas)}</span>
            <span class="px-2 py-1 rounded bg-red-50 text-red-700 font-bold">Saidas ${money(c.saidasDocumentadas)}</span>
          </div>
        </div>
        <div class="p-2">${svgFluxo(c.diario)}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-0 border-t">
          <div class="p-3 border-b md:border-b-0 md:border-r">
            <div class="text-[10px] font-bold uppercase text-slate-400 mb-2">Entradas por forma</div>
            <table class="w-full text-xs"><tbody>
              ${formas.length ? formas.map((f) => `<tr><td class="py-1">${esc(f.forma)} <span class="text-slate-400">(${f.qtd})</span></td><td class="py-1 text-right font-semibold">${money(f.valor)}</td></tr>`).join('') : '<tr><td class="py-2 text-slate-400">Sem entradas.</td></tr>'}
            </tbody></table>
          </div>
          <div class="p-3">
            <div class="text-[10px] font-bold uppercase text-slate-400 mb-2">Saidas por grupo da DRE</div>
            <table class="w-full text-xs"><tbody>
              ${grupos.length ? grupos.map((g) => `<tr><td class="py-1">${esc(g.grupo)} <span class="text-slate-400">(${g.qtd})</span></td><td class="py-1 text-right font-semibold">${money(g.valor)}</td></tr>`).join('') : '<tr><td class="py-2 text-slate-400">Sem saidas.</td></tr>'}
            </tbody></table>
          </div>
        </div>
      </div>`;
  }

  function renderDre() {
    const el = document.getElementById('gp-dre');
    if (!el) return;
    const a = ultimo.atual;
    const ant = ultimo.anterior;
    const linhaDre = (label, valor, classe, destaque) => {
      let comp = '';
      if (ant) {
        const chave = label;
        const mapa = {
          'Receita bruta': [a.receita, ant.receita],
          '(-) CMV': [-a.cmv, -ant.cmv],
          '= Lucro bruto': [a.lucroBruto, ant.lucroBruto],
          '(-) Despesas operacionais': [-a.despesasOperacionais, -ant.despesasOperacionais],
          '= Resultado operacional': [a.resultadoOperacional, ant.resultadoOperacional],
          '(-) Tributos': [-a.tributos, -ant.tributos],
          '(-) Financeiras': [-a.financeiras, -ant.financeiras],
          '= Resultado liquido': [a.resultadoLiquido, ant.resultadoLiquido]
        };
        const par = mapa[chave];
        if (par) comp = `<td class="p-2.5 text-right text-slate-500">${money(par[1])}</td><td class="p-2.5 text-right font-semibold ${par[0] - par[1] >= 0 ? 'text-emerald-700' : 'text-red-700'}">${money(par[0] - par[1])}</td>`;
      } else comp = '<td class="p-2.5"></td><td class="p-2.5"></td>';
      return `<tr class="${classe || ''}">
        <td class="p-2.5 ${destaque ? 'font-black' : ''}">${label}</td>
        <td class="p-2.5 text-right ${destaque ? 'font-black' : 'font-semibold'}">${money(valor)}</td>
        ${comp}
      </tr>`;
    };
    const grupos = a.despesasPorGrupo.filter((g) => g.qtd > 0);
    el.innerHTML = `
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-slate-50 flex flex-wrap justify-between gap-2">
          <div>
            <h3 class="font-bold text-slate-700 text-sm">DRE por competencia</h3>
            <p class="text-[11px] text-slate-500">Despesas pela data da despesa; CMV pela data da venda. CUSTO de estoque fica fora da DRE para nao duplicar o CMV.</p>
          </div>
          <div class="text-[11px] text-slate-500">Margens: bruta ${pct(a.margemBruta)} · operacional ${pct(a.margemOperacional)} · liquida ${pct(a.margemLiquida)}</div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-100 text-slate-600"><tr>
              <th class="p-2 text-left">Linha</th><th class="p-2 text-right">Periodo</th><th class="p-2 text-right">Anterior</th><th class="p-2 text-right">Variacao</th>
            </tr></thead>
            <tbody class="divide-y">
              ${linhaDre('Receita bruta', a.receita)}
              ${linhaDre('(-) CMV', -a.cmv)}
              ${linhaDre('= Lucro bruto', a.lucroBruto, 'bg-slate-50', true)}
              ${linhaDre('(-) Despesas operacionais', -a.despesasOperacionais)}
              ${linhaDre('= Resultado operacional', a.resultadoOperacional, 'bg-slate-50', true)}
              ${linhaDre('(-) Tributos', -a.tributos)}
              ${linhaDre('(-) Financeiras', -a.financeiras)}
              ${linhaDre('= Resultado liquido', a.resultadoLiquido, 'bg-slate-800 text-white', true)}
            </tbody>
          </table>
        </div>
        <div class="px-4 py-3 border-t flex flex-wrap gap-3 text-[11px]">
          ${grupos.map((g) => `<span class="px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold">${esc(g.grupo)}: ${money(g.total)} (${g.qtd})</span>`).join('')}
          ${a.custoForaDre > 0 ? `<span class="px-2 py-1 rounded bg-amber-50 text-amber-700 font-semibold">Compras/estoque (CUSTO) fora da DRE: ${money(a.custoForaDre)}</span>` : ''}
        </div>
      </div>`;
  }

  function bucketRows(b) {
    const itens = [
      ['Vencido', b.vencido], ['Ate 7 dias', b.d7], ['8 a 30 dias', b.d30], ['31 a 60 dias', b.d60], ['61 a 90 dias', b.d90], ['Acima de 90', b.acima], ['Sem vencimento', b.semVencimento]
    ];
    return itens.map(([label, x]) => `<tr><td class="py-1">${label}</td><td class="py-1 text-center text-slate-500">${x.qtd}</td><td class="py-1 text-right font-semibold">${money(x.valor)}</td></tr>`).join('');
  }

  function renderContas() {
    const el = document.getElementById('gp-contas');
    if (!el) return;
    const c = ultimo.contas;
    const p = ultimo.projecao;
    el.innerHTML = `
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b bg-emerald-50 text-emerald-800 flex justify-between items-center">
            <span class="font-bold text-sm">Contas a receber</span><span class="text-xs font-black">${money(c.receber.total)}</span>
          </div>
          <table class="w-full text-xs"><tbody class="divide-y">${bucketRows(c.receber.buckets)}</tbody></table>
          <div class="px-4 py-2 border-t text-[11px] text-slate-500">${c.receber.qtd} titulo(s) · vencido ${money(c.receber.vencido)} · credito em haver ${money(c.creditoHaver)}</div>
        </div>
        <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b bg-red-50 text-red-800 flex justify-between items-center">
            <span class="font-bold text-sm">Contas a pagar</span><span class="text-xs font-black">${money(c.pagar.total)}</span>
          </div>
          <table class="w-full text-xs"><tbody class="divide-y">${bucketRows(c.pagar.buckets)}</tbody></table>
          <div class="px-4 py-2 border-t text-[11px] text-slate-500">${c.pagar.qtd} despesa(s) · vencido ${money(c.pagar.vencido)}</div>
        </div>
        <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
            <span class="font-bold text-sm text-slate-700">Projecao de caixa</span><span class="text-[11px] text-slate-500">base ${money(p.base)}</span>
          </div>
          <table class="w-full text-xs">
            <thead class="text-slate-500"><tr><th class="p-2 text-left">Horizonte</th><th class="p-2 text-right">Entradas</th><th class="p-2 text-right">Saidas</th><th class="p-2 text-right">Saldo</th></tr></thead>
            <tbody class="divide-y">
              ${p.linhas.map((l) => `<tr><td class="p-2 font-semibold">${l.dias} dias</td><td class="p-2 text-right text-emerald-700">${money(l.entradas)}</td><td class="p-2 text-right text-red-700">${money(l.saidas)}</td><td class="p-2 text-right font-black ${l.saldo < 0 ? 'text-red-700' : 'text-slate-800'}">${money(l.saldo)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="px-4 py-2 border-t text-[11px] text-slate-500">Vencidos: receber ${money(p.vencidoReceber)} · pagar ${money(p.vencidoPagar)}</div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div class="bg-white border rounded-xl shadow-sm p-4">
          <div class="text-[10px] font-bold uppercase text-slate-400 mb-2">Maiores clientes em aberto</div>
          <table class="w-full text-xs"><tbody>${c.receber.top.slice(0, 8).map((x) => `<tr><td class="py-1">${esc(x.nome)} <span class="text-slate-400">(${x.qtd})</span></td><td class="py-1 text-right font-semibold">${money(x.valor)}</td></tr>`).join('') || '<tr><td class="py-2 text-slate-400">Nada em aberto.</td></tr>'}</tbody></table>
        </div>
        <div class="bg-white border rounded-xl shadow-sm p-4">
          <div class="text-[10px] font-bold uppercase text-slate-400 mb-2">Maiores fornecedores em aberto</div>
          <table class="w-full text-xs"><tbody>${c.pagar.top.slice(0, 8).map((x) => `<tr><td class="py-1">${esc(x.nome)} <span class="text-slate-400">(${x.qtd})</span></td><td class="py-1 text-right font-semibold">${money(x.valor)}</td></tr>`).join('') || '<tr><td class="py-2 text-slate-400">Nada em aberto.</td></tr>'}</tbody></table>
        </div>
      </div>`;
  }

  function renderDespesas() {
    const el = document.getElementById('gp-despesas');
    if (!el) return;
    const d = ultimo.atual.despesas;
    el.innerHTML = `
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div class="xl:col-span-2 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
            <h3 class="font-bold text-slate-700 text-sm">Despesas por categoria</h3>
            <span class="text-xs text-slate-500">${d.qtd} despesa(s) · ${money(d.total)}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-100 text-slate-600"><tr><th class="p-2 text-left">Categoria</th><th class="p-2">Grupo</th><th class="p-2 text-right">Total</th><th class="p-2 text-right">Pago</th><th class="p-2 text-right">Aberto</th><th class="p-2 text-right">% desp.</th><th class="p-2 text-right">% receita</th></tr></thead>
              <tbody class="divide-y">${d.porCategoria.length ? d.porCategoria.map((x) => `<tr><td class="p-2">${esc(x.categoria)} <span class="text-slate-400">(${x.qtd})</span></td><td class="p-2 text-center"><span class="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">${esc(x.grupo)}</span></td><td class="p-2 text-right font-semibold">${money(x.total)}</td><td class="p-2 text-right">${money(x.pago)}</td><td class="p-2 text-right ${x.aberto > 0 ? 'text-red-700 font-semibold' : ''}">${money(x.aberto)}</td><td class="p-2 text-right">${pct(x.pctDespesas)}</td><td class="p-2 text-right">${pct(x.pctReceita)}</td></tr>`).join('') : '<tr><td colspan="7" class="p-4 text-center text-slate-400">Sem despesas no periodo.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="bg-white border rounded-xl shadow-sm p-4">
          <div class="text-[10px] font-bold uppercase text-slate-400 mb-2">Top fornecedores (competencia)</div>
          <table class="w-full text-xs"><tbody>${d.topFornecedores.slice(0, 10).map((x) => `<tr><td class="py-1">${esc(x.nome)} <span class="text-slate-400">(${x.qtd})</span></td><td class="py-1 text-right font-semibold">${money(x.valor)}</td></tr>`).join('') || '<tr><td class="py-2 text-slate-400">Sem despesas.</td></tr>'}</tbody></table>
        </div>
      </div>`;
  }

  function renderEntradas() {
    const el = document.getElementById('gp-entradas');
    if (!el) return;
    const e = ultimo.atual.entradas;
    el.innerHTML = `
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div class="bg-white border rounded-xl shadow-sm p-4">
          <div class="text-[10px] font-bold uppercase text-slate-400 mb-2">Top clientes</div>
          <table class="w-full text-xs"><tbody>${e.topClientes.slice(0, 10).map((x) => `<tr><td class="py-1">${esc(x.nome)} <span class="text-slate-400">(${x.titulos})</span></td><td class="py-1 text-right font-semibold">${money(x.valor)}</td></tr>`).join('') || '<tr><td class="py-2 text-slate-400">Sem faturamento.</td></tr>'}</tbody></table>
        </div>
        <div class="xl:col-span-2 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
            <h3 class="font-bold text-slate-700 text-sm">Produtos vendidos</h3>
            <span class="text-xs text-slate-500">${e.parceiros.length} item(ns) de parceiro</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-100 text-slate-600"><tr><th class="p-2 text-left">Produto</th><th class="p-2 text-center">Qtd</th><th class="p-2 text-right">Receita</th><th class="p-2 text-right">CMV</th><th class="p-2 text-right">Lucro</th><th class="p-2 text-right">Margem</th></tr></thead>
              <tbody class="divide-y">${e.topProdutos.slice(0, 12).map((p) => {
                const margem = p.receita > 0 ? (p.lucro / p.receita) * 100 : null;
                return `<tr><td class="p-2">${esc(p.nome)} ${p.parceiro ? '<span class="text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded font-bold">PARCEIRO</span>' : ''} ${p.semCusto ? '<span class="text-[9px] bg-amber-50 text-amber-700 px-1 rounded font-bold">SEM CUSTO</span>' : ''}</td><td class="p-2 text-center">${num(p.qtd)}</td><td class="p-2 text-right font-semibold">${money(p.receita)}</td><td class="p-2 text-right">${money(p.custo)}</td><td class="p-2 text-right ${p.lucro < 0 ? 'text-red-700' : ''}">${money(p.lucro)}</td><td class="p-2 text-right">${pct(margem)}</td></tr>`;
              }).join('') || '<tr><td colspan="6" class="p-4 text-center text-slate-400">Sem vendas no periodo.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  function chip(label, valor, cor) {
    return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold ${cor || 'bg-slate-50 text-slate-700 border-slate-200'}">${esc(label)}: <b>${esc(valor)}</b></span>`;
  }

  function renderQualidade() {
    const el = document.getElementById('gp-qualidade');
    if (!el) return;
    const q = ultimo.qualidade;
    el.innerHTML = `
      <div class="bg-white border rounded-xl shadow-sm p-4">
        <h3 class="font-bold text-slate-700 text-sm mb-2">Qualidade dos dados</h3>
        <div class="flex flex-wrap gap-2">
          ${chip('Titulos PAGO com baixa parcial/ausente', q.titulosLegado, 'bg-amber-50 text-amber-800 border-amber-200')}
          ${chip('Despesas PAGO com ajuste legado', q.despesasLegado, 'bg-amber-50 text-amber-800 border-amber-200')}
          ${chip('Despesas PAGO com valor_pago zerado', q.despesasSemValorPago)}
          ${chip('Despesas com ID duplicado', q.despesasIdDuplicado, q.despesasIdDuplicado > 0 ? 'bg-red-50 text-red-700 border-red-200' : '')}
          ${chip('Baixas duplicadas ignoradas', money(q.pagamentosExcedentes), q.pagamentosExcedentes > 0 ? 'bg-red-50 text-red-700 border-red-200' : '')}
          ${chip('Pagamentos sem despesa', money(q.pagamentosOrfaos), q.pagamentosOrfaos > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : '')}
          ${chip('Despesas sem categoria', q.semCategoria)}
          ${chip('Datas invalidas', q.datasInvalidas)}
          ${chip('Recebiveis sem vencimento', q.recebiveisSemVencimento)}
          ${chip('Vendas sem custo', q.itensSemCusto)}
          ${chip('Itens sem historico de custo', q.itensSemHistorico)}
          ${chip('Dias com caixa negativo', q.diasNegativos)}
          ${chip('Credito em haver de clientes', money(q.creditoHaver))}
        </div>
        <p class="text-[10px] text-slate-400 mt-2">Ajustes legados sao estimativas de titulos/despesas ja marcados como PAGO sem baixa registrada. Eles ficam separados do caixa realizado.</p>
      </div>`;
  }

  window.GerencialPainel = {
    getHTML: getHTML,
    inicializar: inicializar,
    carregar: carregar,
    imprimir: function () { window.imprimirAba('painel-executivo'); }
  };
})();
