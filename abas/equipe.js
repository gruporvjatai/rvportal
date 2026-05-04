// equipe.js – Gestão de Equipe (Folhas de Pagamento e Cadastro)
(function () {
  'use strict';

  let subAbaAtiva = 'lancamentos'; // 'lancamentos' ou 'cadastro'

  // Aguarda carregamento do sistema principal
  window.addEventListener('load', function () {
    const originalNavigate = window.navigate;
    window.navigate = function (viewId) {
      originalNavigate(viewId);
      if (viewId === 'equipe') renderEquipe();
    };
  });

  // ========== RENDERIZAÇÃO PRINCIPAL ==========
  function renderEquipe() {
    const container = document.getElementById('view-equipe');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-4 p-4">
        <!-- Sub-abas -->
        <div class="flex bg-white rounded-xl shadow-sm border p-1 gap-1 w-fit">
          <button id="eq-tab-lancamentos" onclick="alternarSubAbaEquipe('lancamentos')"
            class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all
            ${subAbaAtiva === 'lancamentos' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'}">
            <i data-lucide="file-text" class="inline w-4 h-4 mr-1"></i> Lançamentos
          </button>
          <button id="eq-tab-cadastro" onclick="alternarSubAbaEquipe('cadastro')"
            class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all
            ${subAbaAtiva === 'cadastro' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'}">
            <i data-lucide="users" class="inline w-4 h-4 mr-1"></i> Cadastro
          </button>
        </div>

        <!-- Container das sub-abas -->
        <div id="eq-aba-lancamentos" class="${subAbaAtiva === 'lancamentos' ? '' : 'hidden'}">
          ${getLancamentosHTML()}
        </div>
        <div id="eq-aba-cadastro" class="${subAbaAtiva === 'cadastro' ? '' : 'hidden'}">
          ${getCadastroHTML()}
        </div>
      </div>
    `;

    if (subAbaAtiva === 'lancamentos') carregarLancamentos();
    else carregarCadastro();

    lucide.createIcons();
    window.alternarSubAbaEquipe = alternarSubAbaEquipe;
  }

  function alternarSubAbaEquipe(nova) {
    subAbaAtiva = nova;
    renderEquipe();
  }

  // ========== HTML DAS SUB-ABAS ==========
  function getLancamentosHTML() {
    return `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800 flex gap-2 items-center">
            <i data-lucide="file-text" class="text-emerald-600"></i> Folhas de Pagamento
          </h2>
          <div class="flex gap-2">
            <button onclick="abrirModalVale()" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
              <i data-lucide="minus-circle" class="w-4 h-4"></i> Lançar Vale
            </button>
            <button onclick="abrirModalCriarFolha()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Criar Folha
            </button>
          </div>
        </div>

        <!-- Filtro -->
        <div class="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <label class="text-xs font-bold text-slate-600">Mês Referência:</label>
          <input type="month" id="eq-filtro-mes" class="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" />
          <button onclick="carregarLancamentos()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">Filtrar</button>
          <button onclick="document.getElementById('eq-filtro-mes').value=''; carregarLancamentos()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold">Limpar</button>
        </div>

        <!-- Tabela de folhas -->
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-800 text-white">
                <tr>
                  <th class="p-3">Funcionário</th>
                  <th class="p-3">Tipo</th>
                  <th class="p-3">Mês Ref.</th>
                  <th class="p-3 text-center">Base</th>
                  <th class="p-3 text-center">Vales</th>
                  <th class="p-3 text-center">Líquido</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody id="eq-lista-folhas" class="divide-y"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function getCadastroHTML() {
    return `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800 flex gap-2 items-center">
            <i data-lucide="users" class="text-emerald-600"></i> Equipe
          </h2>
          <button onclick="abrirModalFuncionario()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
            <i data-lucide="user-plus" class="w-4 h-4"></i> Cadastrar Novo
          </button>
        </div>

        <!-- Filtro -->
        <div class="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
          <label class="text-xs font-bold text-slate-600">Tipo:</label>
          <select id="eq-filtro-tipo" class="p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 outline-none" onchange="carregarCadastro()">
            <option value="">Todos</option>
            <option value="Mensal">Fixo Mensal</option>
            <option value="Diarista">Diarista</option>
          </select>
        </div>

        <!-- Tabela de funcionários -->
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-800 text-white">
                <tr>
                  <th class="p-3">Nome</th>
                  <th class="p-3">Tipo</th>
                  <th class="p-3 text-center">Valor Mensal</th>
                  <th class="p-3 text-center">Valor Diária</th>
                  <th class="p-3">Chave PIX</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody id="eq-lista-funcionarios" class="divide-y"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ========== MODAIS ==========
  // Modal Criar Folha
  function abrirModalCriarFolha() {
    const mesRef = document.getElementById('eq-filtro-mes')?.value || new Date().toISOString().slice(0,7);
    carregarEquipeParaFolha(mesRef);
  }

  async function carregarEquipeParaFolha(mesRef) {
    showLoading(true);
    // Buscar equipe ativa
    const { data: equipe } = await sb.from('equipe').select('*').eq('ativo', true);
    // Buscar vales do mês
    const { data: vales } = await sb.from('vales').select('*').eq('mes_referencia', mesRef);
    const valesMap = {};
    (vales||[]).forEach(v => { valesMap[v.equipe_id] = (valesMap[v.equipe_id]||0) + v.valor; });

    let html = `
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" id="modal-folha">
        <div class="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
          <div class="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="font-bold text-lg text-slate-800"><i data-lucide="file-plus" class="inline w-5 h-5 text-emerald-600 mr-1"></i> Criar Folha – ${mesRef}</h3>
            <button onclick="document.getElementById('modal-folha').remove()" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button>
          </div>
          <div class="p-4 overflow-y-auto flex-1">
            <table class="w-full text-sm">
              <thead class="bg-slate-100 text-slate-700">
                <tr>
                  <th class="p-2 text-left">Funcionário</th>
                  <th class="p-2 text-center">Tipo</th>
                  <th class="p-2 text-center">Salário Base</th>
                  <th class="p-2 text-center">Vales</th>
                  <th class="p-2 text-center">Dias Trab.</th>
                  <th class="p-2 text-center">Valor Líquido (editável)</th>
                </tr>
              </thead>
              <tbody>`;
    equipe.forEach(f => {
      const vales = valesMap[f.id] || 0;
      let base = 0;
      if (f.tipo === 'Mensal') base = f.valor_mensal || 0;
      else if (f.tipo === 'Diarista') base = (f.valor_diaria || 0) * 0; // dias a preencher
      const liquido = base - vales;
      html += `
        <tr class="border-b">
          <td class="p-2 font-bold">${f.nome}</td>
          <td class="p-2 text-center">${f.tipo}</td>
          <td class="p-2 text-center">${formatMoney(base)}</td>
          <td class="p-2 text-center text-red-600">-${formatMoney(vales)}</td>
          <td class="p-2 text-center">
            ${f.tipo === 'Diarista' ? `<input type="number" id="dias-${f.id}" value="0" min="0" class="w-16 p-1 border rounded text-center text-sm" onchange="recalcularFolhaItem('${f.id}')">` : '–'}
          </td>
          <td class="p-2 text-center">
            <input type="number" id="liquido-${f.id}" value="${liquido.toFixed(2)}" step="0.01" class="w-24 p-1 border rounded text-center font-bold text-emerald-700 text-sm" />
          </td>
        </tr>`;
    });
    html += `</tbody></table></div>
          <div class="p-4 border-t bg-slate-50 rounded-b-2xl flex gap-2">
            <button onclick="document.getElementById('modal-folha').remove()" class="flex-1 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-slate-700">Cancelar</button>
            <button onclick="salvarFolha('${mesRef}')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow">Salvar Folha</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();
    showLoading(false);
  }

  window.recalcularFolhaItem = function(id) {
    const dias = parseFloat(document.getElementById(`dias-${id}`)?.value) || 0;
    const valDiaria = parseFloat(document.querySelector(`#modal-folha tr[data-id="${id}"]`)?.dataset.diaria) || 0;
    const vales = parseFloat(document.querySelector(`#modal-folha tr[data-id="${id}"]`)?.dataset.vales) || 0;
    const base = dias * valDiaria;
    const liquido = base - vales;
    const inputLiq = document.getElementById(`liquido-${id}`);
    if (inputLiq) inputLiq.value = liquido.toFixed(2);
  };

  async function salvarFolha(mesRef) {
    showLoading(true);
    const equipe = await sb.from('equipe').select('*').eq('ativo', true);
    const vales = await sb.from('vales').select('*').eq('mes_referencia', mesRef);
    const valesMap = {};
    (vales.data||[]).forEach(v => { valesMap[v.equipe_id] = (valesMap[v.equipe_id]||0) + v.valor; });

    const folhas = [];
    equipe.data.forEach(f => {
      const valesTotal = valesMap[f.id] || 0;
      const liquidoEl = document.getElementById(`liquido-${f.id}`);
      if (!liquidoEl) return;
      const valorPago = parseFloat(liquidoEl.value) || 0;
      let dias = 0;
      if (f.tipo === 'Diarista') {
        dias = parseInt(document.getElementById(`dias-${f.id}`)?.value) || 0;
      }
      folhas.push({
        equipe_id: f.id,
        mes_referencia: mesRef,
        tipo: f.tipo,
        salario_base: f.tipo === 'Mensal' ? (f.valor_mensal || 0) : (f.valor_diaria || 0) * dias,
        vales_total: valesTotal,
        valor_pago: valorPago,
        status: 'PENDENTE',
        dias_trabalhados: dias,
        chave_pix: f.chave_pix,
        data_criacao: new Date().toISOString()
      });
    });

    const { error } = await sb.from('folhas').insert(folhas);
    if (error) { showLoading(false); alert('Erro ao salvar folha: ' + error.message); return; }

    document.getElementById('modal-folha')?.remove();
    showLoading(false);
    alert('Folha criada com sucesso!');
    carregarLancamentos();
  }

  // Modal Lançar Vale
  async function abrirModalVale() {
    const mesRef = document.getElementById('eq-filtro-mes')?.value || new Date().toISOString().slice(0,7);
    const { data: equipe } = await sb.from('equipe').select('*').eq('ativo', true);
    let options = equipe.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

    const html = `
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" id="modal-vale">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div class="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="font-bold text-lg"><i data-lucide="minus-circle" class="inline w-5 h-5 text-amber-600 mr-1"></i>Lançar Vale</h3>
            <button onclick="document.getElementById('modal-vale').remove()" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button>
          </div>
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1">Funcionário</label>
              <select id="vale-funcionario" class="w-full p-2 border rounded-lg text-sm">${options}</select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1">Valor (R$)</label>
              <input type="number" id="vale-valor" step="0.01" class="w-full p-2 border rounded-lg text-sm font-bold text-red-600" placeholder="0.00">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1">Mês Referência</label>
              <input type="month" id="vale-mes" value="${mesRef}" class="w-full p-2 border rounded-lg text-sm">
            </div>
          </div>
          <div class="p-4 border-t bg-slate-50 flex gap-2 rounded-b-2xl">
            <button onclick="document.getElementById('modal-vale').remove()" class="flex-1 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold">Cancelar</button>
            <button onclick="salvarVale()" class="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow">Salvar</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();
  }

  async function salvarVale() {
    const funcId = document.getElementById('vale-funcionario')?.value;
    const valor = parseFloat(document.getElementById('vale-valor')?.value);
    const mes = document.getElementById('vale-mes')?.value;
    if (!funcId || isNaN(valor) || !mes) return alert('Preencha todos os campos.');

    const { error } = await sb.from('vales').insert([{
      equipe_id: funcId,
      valor,
      mes_referencia: mes,
      data: new Date().toISOString()
    }]);
    if (error) return alert('Erro: ' + error.message);
    document.getElementById('modal-vale')?.remove();
    alert('Vale lançado!');
    carregarLancamentos();
  }

  // Listagem de folhas
  async function carregarLancamentos() {
    const mesFiltro = document.getElementById('eq-filtro-mes')?.value;
    let query = sb.from('folhas').select('*, equipe(*)').order('mes_referencia', { ascending: false });
    if (mesFiltro) query = query.eq('mes_referencia', mesFiltro);

    const { data: folhas, error } = await query;
    if (error) return alert('Erro ao carregar folhas.');

    const tbody = document.getElementById('eq-lista-folhas');
    if (folhas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400">Nenhuma folha encontrada.</td></tr>';
      return;
    }

    tbody.innerHTML = folhas.map(f => `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-bold">${f.equipe?.nome || '–'}</td>
        <td class="p-3">${f.tipo}</td>
        <td class="p-3">${f.mes_referencia}</td>
        <td class="p-3 text-center">${formatMoney(f.salario_base)}</td>
        <td class="p-3 text-center text-red-600">-${formatMoney(f.vales_total)}</td>
        <td class="p-3 text-center font-bold text-emerald-700">${formatMoney(f.valor_pago)}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-1 rounded text-xs font-bold ${f.status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${f.status}</span>
        </td>
        <td class="p-3 text-center flex gap-2 justify-center">
          <button onclick="imprimirFolha('${f.id}')" class="text-slate-600 hover:text-emerald-600 bg-white border p-1.5 rounded shadow-sm" title="Imprimir"><i data-lucide="printer" class="w-4 h-4"></i></button>
          ${f.status === 'PENDENTE' ? `<button onclick="baixarFolha('${f.id}')" class="text-green-600 hover:text-green-800 bg-white border p-1.5 rounded shadow-sm" title="Pagar"><i data-lucide="check-circle" class="w-4 h-4"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
    lucide.createIcons();
  }

  // Baixar folha (lançar no financeiro)
  window.baixarFolha = async function(id) {
    if (!confirm('Confirmar pagamento desta folha? Isso lançará uma despesa no financeiro.')) return;
    const { data: folha } = await sb.from('folhas').select('*, equipe(*)').eq('id', id).single();
    if (!folha) return alert('Folha não encontrada.');

    // Criar despesa
    const descricao = `Salário ${folha.equipe.nome} (${folha.mes_referencia})`;
    const { error: errDesp } = await sb.from('despesas').insert([{
      item: 'Salário',
      quantidade: 1,
      unidade: 'Un',
      custo: folha.valor_pago,
      data: new Date().toISOString(),
      observacao: descricao,
      status: 'PAGO' // já vai pago
    }]);
    if (errDesp) return alert('Erro ao lançar despesa: ' + errDesp.message);

    // Atualizar folha para PAGO
    await sb.from('folhas').update({ status: 'PAGO' }).eq('id', id);

    // Lançar log de despesa (para aparecer no financeiro)
    await sb.from('logs').insert([{
      id: Math.floor(Math.random() * 1000000),
      tipo: 'despesa',
      produto_nome: 'Salário',
      quantidade: 1,
      data: new Date().toISOString(),
      observacao: descricao,
      valor_total: folha.valor_pago,
      status: 'ATIVO',
      status_financeiro: 'PAGO',
      valor_pago: folha.valor_pago
    }]);

    alert('Pagamento registrado com sucesso!');
    carregarLancamentos();
    // Se quiser atualizar financeiro em tempo real, chame renderFinance() se disponível
  };

  // Imprimir folha
  window.imprimirFolha = async function(id) {
    const { data: folha } = await sb.from('folhas').select('*, equipe(*)').eq('id', id).single();
    if (!folha) return;

    const conteudo = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ccc;">
        <h2 style="color: #059669;">RV PORTAL MADEIRAS</h2>
        <h3>Comprovante de Pagamento</h3>
        <p><strong>Funcionário:</strong> ${folha.equipe.nome}</p>
        <p><strong>Mês Referência:</strong> ${folha.mes_referencia}</p>
        <p><strong>Tipo:</strong> ${folha.tipo}</p>
        ${folha.tipo === 'Diarista' ? `<p><strong>Dias Trabalhados:</strong> ${folha.dias_trabalhados}</p>` : ''}
        <p><strong>Salário Base:</strong> ${formatMoney(folha.salario_base)}</p>
        <p><strong>Vales Descontados:</strong> ${formatMoney(folha.vales_total)}</p>
        <p><strong>Valor Líquido:</strong> <span style="font-size: 1.2em; font-weight: bold;">${formatMoney(folha.valor_pago)}</span></p>
        ${folha.chave_pix ? `<p><strong>Chave PIX:</strong> ${folha.chave_pix}</p>` : ''}
        <p style="margin-top: 30px;">Assinatura: ___________________________</p>
      </div>
    `;
    const janela = window.open('', '_blank', 'width=600,height=500');
    janela.document.write(conteudo);
    janela.document.close();
    janela.print();
  };

  // ========== CADASTRO DE FUNCIONÁRIOS ==========
  async function carregarCadastro() {
    const tipoFiltro = document.getElementById('eq-filtro-tipo')?.value;
    let query = sb.from('equipe').select('*').order('nome');
    if (tipoFiltro) query = query.eq('tipo', tipoFiltro);

    const { data, error } = await query;
    if (error) return alert('Erro ao carregar equipe.');

    const tbody = document.getElementById('eq-lista-funcionarios');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">Nenhum funcionário encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(f => `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-bold">${f.nome}</td>
        <td class="p-3">${f.tipo}</td>
        <td class="p-3 text-center">${f.valor_mensal ? formatMoney(f.valor_mensal) : '–'}</td>
        <td class="p-3 text-center">${f.valor_diaria ? formatMoney(f.valor_diaria) : '–'}</td>
        <td class="p-3 text-sm">${f.chave_pix || '–'}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-1 rounded text-xs font-bold ${f.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}">${f.ativo ? 'Ativo' : 'Inativo'}</span>
        </td>
        <td class="p-3 text-center flex gap-2 justify-center">
          <button onclick="editarFuncionario('${f.id}')" class="text-indigo-600 hover:text-indigo-800 bg-white border p-1.5 rounded shadow-sm"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
          <button onclick="alternarStatusFuncionario('${f.id}')" class="text-slate-600 hover:text-red-600 bg-white border p-1.5 rounded shadow-sm"><i data-lucide="power" class="w-4 h-4"></i></button>
        </td>
      </tr>
    `).join('');
    lucide.createIcons();
  }

  window.abrirModalFuncionario = function(id = null) {
    // Se id, carregar dados para edição
    const titulo = id ? 'Editar Funcionário' : 'Novo Funcionário';
    let html = `
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" id="modal-func">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div class="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="font-bold text-lg">${titulo}</h3>
            <button onclick="document.getElementById('modal-func').remove()" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button>
          </div>
          <div class="p-4 space-y-3">
            <input type="hidden" id="func-id" value="${id || ''}">
            <div>
              <label class="block text-xs font-bold text-slate-600">Nome</label>
              <input type="text" id="func-nome" class="w-full p-2 border rounded-lg text-sm" placeholder="Nome completo">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600">Tipo</label>
              <select id="func-tipo" class="w-full p-2 border rounded-lg text-sm" onchange="toggleCamposValor()">
                <option value="Mensal">Fixo Mensal</option>
                <option value="Diarista">Diarista</option>
              </select>
            </div>
            <div id="campo-mensal">
              <label class="block text-xs font-bold text-slate-600">Salário Mensal (R$)</label>
              <input type="number" id="func-valor-mensal" step="0.01" class="w-full p-2 border rounded-lg text-sm" placeholder="0.00">
            </div>
            <div id="campo-diaria" class="hidden">
              <label class="block text-xs font-bold text-slate-600">Valor Diária (R$)</label>
              <input type="number" id="func-valor-diaria" step="0.01" class="w-full p-2 border rounded-lg text-sm" placeholder="0.00">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600">Chave PIX</label>
              <input type="text" id="func-pix" class="w-full p-2 border rounded-lg text-sm" placeholder="Chave PIX (CPF/Telefone/E-mail)">
            </div>
          </div>
          <div class="p-4 border-t bg-slate-50 flex gap-2 rounded-b-2xl">
            <button onclick="document.getElementById('modal-func').remove()" class="flex-1 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold">Cancelar</button>
            <button onclick="salvarFuncionario()" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow">Salvar</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();
    if (id) preencherFormFuncionario(id);
  };

  window.toggleCamposValor = function() {
    const tipo = document.getElementById('func-tipo')?.value;
    document.getElementById('campo-mensal').classList.toggle('hidden', tipo !== 'Mensal');
    document.getElementById('campo-diaria').classList.toggle('hidden', tipo !== 'Diarista');
  };

  async function preencherFormFuncionario(id) {
    const { data } = await sb.from('equipe').select('*').eq('id', id).single();
    if (!data) return;
    document.getElementById('func-id').value = data.id;
    document.getElementById('func-nome').value = data.nome;
    document.getElementById('func-tipo').value = data.tipo;
    document.getElementById('func-valor-mensal').value = data.valor_mensal || '';
    document.getElementById('func-valor-diaria').value = data.valor_diaria || '';
    document.getElementById('func-pix').value = data.chave_pix || '';
    toggleCamposValor();
  }

  window.salvarFuncionario = async function() {
    const id = document.getElementById('func-id')?.value;
    const nome = document.getElementById('func-nome')?.value.trim();
    const tipo = document.getElementById('func-tipo')?.value;
    const valorMensal = parseFloat(document.getElementById('func-valor-mensal')?.value) || 0;
    const valorDiaria = parseFloat(document.getElementById('func-valor-diaria')?.value) || 0;
    const pix = document.getElementById('func-pix')?.value.trim();

    if (!nome) return alert('Nome obrigatório.');

    const payload = {
      nome,
      tipo,
      valor_mensal: tipo === 'Mensal' ? valorMensal : null,
      valor_diaria: tipo === 'Diarista' ? valorDiaria : null,
      chave_pix: pix,
      ativo: true
    };

    let error;
    if (id) {
      const { error: err } = await sb.from('equipe').update(payload).eq('id', id);
      error = err;
    } else {
      const { error: err } = await sb.from('equipe').insert([payload]);
      error = err;
    }

    if (error) return alert('Erro ao salvar: ' + error.message);
    document.getElementById('modal-func')?.remove();
    carregarCadastro();
  };

  window.editarFuncionario = function(id) {
    abrirModalFuncionario(id);
  };

  window.alternarStatusFuncionario = async function(id) {
    const { data } = await sb.from('equipe').select('ativo').eq('id', id).single();
    const novo = !data.ativo;
    await sb.from('equipe').update({ ativo: novo }).eq('id', id);
    carregarCadastro();
  };

  // Expor funções globais
  window.abrirModalCriarFolha = abrirModalCriarFolha;
  window.abrirModalVale = abrirModalVale;
  window.salvarVale = salvarVale;
  window.salvarFolha = salvarFolha;
  window.imprimirFolha = imprimirFolha;
  window.baixarFolha = baixarFolha;
  window.carregarLancamentos = carregarLancamentos;
  window.carregarCadastro = carregarCadastro;
})();
