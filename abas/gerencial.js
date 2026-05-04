// gerencial.js – Centro de Custos e Resultado Simplificado (v4 – ajuste na aba 1)
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

    if (subAbaAtiva === 'centro-custos') {
      inicializarCentroCustos();
    } else {
      inicializarResultadoSimplificado();
    }
    lucide.createIcons();
    window.alternarSubAba = alternarSubAba;
  }

  function alternarSubAba(novaAba) {
    subAbaAtiva = novaAba;
    renderGerencial();
  }

  // ---------- HTML da Aba 1 (Centro de Custos) ----------
  function getCentroCustosHTML() {
    return `
      <div class="space-y-6">
        <!-- Filtro de período -->
        <div class="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
          <span class="text-xs font-bold text-slate-600">Período:</span>
          <input type="month" id="ger-mes" class="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
          <span class="text-xs text-slate-400">ou</span>
          <div class="flex items-center gap-2">
            <input type="date" id="ger-data-inicio" class="p-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Início" />
            <input type="date" id="ger-data-fim" class="p-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Fim" />
          </div>
          <button id="ger-aplicar-centro" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">Aplicar</button>
        </div>

        <!-- Configurações de cálculo -->
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
            <div>
              <label class="block text-xs font-bold text-slate-500">Salário Total (R$)</label>
              <input type="number" id="ger-salario" value="0" step="0.01" min="0"
                class="w-36 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500">Outros Custos Operac. (R$)</label>
              <input type="number" id="ger-outros-op" value="0" step="0.01" min="0"
                class="w-36 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
            </div>
          </div>
          <p class="text-xs text-slate-400 italic">* Os valores de Salário e Outros serão deduzidos apenas no resumo geral, sem rateio por produto.</p>
        </div>

        <!-- Resumo -->
        <div class="bg-white p-4 rounded-xl shadow-sm border">
          <h3 class="font-bold text-slate-700 mb-2"><i data-lucide="dollar-sign" class="w-4 inline"></i> Resumo do Período</h3>
          <div id="ger-resumo-centro" class="space-y-1 text-sm"></div>
        </div>

        <!-- Tabela de produtos (sem desp. operacional) -->
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
                  <th class="p-3 text-right">Lucro Bruto</th>
                  <th class="p-3 text-right">Margem Bruta</th>
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

  // ---------- HTML da Aba 2 (inalterada) ----------
  function getResultadoSimplificadoHTML() {
    return `
      <div class="space-y-6">
        <div class="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <span class="text-sm font-bold text-slate-600">Período:</span>
          <input type="month" id="ger-res-mes" class="p-2 border rounded-lg text-sm" />
          <button onclick="carregarResultadoSimplificado()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow">
            <i data-lucide="play" class="w-4 h-4 inline mr-1"></i> Carregar
          </button>
        </div>

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

  // ============ INICIALIZAÇÃO ============
  function inicializarCentroCustos() {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesInput = document.getElementById('ger-mes');
    if (mesInput) mesInput.value = mesAtual;

    // Botão aplicar
    const btnAplicar = document.getElementById('ger-aplicar-centro');
    if (btnAplicar) {
      btnAplicar.addEventListener('click', carregarCentroCustos);
    }

    carregarCentroCustos();
  }

  function inicializarResultadoSimplificado() {
    const mesInput = document.getElementById('ger-res-mes');
    if (mesInput) {
      const hoje = new Date();
      mesInput.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }
    carregarResultadoSimplificado();
  }

  // ============ CARREGAMENTO DOS DADOS (Aba 1) ============
  async function carregarCentroCustos() {
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
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      dataInicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();
      dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
    }

    const impostoPerc = parseFloat(document.getElementById('ger-imposto')?.value) || 0;
    const fretePerc = parseFloat(document.getElementById('ger-frete-percent')?.value) || 0;
    const salario = parseFloat(document.getElementById('ger-salario')?.value) || 0;
    const outrosOp = parseFloat(document.getElementById('ger-outros-op')?.value) || 0;

    // Filtrar vendas do período
    const vendasPeriodo = STATE.logs.filter(l =>
      l.type === 'venda' && l.status !== 'CANCELADO' &&
      l.date >= dataInicio && l.date <= dataFim + 'T23:59:59'
    );

    atualizarCentroCustos(vendasPeriodo, impostoPerc, fretePerc, salario, outrosOp);
    lucide.createIcons();
  }

  function atualizarCentroCustos(vendas, impPerc, fretePerc, salario, outrosOp) {
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

    let produtos = Object.values(mapa).map(p => ({
      ...p,
      custoTotal: p.custoUnit * p.qtd
    }));
    // Ordenar alfabeticamente
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    const receitaTotal = produtos.reduce((s, p) => s + p.receita, 0);
    const custoTotal = produtos.reduce((s, p) => s + p.custoTotal, 0);
    const impostoTotal = receitaTotal * (impPerc / 100);
    const freteTotal = receitaTotal * (fretePerc / 100);

    // Calcular por produto (sem rateio operacional)
    produtos.forEach(p => {
      const proporcaoReceita = receitaTotal > 0 ? p.receita / receitaTotal : 0;
      p.imposto = p.receita * (impPerc / 100);
      p.frete = p.receita * (fretePerc / 100);
      p.lucroBruto = p.receita - p.custoTotal - p.imposto - p.frete;
      p.margemBruta = p.receita > 0 ? (p.lucroBruto / p.receita) * 100 : 0;
    });

    // Tabela
    if (tbody) {
      tbody.innerHTML = produtos.map(p => `
        <tr class="hover:bg-slate-50 border-b">
          <td class="p-3 font-bold text-slate-700">${p.nome}</td>
          <td class="p-3 text-center">${p.qtd}</td>
          <td class="p-3 text-right text-green-700">${formatMoney(p.receita)}</td>
          <td class="p-3 text-right text-slate-600">${formatMoney(p.custoTotal)}</td>
          <td class="p-3 text-right text-orange-600">${formatMoney(p.imposto)}</td>
          <td class="p-3 text-right text-blue-600">${formatMoney(p.frete)}</td>
          <td class="p-3 text-right font-bold ${p.lucroBruto >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(p.lucroBruto)}</td>
          <td class="p-3 text-right font-medium ${p.margemBruta >= 0 ? 'text-emerald-600' : 'text-red-500'}">${p.margemBruta.toFixed(2)}%</td>
        </tr>
      `).join('');
    }

    // Rodapé da tabela (totais dos produtos)
    if (rodape) {
      const totalLucroBruto = receitaTotal - custoTotal - impostoTotal - freteTotal;
      const margemBrutaTotal = receitaTotal > 0 ? (totalLucroBruto / receitaTotal) * 100 : 0;
      rodape.innerHTML = `
        <tr>
          <td class="p-3" colspan="2">TOTAIS</td>
          <td class="p-3 text-right text-green-700 text-base">${formatMoney(receitaTotal)}</td>
          <td class="p-3 text-right text-slate-600 text-base">${formatMoney(custoTotal)}</td>
          <td class="p-3 text-right text-orange-600 text-base">${formatMoney(impostoTotal)}</td>
          <td class="p-3 text-right text-blue-600 text-base">${formatMoney(freteTotal)}</td>
          <td class="p-3 text-right font-bold text-base ${totalLucroBruto >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(totalLucroBruto)}</td>
          <td class="p-3 text-right font-bold text-base ${margemBrutaTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}">${margemBrutaTotal.toFixed(2)}%</td>
        </tr>
      `;
    }

    // Resumo com os custos operacionais manuais
    if (resumo) {
      const lucroBruto = receitaTotal - custoTotal - impostoTotal - freteTotal;
      const totalOperacional = salario + outrosOp;
      const lucroLiquido = lucroBruto - totalOperacional;
      const margemLiquida = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

      resumo.innerHTML = `
        <div class="flex justify-between"><span>Receita Bruta:</span><span class="font-bold">${formatMoney(receitaTotal)}</span></div>
        <div class="flex justify-between"><span>Custo de Compra:</span><span>${formatMoney(custoTotal)}</span></div>
        <div class="flex justify-between"><span>Impostos:</span><span>${formatMoney(impostoTotal)}</span></div>
        <div class="flex justify-between"><span>Frete:</span><span>${formatMoney(freteTotal)}</span></div>
        <div class="flex justify-between border-t pt-1 mt-1"><span class="font-semibold">Lucro Bruto:</span><span class="font-bold ${lucroBruto >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(lucroBruto)}</span></div>
        <div class="flex justify-between text-xs"><span>Margem Bruta:</span><span class="font-bold">${(receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : 0).toFixed(2)}%</span></div>
        <div class="flex justify-between mt-3 pt-2 border-t border-dashed"><span>Salário Total:</span><span class="text-red-600">- ${formatMoney(salario)}</span></div>
        <div class="flex justify-between"><span>Outros Custos:</span><span class="text-red-600">- ${formatMoney(outrosOp)}</span></div>
        <div class="flex justify-between border-t pt-1 mt-1 text-base"><span class="font-bold">Lucro Líquido:</span><span class="font-black ${lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(lucroLiquido)}</span></div>
        <div class="flex justify-between text-xs"><span>Margem Líquida:</span><span class="font-bold">${margemLiquida.toFixed(2)}%</span></div>
      `;
    }

    lucide.createIcons();
  }

  // ============ CARREGAMENTO DOS DADOS (Aba 2) ============
  function carregarResultadoSimplificado() {
    const mesInput = document.getElementById('ger-res-mes');
    if (!mesInput) return;
    const hoje = new Date();
    if (!mesInput.value) {
      mesInput.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }
    const [ano, mes] = mesInput.value.split('-');
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    const vendas = STATE.logs.filter(l =>
      l.type === 'venda' && l.status !== 'CANCELADO' &&
      l.date >= dataInicio && l.date <= dataFim + 'T23:59:59'
    );
    const receitaTotal = vendas.reduce((s, v) => s + v.totalValue, 0);

    const despesas = STATE.expenses.filter(d => d.date >= dataInicio && d.date <= dataFim);
    const despesaTotal = despesas.reduce((s, d) => s + d.cost, 0);

    const lucro = receitaTotal - despesaTotal;

    document.getElementById('ger-res-entradas').innerText = formatMoney(receitaTotal);
    document.getElementById('ger-res-saidas').innerText = formatMoney(despesaTotal);
    document.getElementById('ger-res-lucro').innerText = formatMoney(lucro);

    const mapaProd = {};
    vendas.forEach(v => {
      if (!mapaProd[v.productName]) {
        mapaProd[v.productName] = { nome: v.productName, qtd: 0, valor: 0 };
      }
      mapaProd[v.productName].qtd += v.quantity;
      mapaProd[v.productName].valor += v.totalValue;
    });
    const produtos = Object.values(mapaProd).sort((a, b) => a.nome.localeCompare(b.nome));

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
