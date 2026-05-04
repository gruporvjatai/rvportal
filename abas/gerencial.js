// gerencial.js – Centro de Custos e Resultado Simplificado (v2)
(function () {
  'use strict';

  let subAbaAtiva = 'centro-custos'; // 'centro-custos' | 'resultado-simplificado'

  // Aguarda carregamento do sistema
  window.addEventListener('load', function () {
    const originalNavigate = window.navigate;
    window.navigate = function (viewId) {
      originalNavigate(viewId);
      if (viewId === 'gerencial') renderGerencial();
    };
  });

  // ============ RENDERIZAÇÃO PRINCIPAL ============
  function renderGerencial() {
    const container = document.getElementById('view-gerencial');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-4 p-4">
        <!-- Sub-abas -->
        <div class="flex bg-white rounded-xl shadow-sm border p-1 gap-1 w-fit">
          <button id="ger-tab-custos" onclick="alternarSubAba('centro-custos')" 
            class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all
            ${subAbaAtiva === 'centro-custos' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'}">
            <i data-lucide="calculator" class="inline w-4 h-4 mr-1"></i> Centro de Custos
          </button>
          <button id="ger-tab-resultado" onclick="alternarSubAba('resultado-simplificado')" 
            class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all
            ${subAbaAtiva === 'resultado-simplificado' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'}">
            <i data-lucide="trending-up" class="inline w-4 h-4 mr-1"></i> Resultado Simplificado
          </button>
        </div>

        <!-- Container das sub-abas -->
        <div id="ger-aba-centro-custos" class="${subAbaAtiva === 'centro-custos' ? '' : 'hidden'}">
          ${getCentroCustosHTML()}
        </div>
        <div id="ger-aba-resultado-simplificado" class="${subAbaAtiva === 'resultado-simplificado' ? '' : 'hidden'}">
          ${getResultadoSimplificadoHTML()}
        </div>
      </div>
    `;

    // Inicialização dos componentes da sub-aba ativa
    if (subAbaAtiva === 'centro-custos') carregarCentroCustos();
    else carregarResultadoSimplificado();

    lucide.createIcons();
    window.alternarSubAba = alternarSubAba; // expõe global
  }

  // ============ ALTERNAR SUB-ABA ============
  function alternarSubAba(novaAba) {
    subAbaAtiva = novaAba;
    renderGerencial();
  }

  // ---------- HTML das sub-abas ----------
  function getCentroCustosHTML() {
    return `
      <div class="space-y-6">
        <!-- Configurações -->
        <div class="bg-white p-4 rounded-xl shadow-sm border space-y-4">
          <div class="flex flex-wrap gap-6 items-end">
            <div>
              <label class="block text-xs font-bold text-slate-500">Imposto (% sobre receita)</label>
              <input type="number" id="ger-imposto" value="0" step="0.01" min="0" max="100"
                class="w-28 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500">Frete (% sobre receita)</label>
              <input type="number" id="ger-frete-percent" value="0" step="0.01" min="0" max="100"
                class="w-28 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-bold text-slate-500">Despesas Operacionais (rateio)</span>
              <div id="ger-categorias-op" class="flex flex-wrap gap-2 items-center">
                <!-- checkboxes serão populados dinamicamente -->
              </div>
            </div>
            <button onclick="carregarCentroCustos()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow self-end">
              <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-1"></i> Atualizar
            </button>
          </div>
        </div>

        <!-- Resumo -->
        <div class="bg-white p-4 rounded-xl shadow-sm border">
          <h3 class="font-bold text-slate-700 mb-2"><i data-lucide="dollar-sign" class="w-4 inline"></i> Resumo do Período</h3>
          <div id="ger-resumo-centro" class="space-y-1 text-sm"></div>
        </div>

        <!-- Tabela de produtos -->
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-800 text-white">
                <tr>
                  <th class="p-3">Produto</th>
                  <th class="p-3 text-center">Qtd</th>
                  <th class="p-3 text-right">Receita Bruta</th>
                  <th class="p-3 text-right">Custo Compra</th>
                  <th class="p-3 text-right">Impostos</th>
                  <th class="p-3 text-right">Frete</th>
                  <th class="p-3 text-right">Desp. Operac.</th>
                  <th class="p-3 text-right">Lucro Líquido</th>
                  <th class="p-3 text-right">Margem</th>
                </tr>
              </thead>
              <tbody id="ger-tabela-produtos" class="divide-y"></tbody>
              <tfoot id="ger-total-rodape" class="bg-slate-50 font-bold"></tfoot>
            </table>
          </div>
          <div id="ger-sem-dados" class="hidden p-8 text-center text-slate-400 font-medium">
            Nenhum produto vendido no período selecionado.
          </div>
        </div>
      </div>
    `;
  }

  function getResultadoSimplificadoHTML() {
    return `
      <div class="space-y-6">
        <!-- Filtro de período (simples) -->
        <div class="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <span class="text-sm font-bold text-slate-600">Período:</span>
          <input type="month" id="ger-res-mes" class="p-2 border rounded-lg text-sm" />
          <button onclick="carregarResultadoSimplificado()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow">
            <i data-lucide="play" class="w-4 h-4 inline mr-1"></i> Carregar
          </button>
        </div>

        <!-- Resumo entradas/saídas -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
            <p class="text-xs font-bold text-green-800 uppercase">Total de Entradas (Vendas)</p>
            <h3 id="ger-res-entradas" class="text-2xl font-bold text-green-700 mt-1">R$ 0,00</h3>
          </div>
          <div class="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
            <p class="text-xs font-bold text-red-800 uppercase">Total de Saídas (Despesas)</p>
            <h3 id="ger-res-saidas" class="text-2xl font-bold text-red-600 mt-1">R$ 0,00</h3>
          </div>
          <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
            <p class="text-xs font-bold text-indigo-800 uppercase">Lucro (Entradas - Saídas)</p>
            <h3 id="ger-res-lucro" class="text-2xl font-bold text-indigo-600 mt-1">R$ 0,00</h3>
          </div>
        </div>

        <!-- Produtos vendidos (sem custo) -->
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div class="p-4 font-bold text-slate-700 border-b bg-slate-50">
            <i data-lucide="package" class="w-4 inline mr-1"></i> Produtos Vendidos no Período
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-100 text-slate-700">
                <tr>
                  <th class="p-3">Produto</th>
                  <th class="p-3 text-center">Quantidade</th>
                  <th class="p-3 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody id="ger-res-produtos-lista" class="divide-y"></tbody>
              <tfoot id="ger-res-produtos-total" class="bg-slate-50 font-bold"></tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ============ FUNÇÕES DE CARREGAMENTO ============
  // --- Centro de Custos ---
  async function carregarCentroCustos() {
    // Período (usamos mês atual como padrão se não houver customizado)
    const hoje = new Date();
    const mesInput = document.getElementById('ger-mes');
    const inicioCustom = document.getElementById('ger-data-inicio');
    const fimCustom = document.getElementById('ger-data-fim');

    let dataInicio, dataFim;
    if (inicioCustom?.value && fimCustom?.value) {
      dataInicio = inicioCustom.value;
      dataFim = fimCustom.value;
    } else if (mesInput?.value) {
      const [ano, mes] = mesInput.value.split('-');
      dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    } else {
      // fallback: mês atual
      const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
      document.getElementById('ger-mes').value = `${hoje.getFullYear()}-${mesAtual}`;
      dataInicio = `${hoje.getFullYear()}-${mesAtual}-01`;
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      dataFim = `${hoje.getFullYear()}-${mesAtual}-${String(ultimoDia).padStart(2, '0')}`;
    }

    const impostoPerc = parseFloat(document.getElementById('ger-imposto')?.value) || 0;
    const fretePerc = parseFloat(document.getElementById('ger-frete-percent')?.value) || 0;

    // Obter categorias de despesas selecionadas
    const checkboxes = document.querySelectorAll('#ger-categorias-op input[type="checkbox"]:checked');
    const categoriasSelecionadas = Array.from(checkboxes).map(cb => cb.value);

    // Filtrar vendas
    const vendasPeriodo = STATE.logs.filter(l =>
      l.type === 'venda' && l.status !== 'CANCELADO' &&
      l.date >= dataInicio && l.date <= dataFim + 'T23:59:59'
    );

    // Resumo e tabela
    atualizarCentroCustos(vendasPeriodo, impostoPerc, fretePerc, categoriasSelecionadas, dataInicio, dataFim);

    // Popular checkboxes de categorias de despesas do período
    const despesasPeriodo = STATE.expenses.filter(d => d.date >= dataInicio && d.date <= dataFim);
    const catsUnicas = [...new Set(despesasPeriodo.map(d => d.item))].sort();
    const container = document.getElementById('ger-categorias-op');
    if (container) {
      container.innerHTML = catsUnicas.map(cat => `
        <label class="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 cursor-pointer select-none">
          <input type="checkbox" value="${cat}" class="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500" checked />
          ${cat}
        </label>
      `).join('');
    }

    lucide.createIcons();
  }

  function atualizarCentroCustos(vendas, impPerc, fretePerc, catsSelecionadas, inicio, fim) {
    const tbody = document.getElementById('ger-tabela-produtos');
    const rodape = document.getElementById('ger-total-rodape');
    const semDados = document.getElementById('ger-sem-dados');
    const resumo = document.getElementById('ger-resumo-centro');

    if (!vendas.length) {
      if (tbody) tbody.innerHTML = '';
      if (rodape) rodape.innerHTML = '';
      if (semDados) semDados.classList.remove('hidden');
      if (resumo) resumo.innerHTML = '<p class="text-slate-400">Sem vendas no período.</p>';
      return;
    }
    if (semDados) semDados.classList.add('hidden');

    // Agrupar por produto
    const mapa = {};
    vendas.forEach(v => {
      const nome = v.productName;
      if (!mapa[nome]) {
        const prod = STATE.products.find(p => p.name === nome);
        mapa[nome] = {
          nome,
          qtd: 0,
          receita: 0,
          custoUnit: prod ? prod.cost : 0
        };
      }
      mapa[nome].qtd += v.quantity;
      mapa[nome].receita += v.totalValue;
    });

    const produtos = Object.values(mapa).map(p => ({
      ...p,
      custoTotal: p.custoUnit * p.qtd
    }));

    const receitaTotal = produtos.reduce((s, p) => s + p.receita, 0);

    // Despesas operacionais selecionadas
    const despesasPeriodo = STATE.expenses.filter(d =>
      d.date >= inicio && d.date <= fim && catsSelecionadas.includes(d.item)
    );
    const totalDespOper = despesasPeriodo.reduce((s, d) => s + d.cost, 0);

    // Rateio
    produtos.forEach(p => {
      const proporcao = receitaTotal > 0 ? p.receita / receitaTotal : 0;
      p.imposto = p.receita * (impPerc / 100);
      p.frete = p.receita * (fretePerc / 100);
      p.despOper = totalDespOper * proporcao;
      p.lucroLiquido = p.receita - p.custoTotal - p.imposto - p.frete - p.despOper;
      p.margem = p.receita > 0 ? (p.lucroLiquido / p.receita) * 100 : 0;
    });

    // Totais
    const totalCusto = produtos.reduce((s, p) => s + p.custoTotal, 0);
    const totalImposto = receitaTotal * (impPerc / 100);
    const totalFrete = receitaTotal * (fretePerc / 100);
    const totalLucro = produtos.reduce((s, p) => s + p.lucroLiquido, 0);
    const totalMargem = receitaTotal > 0 ? (totalLucro / receitaTotal) * 100 : 0;

    // Render tabela
    if (tbody) {
      tbody.innerHTML = produtos.map(p => `
        <tr class="hover:bg-slate-50 border-b">
          <td class="p-3 font-bold text-slate-700">${p.nome}</td>
          <td class="p-3 text-center">${p.qtd}</td>
          <td class="p-3 text-right text-green-700">${formatMoney(p.receita)}</td>
          <td class="p-3 text-right text-slate-600">${formatMoney(p.custoTotal)}</td>
          <td class="p-3 text-right text-orange-600">${formatMoney(p.imposto)}</td>
          <td class="p-3 text-right text-blue-600">${formatMoney(p.frete)}</td>
          <td class="p-3 text-right text-purple-600">${formatMoney(p.despOper)}</td>
          <td class="p-3 text-right font-bold ${p.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(p.lucroLiquido)}</td>
          <td class="p-3 text-right font-medium ${p.margem >= 0 ? 'text-emerald-600' : 'text-red-500'}">${p.margem.toFixed(2)}%</td>
        </tr>
      `).join('');
    }

    if (rodape) {
      rodape.innerHTML = `
        <tr>
          <td class="p-3" colspan="2">TOTAIS</td>
          <td class="p-3 text-right text-green-700 text-base">${formatMoney(receitaTotal)}</td>
          <td class="p-3 text-right text-slate-600 text-base">${formatMoney(totalCusto)}</td>
          <td class="p-3 text-right text-orange-600 text-base">${formatMoney(totalImposto)}</td>
          <td class="p-3 text-right text-blue-600 text-base">${formatMoney(totalFrete)}</td>
          <td class="p-3 text-right text-purple-600 text-base">${formatMoney(totalDespOper)}</td>
          <td class="p-3 text-right font-bold text-base ${totalLucro >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(totalLucro)}</td>
          <td class="p-3 text-right font-bold text-base ${totalMargem >= 0 ? 'text-emerald-600' : 'text-red-500'}">${totalMargem.toFixed(2)}%</td>
        </tr>
      `;
    }

    // Resumo
    if (resumo) {
      resumo.innerHTML = `
        <div class="flex justify-between"><span>Receita Bruta:</span><span class="font-bold">${formatMoney(receitaTotal)}</span></div>
        <div class="flex justify-between"><span>Custo de Compra:</span><span>${formatMoney(totalCusto)}</span></div>
        <div class="flex justify-between"><span>Impostos:</span><span>${formatMoney(totalImposto)}</span></div>
        <div class="flex justify-between"><span>Frete:</span><span>${formatMoney(totalFrete)}</span></div>
        <div class="flex justify-between"><span>Desp. Operacionais:</span><span>${formatMoney(totalDespOper)}</span></div>
        <div class="flex justify-between border-t pt-1 mt-1 text-base"><span>Lucro Líquido:</span><span class="font-black ${totalLucro >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(totalLucro)}</span></div>
        <div class="flex justify-between text-xs"><span>Margem Líquida:</span><span class="font-bold">${totalMargem.toFixed(2)}%</span></div>
      `;
    }

    lucide.createIcons();
  }

  // --- Resultado Simplificado ---
  function carregarResultadoSimplificado() {
    const mesInput = document.getElementById('ger-res-mes');
    if (!mesInput) return;
    const hoje = new Date();
    if (!mesInput.value) {
      const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
      mesInput.value = `${hoje.getFullYear()}-${mesAtual}`;
    }
    const [ano, mes] = mesInput.value.split('-');
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    // Vendas
    const vendas = STATE.logs.filter(l =>
      l.type === 'venda' && l.status !== 'CANCELADO' &&
      l.date >= dataInicio && l.date <= dataFim + 'T23:59:59'
    );
    const receitaTotal = vendas.reduce((s, v) => s + v.totalValue, 0);

    // Despesas (todas do período, independentemente de pagas)
    const despesas = STATE.expenses.filter(d => d.date >= dataInicio && d.date <= dataFim);
    const despesaTotal = despesas.reduce((s, d) => s + d.cost, 0);

    const lucro = receitaTotal - despesaTotal;

    document.getElementById('ger-res-entradas').innerText = formatMoney(receitaTotal);
    document.getElementById('ger-res-saidas').innerText = formatMoney(despesaTotal);
    document.getElementById('ger-res-lucro').innerText = formatMoney(lucro);

    // Produtos vendidos (agrupados)
    const mapaProd = {};
    vendas.forEach(v => {
      if (!mapaProd[v.productName]) {
        mapaProd[v.productName] = { nome: v.productName, qtd: 0, valor: 0 };
      }
      mapaProd[v.productName].qtd += v.quantity;
      mapaProd[v.productName].valor += v.totalValue;
    });
    const produtos = Object.values(mapaProd);
    const tbody = document.getElementById('ger-res-produtos-lista');
    const tfoot = document.getElementById('ger-res-produtos-total');
    if (tbody) {
      tbody.innerHTML = produtos.map(p => `
        <tr class="border-b">
          <td class="p-3 font-medium">${p.nome}</td>
          <td class="p-3 text-center">${p.qtd}</td>
          <td class="p-3 text-right font-bold text-green-700">${formatMoney(p.valor)}</td>
        </tr>
      `).join('');
    }
    if (tfoot) {
      tfoot.innerHTML = `
        <tr>
          <td class="p-3 font-bold" colspan="2">TOTAL</td>
          <td class="p-3 text-right font-bold text-green-700 text-base">${formatMoney(receitaTotal)}</td>
        </tr>
      `;
    }

    lucide.createIcons();
  }

  // Expor funções globais
  window.carregarCentroCustos = carregarCentroCustos;
  window.carregarResultadoSimplificado = carregarResultadoSimplificado;
  window.alternarSubAba = alternarSubAba;
})();
