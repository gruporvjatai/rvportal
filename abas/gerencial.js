// gerencial.js – Módulo de Centro de Custos e Lucratividade
(function() {
  'use strict';

  // Aguarda o DOM carregar e a inicialização do sistema
  window.addEventListener('load', function() {
    // A função navigate original será estendida para incluir a aba gerencial
    const originalNavigate = window.navigate;
    window.navigate = function(viewId) {
      originalNavigate(viewId);
      if (viewId === 'gerencial') renderGerencial();
    };
  });

  // Configurações padrão da aba
  const configGerencial = {
    impostoPercentual: 0,      // % sobre a receita
    incluirFrete: true,
    incluirDespesasOp: true
  };

  // Elemento container
  function getContainer() {
    return document.getElementById('view-gerencial');
  }

  // Função principal de renderização
  async function renderGerencial() {
    const container = getContainer();
    if (!container) return;
    
    container.innerHTML = `
      <div class="p-4 space-y-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="calculator" class="text-emerald-600"></i> Gerencial – Lucro por Produto
          </h2>
          <div class="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
            <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-slate-500">Período:</label>
              <input type="month" id="ger-mes" class="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
            </div>
            <span class="text-slate-300 text-sm">ou</span>
            <div class="flex items-center gap-2">
              <input type="date" id="ger-data-inicio" class="p-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Início" />
              <input type="date" id="ger-data-fim" class="p-2 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 outline-none" placeholder="Fim" />
            </div>
            <button id="ger-aplicar" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">Aplicar</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white p-4 rounded-xl shadow-sm border space-y-3">
            <h3 class="font-bold text-slate-700 flex items-center gap-2"><i data-lucide="settings" class="w-4"></i> Configurações de Cálculo</h3>
            <div class="flex items-center gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500">Imposto (% sobre receita)</label>
                <input type="number" id="ger-imposto" value="0" step="0.01" class="w-24 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
              </div>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" id="ger-incluir-frete" checked class="w-4 h-4 rounded text-emerald-600" /> Considerar Frete
              </label>
              <label class="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" id="ger-incluir-oper" checked class="w-4 h-4 rounded text-emerald-600" /> Ratear Desp. Operacionais
              </label>
            </div>
          </div>
          <div class="bg-white p-4 rounded-xl shadow-sm border">
            <h3 class="font-bold text-slate-700 mb-2 flex items-center gap-2"><i data-lucide="dollar-sign" class="w-4"></i> Resumo do Período</h3>
            <div id="ger-resumo" class="space-y-1 text-sm"></div>
          </div>
        </div>

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

        <div class="bg-white rounded-xl border shadow-sm p-4">
          <h3 class="font-bold text-slate-700 mb-2"><i data-lucide="list" class="w-4 inline"></i> Despesas Consideradas no Rateio</h3>
          <div class="overflow-x-auto max-h-60">
            <table class="w-full text-xs">
              <thead class="bg-slate-100 text-slate-600 sticky top-0">
                <tr><th class="p-2 text-left">Categoria</th><th class="p-2 text-left">Fornecedor</th><th class="p-2 text-right">Valor</th><th class="p-2 text-right">Data</th></tr>
              </thead>
              <tbody id="ger-lista-despesas"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Define mês atual como padrão
    const hoje = new Date();
    document.getElementById('ger-mes').value = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
    document.getElementById('ger-aplicar').addEventListener('click', () => carregarDadosGerencial());
    carregarDadosGerencial();
    lucide.createIcons();
  }

  // Coletar dados e calcular
  function carregarDadosGerencial() {
    const inicio = document.getElementById('ger-data-inicio').value;
    const fim = document.getElementById('ger-data-fim').value;
    const mesInput = document.getElementById('ger-mes').value;

    let dataInicio, dataFim;
    if (inicio && fim) {
      dataInicio = inicio;
      dataFim = fim;
    } else {
      // Usa o mês selecionado
      if (!mesInput) return;
      const [ano, mes] = mesInput.split('-');
      dataInicio = `${ano}-${mes}-01`;
      // Último dia do mês
      const ultimoDia = new Date(ano, mes, 0).getDate();
      dataFim = `${ano}-${String(mes).padStart(2,'0')}-${String(ultimoDia).padStart(2,'0')}`;
    }

    const imposto = parseFloat(document.getElementById('ger-imposto').value) || 0;
    const incluirFrete = document.getElementById('ger-incluir-frete').checked;
    const incluirOper = document.getElementById('ger-incluir-oper').checked;

    // 1. Filtrar vendas do período
    const vendasPeriodo = STATE.logs.filter(l => l.type === 'venda' && l.status !== 'CANCELADO' && l.date >= dataInicio && l.date <= dataFim + 'T23:59:59');
    if (vendasPeriodo.length === 0) {
      document.getElementById('ger-tabela-produtos').innerHTML = '';
      document.getElementById('ger-total-rodape').innerHTML = '';
      document.getElementById('ger-sem-dados').classList.remove('hidden');
      document.getElementById('ger-resumo').innerHTML = '<p class="text-slate-400">Sem vendas no período.</p>';
      document.getElementById('ger-lista-despesas').innerHTML = '';
      return;
    }
    document.getElementById('ger-sem-dados').classList.add('hidden');

    // Agrupar por produto (usando nome como chave, mas ideal seria ID)
    const mapaProd = {};
    vendasPeriodo.forEach(v => {
      const chave = v.productName;
      if (!mapaProd[chave]) {
        const produtoCad = STATE.products.find(p => p.name === chave);
        mapaProd[chave] = {
          nome: chave,
          qtd: 0,
          receita: 0,
          custoUnit: produtoCad ? produtoCad.cost : 0,
          custoTotal: 0
        };
      }
      mapaProd[chave].qtd += v.quantity;
      mapaProd[chave].receita += v.totalValue;
    });

    // Calcular custo de compra total
    Object.values(mapaProd).forEach(prod => {
      prod.custoTotal = prod.custoUnit * prod.qtd;
    });

    // Total receita bruta
    const receitaBrutaTotal = Object.values(mapaProd).reduce((acc, p) => acc + p.receita, 0);
    const impostoTotal = receitaBrutaTotal * (imposto / 100);

    // Despesas do período
    const despesasPeriodo = STATE.expenses.filter(e => e.date >= dataInicio && e.date <= dataFim);
    let freteTotal = 0;
    let despOperacionaisTotal = 0;

    despesasPeriodo.forEach(d => {
      if (incluirFrete && d.item.toLowerCase() === 'frete') {
        freteTotal += d.cost;
      } else if (incluirOper) {
        despOperacionaisTotal += d.cost;
      }
    });

    // Rateio entre produtos proporcional à receita
    const totalRateio = freteTotal + despOperacionaisTotal;
    const produtos = Object.values(mapaProd);
    
    produtos.forEach(prod => {
      const proporcao = receitaBrutaTotal > 0 ? prod.receita / receitaBrutaTotal : 0;
      prod.imposto = prod.receita * (imposto / 100);
      prod.frete = incluirFrete ? freteTotal * proporcao : 0;
      prod.despOper = incluirOper ? despOperacionaisTotal * proporcao : 0;
      prod.lucroLiquido = prod.receita - prod.custoTotal - prod.imposto - prod.frete - prod.despOper;
      prod.margem = prod.receita > 0 ? (prod.lucroLiquido / prod.receita) * 100 : 0;
    });

    // Preencher tabela de produtos
    const tbody = document.getElementById('ger-tabela-produtos');
    tbody.innerHTML = produtos.map(p =>`
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

    // Rodapé com totais
    const totalCusto = produtos.reduce((s,p) => s + p.custoTotal, 0);
    const totalLucro = produtos.reduce((s,p) => s + p.lucroLiquido, 0);
    const totalMargem = receitaBrutaTotal > 0 ? (totalLucro / receitaBrutaTotal * 100) : 0;
    document.getElementById('ger-total-rodape').innerHTML = `
      <tr>
        <td class="p-3" colspan="2">TOTAIS</td>
        <td class="p-3 text-right text-green-700 text-base">${formatMoney(receitaBrutaTotal)}</td>
        <td class="p-3 text-right text-slate-600 text-base">${formatMoney(totalCusto)}</td>
        <td class="p-3 text-right text-orange-600 text-base">${formatMoney(impostoTotal)}</td>
        <td class="p-3 text-right text-blue-600 text-base">${formatMoney(freteTotal)}</td>
        <td class="p-3 text-right text-purple-600 text-base">${formatMoney(despOperacionaisTotal)}</td>
        <td class="p-3 text-right font-bold text-base ${totalLucro >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(totalLucro)}</td>
        <td class="p-3 text-right font-bold text-base ${totalMargem >= 0 ? 'text-emerald-600' : 'text-red-500'}">${totalMargem.toFixed(2)}%</td>
      </tr>
    `;

    // Resumo no card superior
    document.getElementById('ger-resumo').innerHTML = `
      <div class="flex justify-between"><span>Receita Bruta:</span><span class="font-bold">${formatMoney(receitaBrutaTotal)}</span></div>
      <div class="flex justify-between"><span>Custo de Compra:</span><span>${formatMoney(totalCusto)}</span></div>
      <div class="flex justify-between"><span>Impostos:</span><span>${formatMoney(impostoTotal)}</span></div>
      <div class="flex justify-between"><span>Frete (total):</span><span>${formatMoney(freteTotal)}</span></div>
      <div class="flex justify-between"><span>Despesas Operacionais:</span><span>${formatMoney(despOperacionaisTotal)}</span></div>
      <div class="flex justify-between border-t pt-1 mt-1 text-base"><span>Lucro Líquido:</span><span class="font-black ${totalLucro >= 0 ? 'text-emerald-700' : 'text-red-600'}">${formatMoney(totalLucro)}</span></div>
      <div class="flex justify-between text-xs"><span>Margem Líquida:</span><span class="font-bold">${totalMargem.toFixed(2)}%</span></div>
    `;

    // Lista de despesas
    const listaDesp = document.getElementById('ger-lista-despesas');
    if (despesasPeriodo.length === 0) {
      listaDesp.innerHTML = '<tr><td colspan="4" class="p-2 text-slate-400">Nenhuma despesa no período.</td></tr>';
    } else {
      listaDesp.innerHTML = despesasPeriodo.map(d => `
        <tr class="border-b">
          <td class="p-2 font-bold">${d.item}</td>
          <td class="p-2">${d.note || '-'}</td>
          <td class="p-2 text-right font-medium text-red-600">${formatMoney(d.cost)}</td>
          <td class="p-2 text-right">${formatDate(d.date)}</td>
        </tr>
      `).join('');
    }

    lucide.createIcons();
  }

  // Expor a função de renderização para ser chamada externamente
  window.renderGerencial = renderGerencial;
})();
