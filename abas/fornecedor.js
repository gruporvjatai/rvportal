// fornecedor.js – Módulo de fornecedores e compras
// Depende do sb (cliente Supabase global) e funções auxiliares (showToast, formatMoney, formatDate)

class FornecedorManager {
  constructor(container) {
    this.container = container;
    this.fornecedores = [];
    this.activeSubTab = 'cadastro';
    this.init();
  }

  async init() {
    await this.carregarFornecedores();
    this.renderizarInterface();
    this.mostrarSubAba('cadastro');
  }

  async carregarFornecedores() {
    const { data, error } = await sb
      .from('clientes')
      .select('*')
      .eq('tipo', 'FORNECEDOR')
      .order('nome');
    if (error) {
      console.error('Erro ao carregar fornecedores:', error);
      this.fornecedores = [];
    } else {
      this.fornecedores = data || [];
    }
  }

  renderizarInterface() {
    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm border">          
          <button data-subaba="compras" class="subaba-fornecedor-btn px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100"> Compras</button>
          <button data-subaba="cadastro" class="subaba-fornecedor-btn px-4 py-2 rounded-lg font-bold text-sm bg-emerald-600 text-white shadow"> Cadastro</button>
        </div>        
        <div id="subaba-fornecedor-compras" class="subaba-fornecedor-content flex-1 hidden"></div>
        <div id="subaba-fornecedor-cadastro" class="subaba-fornecedor-content flex-1"></div>
      </div>
    `;

    this.container.querySelectorAll('.subaba-fornecedor-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.mostrarSubAba(e.target.dataset.subaba));
    });
  }

  mostrarSubAba(nome) {
    this.activeSubTab = nome;
    this.container.querySelectorAll('.subaba-fornecedor-btn').forEach(btn => {
      btn.classList.remove('bg-emerald-600', 'text-white', 'shadow');
      btn.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    const btnAtivo = this.container.querySelector(`[data-subaba="${nome}"]`);
    if (btnAtivo) {
      btnAtivo.classList.add('bg-emerald-600', 'text-white', 'shadow');
      btnAtivo.classList.remove('text-slate-600', 'hover:bg-slate-100');
    }

    this.container.querySelectorAll('.subaba-fornecedor-content').forEach(el => el.classList.add('hidden'));
    const area = document.getElementById(`subaba-fornecedor-${nome}`);
    if (area) area.classList.remove('hidden');

    if (nome === 'cadastro') {
      this.renderizarCadastro(area);
    } else if (nome === 'compras') {
      this.renderizarCompras(area);
    }
  }

  // ==================== CADASTRO ====================
  renderizarCadastro(container) {
    container.innerHTML = `
      <div class="flex justify-end mb-4">
        <button id="btn-novo-fornecedor" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2">
          <i data-lucide="plus"></i> Novo Fornecedor
        </button>
      </div>
      <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th class="p-3">Nome</th>
                <th class="p-3">Contato</th>
                <th class="p-3">Telefone</th>
                <th class="p-3">Documento</th>
                <th class="p-3">IE</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody id="lista-fornecedores">
              ${this.fornecedores.map(f => `
                <tr class="border-b hover:bg-slate-50">
                  <td class="p-3 font-medium">${f.nome}</td>
                  <td class="p-3">${f.contato || '-'}</td>
                  <td class="p-3">${f.telefone || '-'}</td>
                  <td class="p-3">${f.documento || '-'}</td>
                  <td class="p-3">${f.ie || '-'}</td>
                  <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${f.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                      ${f.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <button onclick="window.fornecedorManager?.editarFornecedor(${f.id})" class="text-indigo-600 hover:text-indigo-800 mr-2" title="Editar">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.fornecedorManager?.toggleStatus(${f.id}, ${f.ativo})" class="${f.ativo ? 'text-orange-500' : 'text-green-600'} hover:opacity-80" title="${f.ativo ? 'Desativar' : 'Ativar'}">
                      <i data-lucide="${f.ativo ? 'ban' : 'check-circle'}" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="p-8 text-center text-slate-400">Nenhum fornecedor cadastrado.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    lucide.createIcons();
    document.getElementById('btn-novo-fornecedor').addEventListener('click', () => this.abrirModalFornecedor());
  }

  abrirModalFornecedor(fornecedor = null) {
    const modalAntigo = document.getElementById('modal-fornecedor');
    if (modalAntigo) modalAntigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-fornecedor';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4';
    modal.style.backdropFilter = 'blur(2px)';

    const isEdit = !!fornecedor;
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 class="text-xl font-bold flex items-center gap-2">
            <i data-lucide="truck"></i> ${isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h3>
          <button class="fechar-modal text-white hover:text-emerald-200"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="p-6 space-y-4">
          <input type="hidden" id="forn-id" value="${fornecedor?.id || ''}">
          <div><label class="block text-sm font-bold text-slate-700">Nome *</label><input type="text" id="forn-nome" value="${fornecedor?.nome || ''}" class="w-full p-2 border rounded-lg" required></div>
          <div><label class="block text-sm font-bold text-slate-700">Contato (pessoa)</label><input type="text" id="forn-contato" value="${fornecedor?.contato || ''}" class="w-full p-2 border rounded-lg"></div>
          <div><label class="block text-sm font-bold text-slate-700">Telefone</label><input type="text" id="forn-telefone" value="${fornecedor?.telefone || ''}" class="w-full p-2 border rounded-lg"></div>
          <div><label class="block text-sm font-bold text-slate-700">Documento (CNPJ/CPF)</label><input type="text" id="forn-doc" value="${fornecedor?.documento || ''}" class="w-full p-2 border rounded-lg"></div>
          <div><label class="block text-sm font-bold text-slate-700">Inscrição Estadual</label><input type="text" id="forn-ie" value="${fornecedor?.ie || ''}" class="w-full p-2 border rounded-lg"></div>
          <div><label class="block text-sm font-bold text-slate-700">CEP</label><input type="text" id="forn-cep" value="${fornecedor?.cep || ''}" class="w-full p-2 border rounded-lg"></div>
          <div><label class="block text-sm font-bold text-slate-700">Endereço</label><textarea id="forn-endereco" rows="2" class="w-full p-2 border rounded-lg">${fornecedor?.endereco || ''}</textarea></div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="forn-ativo" ${fornecedor?.ativo !== false ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded">
            <label class="text-sm font-bold text-slate-700">Ativo</label>
          </div>
        </div>
        <div class="p-5 border-t bg-slate-50 flex gap-3">
          <button class="fechar-modal flex-1 py-2 bg-white border border-slate-300 rounded-lg font-bold">Cancelar</button>
          <button id="btn-salvar-fornecedor" class="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow">Salvar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    lucide.createIcons();

    const fechar = () => modal.remove();
    modal.querySelectorAll('.fechar-modal').forEach(btn => btn.addEventListener('click', fechar));
    modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
    document.getElementById('btn-salvar-fornecedor').addEventListener('click', () => this.salvarFornecedor(modal));
  }

  async salvarFornecedor(modal) {
    const id = document.getElementById('forn-id').value;
    const nome = document.getElementById('forn-nome').value.trim();
    if (!nome) return showToast('Nome é obrigatório!', true);

    const payload = {
      nome,
      tipo: 'FORNECEDOR',
      contato: document.getElementById('forn-contato').value,
      telefone: document.getElementById('forn-telefone').value,
      documento: document.getElementById('forn-doc').value,
      ie: document.getElementById('forn-ie').value,
      cep: document.getElementById('forn-cep').value,
      endereco: document.getElementById('forn-endereco').value,
      ativo: document.getElementById('forn-ativo').checked,
      fornecedor_desde: new Date().toISOString().split('T')[0]
    };

    if (id) payload.id = parseInt(id);

    const { error } = await sb.from('clientes').upsert(payload);
    if (error) {
      showToast('Erro ao salvar: ' + error.message, true);
    } else {
      showToast('Fornecedor salvo com sucesso!');
      modal.remove();
      await this.carregarFornecedores();
      this.mostrarSubAba('cadastro');
    }
  }

  async editarFornecedor(id) {
    const fornecedor = this.fornecedores.find(f => f.id == id);
    if (fornecedor) this.abrirModalFornecedor(fornecedor);
  }

  async toggleStatus(id, ativo) {
    const novoStatus = !ativo;
    const { error } = await sb.from('clientes').update({ ativo: novoStatus }).eq('id', id);
    if (error) {
      showToast('Erro ao alterar status: ' + error.message, true);
    } else {
      showToast(novoStatus ? 'Fornecedor ativado!' : 'Fornecedor desativado!');
      await this.carregarFornecedores();
      this.mostrarSubAba('cadastro');
    }
  }

  // ==================== COMPRAS ====================
  async renderizarCompras(container) {
    // Carregar despesas com fornecedores associados
    const despesas = await this.carregarDespesas();
    const fornecedores = this.fornecedores;

    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[150px]">
            <label class="block text-xs font-bold text-slate-500 mb-1">Fornecedor</label>
            <select id="filtro-fornecedor" class="w-full p-2 border rounded text-sm bg-white">
              <option value="">Todos os fornecedores</option>
              ${fornecedores.map(f => `<option value="${f.nome.replace(/"/g, '&quot;')}">${f.nome}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Status</label>
            <select id="filtro-status-compra" class="w-36 p-2 border rounded text-sm bg-white">
              <option value="VENCIDOS">Vencidos</option>
              <option value="ABERTOS">Em aberto (inclui vencidos)</option>
              <option value="PAGOS">Pagos</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Data Inicial</label>
            <input type="date" id="filtro-data-inicio" class="p-2 border rounded text-sm w-36">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 mb-1">Data Final</label>
            <input type="date" id="filtro-data-fim" class="p-2 border rounded text-sm w-36">
          </div>
          <button id="btn-aplicar-filtros" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">Filtrar</button>
          <button id="btn-imprimir-compras" class="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1"><i data-lucide="printer" class="w-4 h-4"></i> Imprimir</button>
        </div>
      </div>
      <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left" id="tabela-compras">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th class="p-3 cursor-pointer hover:bg-slate-100" data-ordem="fornecedor">Fornecedor <span class="ordem-icon"></span></th>
                <th class="p-3 cursor-pointer hover:bg-slate-100" data-ordem="data">Data Lanç. <span class="ordem-icon"></span></th>
                <th class="p-3 cursor-pointer hover:bg-slate-100" data-ordem="vencimento">Vencimento <span class="ordem-icon"></span></th>
                <th class="p-3 cursor-pointer hover:bg-slate-100" data-ordem="categoria">Categoria <span class="ordem-icon"></span></th>
                <th class="p-3 cursor-pointer hover:bg-slate-100" data-ordem="valor">Valor <span class="ordem-icon"></span></th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center w-24">Ação</th>
              </tr>
            </thead>
            <tbody id="lista-compras">
              <tr><td colspan="7" class="p-8 text-center text-slate-400">Carregando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();

    // Configurar datas padrão (Janeiro até hoje)
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), 0, 1);
    document.getElementById('filtro-data-inicio').value = primeiroDia.toISOString().split('T')[0];
    document.getElementById('filtro-data-fim').value = hoje.toISOString().split('T')[0];

    // Eventos
    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => this.atualizarTabelaCompras());
    document.getElementById('btn-imprimir-compras').addEventListener('click', () => this.imprimirCompras());
    // Ordenação
    const headers = document.querySelectorAll('#tabela-compras th');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const campo = th.dataset.ordem;
        if (campo) this.ordenarTabela(campo);
      });
    });

    this.atualizarTabelaCompras();
  }

  async carregarDespesas() {
    // Buscar todas as despesas e também logs do tipo despesa (pagos) – na verdade, despesas estão na tabela despesas
    const { data: despesas, error } = await sb.from('despesas').select('*').order('data', { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    // Associar fornecedor (pela observação "Fornecedor: Nome" ou pelo nome da categoria se igual a algum fornecedor)
    const fornecedoresMap = new Map(this.fornecedores.map(f => [f.nome.toLowerCase(), f]));
    const despesasComFornecedor = despesas.map(d => {
      let fornecedor = null;
      let nomeFornecedor = '';
      if (d.observacao && d.observacao.includes('Fornecedor:')) {
        const match = d.observacao.match(/Fornecedor:\s*([^|]+)/i);
        if (match) nomeFornecedor = match[1].trim();
      } else {
        // Tenta associar pela categoria se coincidir com algum fornecedor
        const catLower = d.item.toLowerCase();
        const found = this.fornecedores.find(f => f.nome.toLowerCase() === catLower);
        if (found) nomeFornecedor = found.nome;
      }
      if (nomeFornecedor) {
        const f = fornecedoresMap.get(nomeFornecedor.toLowerCase());
        if (f) fornecedor = f;
      }
      return { ...d, fornecedorNome: nomeFornecedor || '—', fornecedor };
    });
    return despesasComFornecedor;
  }

  async atualizarTabelaCompras() {
    const despesas = await this.carregarDespesas();
    const fornecedorFiltro = document.getElementById('filtro-fornecedor').value;
    const statusFiltro = document.getElementById('filtro-status-compra').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const hoje = new Date().toISOString().split('T')[0];

    let filtradas = despesas;

    // Filtro fornecedor
    if (fornecedorFiltro) {
      filtradas = filtradas.filter(d => d.fornecedorNome === fornecedorFiltro);
    }

    // Filtro datas (usa data de lançamento - campo "data")
    if (dataInicio) filtradas = filtradas.filter(d => d.data >= dataInicio);
    if (dataFim) filtradas = filtradas.filter(d => d.data <= dataFim);

    // Filtro status
    if (statusFiltro === 'VENCIDOS') {
      filtradas = filtradas.filter(d => d.status !== 'PAGO' && d.data < hoje);
    } else if (statusFiltro === 'ABERTOS') {
      filtradas = filtradas.filter(d => d.status !== 'PAGO'); // inclui vencidos
    } else if (statusFiltro === 'PAGOS') {
      filtradas = filtradas.filter(d => d.status === 'PAGO');
    }
    // 'TODOS' não filtra

    this.dadosTabela = filtradas;
    this.renderTabelaCompras(filtradas);
  }

  renderTabelaCompras(dados) {
    const tbody = document.getElementById('lista-compras');
    if (!tbody) return;
    if (!dados.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400">Nenhuma compra encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = dados.map(exp => {
      const statusClass = exp.status === 'PAGO' ? 'bg-green-100 text-green-700' : (exp.data < new Date().toISOString().split('T')[0] ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700');
      const statusText = exp.status === 'PAGO' ? 'Pago' : (exp.data < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Pendente');
      return `
        <tr class="border-b hover:bg-slate-50">
          <td class="p-3 font-medium">${exp.fornecedorNome}</td>
          <td class="p-3">${formatDate(exp.data)}</td>
          <td class="p-3">${formatDate(exp.data)}</td>
          <td class="p-3">${exp.item}</td>
          <td class="p-3 font-bold text-right">${formatMoney(exp.custo)}</td>
          <td class="p-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass}">${statusText}</span></td>
          <td class="p-3 text-center">
            ${exp.status !== 'PAGO' ? `<button onclick="payExpense(${exp.id})" class="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Baixar</button>` : '<span class="text-slate-400 text-xs">—</span>'}
          </td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  }

  ordenarTabela(campo) {
    if (!this.dadosTabela) return;
    let ordenados = [...this.dadosTabela];
    const ordemAtual = this.ordemAtual || {};
    const direcao = ordemAtual[campo] === 'asc' ? 'desc' : 'asc';
    ordenados.sort((a, b) => {
      let valA, valB;
      switch (campo) {
        case 'fornecedor': valA = a.fornecedorNome; valB = b.fornecedorNome; break;
        case 'data': valA = a.data; valB = b.data; break;
        case 'vencimento': valA = a.data; valB = b.data; break;
        case 'categoria': valA = a.item; valB = b.item; break;
        case 'valor': valA = a.custo; valB = b.custo; break;
        default: return 0;
      }
      if (valA < valB) return direcao === 'asc' ? -1 : 1;
      if (valA > valB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });
    this.ordemAtual = { [campo]: direcao };
    this.renderTabelaCompras(ordenados);
    // Atualizar ícones das setas
    document.querySelectorAll('#tabela-compras th .ordem-icon').forEach(icon => icon.innerHTML = '');
    const th = document.querySelector(`#tabela-compras th[data-ordem="${campo}"] .ordem-icon`);
    if (th) th.innerHTML = direcao === 'asc' ? ' ▲' : ' ▼';
  }

  async imprimirCompras() {
    const dados = this.dadosTabela || [];
    if (dados.length === 0) return showToast('Nenhum dado para imprimir', true);
    const fornecedorFiltro = document.getElementById('filtro-fornecedor').value || 'Todos';
    const statusFiltro = document.getElementById('filtro-status-compra').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    let statusTexto = '';
    if (statusFiltro === 'VENCIDOS') statusTexto = 'Apenas Vencidos';
    else if (statusFiltro === 'ABERTOS') statusTexto = 'Em Aberto (inclui vencidos)';
    else if (statusFiltro === 'PAGOS') statusTexto = 'Pagos';
    else statusTexto = 'Todos';

    const rowsHtml = dados.map(exp => `
      <tr>
        <td style="border:1px solid #000; padding:6px;">${exp.fornecedorNome}</td>
        <td style="border:1px solid #000; padding:6px;">${formatDate(exp.data)}</td>
        <td style="border:1px solid #000; padding:6px;">${exp.item}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right;">${formatMoney(exp.custo)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:center;">${exp.status === 'PAGO' ? 'Pago' : (exp.data < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Pendente')}</td>
      </tr>
    `).join('');

    const total = dados.reduce((s, e) => s + e.custo, 0);

    const html = `
      <div style="font-family: Helvetica; padding:20px; max-width:1000px; margin:auto;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://i.postimg.cc/52cvrkkP/LOGRVPORTAL.png" style="height:60px;">
          <h2 style="color:#059669;">RV PORTAL MADEIRAS</h2>
          <h3>Relatório de Compras - Fornecedores</h3>
          <p>Fornecedor: ${fornecedorFiltro} | Status: ${statusTexto} | Período: ${dataInicio || 'início'} até ${dataFim || 'hoje'}</p>
        </div>
        <table style="width:100%; border-collapse: collapse; margin-top:15px;">
          <thead>
            <tr style="background:#1e293b; color:white;">
              <th style="padding:8px;">Fornecedor</th>
              <th style="padding:8px;">Data Lanç.</th>
              <th style="padding:8px;">Categoria</th>
              <th style="padding:8px;">Valor</th>
              <th style="padding:8px;">Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:bold;">
              <td colspan="3" style="padding:8px; text-align:right;">TOTAL:</td>
              <td style="padding:8px; text-align:right;">${formatMoney(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

// Inicialização global
window.fornecedorManager = null;
window.initFornecedor = function() {
  const container = document.getElementById('view-fornecedor');
  if (!container || container.dataset.fornecedorIniciado === 'true') return;
  container.dataset.fornecedorIniciado = 'true';
  container.classList.remove('hidden-section');
  container.classList.add('active-section');
  container.innerHTML = '';
  window.fornecedorManager = new FornecedorManager(container);
};
