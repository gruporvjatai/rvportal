// fornecedor.js – Módulo de gestão de fornecedores e compras
// Integrado ao RV Portal, utilizando tabela clientes (com tipo FORNECEDOR) e despesas (com match textual)

class FornecedorManager {
  constructor(container, supabase) {
    this.container = container;
    this.supabase = supabase;
    this.fornecedores = [];
    this.activeSubTab = 'cadastro'; // 'cadastro' ou 'compras'
    this.init();
  }

  async init() {
    await this.carregarFornecedores();
    this.renderizarInterface();
    this.mostrarSubAba('cadastro');
  }

  async carregarFornecedores() {
    const { data, error } = await this.supabase
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
        <!-- Sub-abas -->
        <div class="flex gap-3 mb-5 bg-white p-1 rounded-2xl shadow-md border border-emerald-100">
          <button data-subaba="cadastro" class="subaba-fornecedor-btn flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
            <i data-lucide="user-plus"></i> Cadastro
          </button>
          <button data-subaba="compras" class="subaba-fornecedor-btn flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
            <i data-lucide="shopping-cart"></i> Compras
          </button>
        </div>
        <div id="subaba-fornecedor-cadastro" class="subaba-fornecedor-content flex-1"></div>
        <div id="subaba-fornecedor-compras" class="subaba-fornecedor-content flex-1 hidden"></div>
      </div>
    `;
    this.atualizarEstiloBotoes('cadastro');
    this.container.querySelectorAll('.subaba-fornecedor-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const aba = e.currentTarget.dataset.subaba;
        if (aba) this.mostrarSubAba(aba);
      });
    });
  }

  atualizarEstiloBotoes(abaAtiva) {
    const botoes = {
      cadastro: this.container.querySelector('[data-subaba="cadastro"]'),
      compras: this.container.querySelector('[data-subaba="compras"]')
    };
    const estiloAtivo = 'bg-emerald-600 text-white shadow-md border-transparent';
    const estiloInativo = 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50';
    for (const [aba, btn] of Object.entries(botoes)) {
      if (!btn) continue;
      if (aba === abaAtiva) {
        btn.classList.remove(...btn.classList);
        btn.classList.add('subaba-fornecedor-btn', 'flex-1', 'md:flex-none', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloAtivo.split(' '));
      } else {
        btn.classList.remove(...btn.classList);
        btn.classList.add('subaba-fornecedor-btn', 'flex-1', 'md:flex-none', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloInativo.split(' '));
      }
    }
  }

  mostrarSubAba(nome) {
    this.activeSubTab = nome;
    this.atualizarEstiloBotoes(nome);
    this.container.querySelectorAll('.subaba-fornecedor-content').forEach(el => el.classList.add('hidden'));
    const area = document.getElementById(`subaba-fornecedor-${nome}`);
    if (area) area.classList.remove('hidden');
    if (nome === 'cadastro') {
      this.renderizarCadastro(area);
    } else if (nome === 'compras') {
      this.renderizarCompras(area);
    }
  }

  // ==================== SUB-ABA CADASTRO ====================
  renderizarCadastro(area) {
    area.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="truck" class="text-emerald-600"></i> Fornecedores
          </h2>
          <button id="btn-novo-fornecedor" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2">
            <i data-lucide="plus"></i> Novo Fornecedor
          </button>
        </div>
        <div class="mb-4 bg-white p-4 rounded-xl shadow-sm border">
          <div class="relative w-full">
            <i data-lucide="search" class="absolute left-3 top-2.5 text-slate-400 w-5 h-5"></i>
            <input type="text" id="busca-fornecedor" placeholder="Buscar fornecedor por nome, documento ou contato..." class="w-full pl-10 p-2 border rounded outline-none focus:border-emerald-600 font-medium">
          </div>
        </div>
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden flex-1">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-700 sticky top-0">
              <tr><th class="p-4">Nome</th><th class="p-4">Contato</th><th class="p-4">Telefone</th><th class="p-4">Documento</th><th class="p-4 text-center">Status</th><th class="p-4 text-center">Ações</th></tr>
            </thead>
            <tbody id="lista-fornecedores" class="divide-y"></tbody>
          </table>
        </div>
      </div>
    `;
    this.renderizarListaFornecedores();
    document.getElementById('busca-fornecedor').addEventListener('keyup', () => this.renderizarListaFornecedores());
    document.getElementById('btn-novo-fornecedor').addEventListener('click', () => this.abrirModalFornecedor());
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async renderizarListaFornecedores() {
    const busca = document.getElementById('busca-fornecedor')?.value.toLowerCase() || '';
    let filtered = this.fornecedores.filter(f =>
      f.nome.toLowerCase().includes(busca) ||
      (f.documento && f.documento.includes(busca)) ||
      (f.contato && f.contato.toLowerCase().includes(busca))
    );
    const tbody = document.getElementById('lista-fornecedores');
    if (!tbody) return;
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhum fornecedor encontrado.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(f => `
      <tr class="hover:bg-slate-50 border-b">
        <td class="p-4 font-medium">${f.nome}</td>
        <td class="p-4">${f.contato || '-'}</td>
        <td class="p-4">${f.telefone || '-'}</td>
        <td class="p-4">${f.documento || '-'}</td>
        <td class="p-4 text-center"><span class="px-2 py-1 rounded-full text-xs font-bold ${f.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${f.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td class="p-4 text-center">
          <div class="flex justify-center gap-2">
            <button onclick="window.fornecedorManager.abrirModalFornecedor('${f.id}')" class="text-indigo-600 hover:text-indigo-800" title="Editar"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
            <button onclick="window.fornecedorManager.toggleStatusFornecedor('${f.id}', ${f.ativo})" class="${f.ativo ? 'text-orange-500' : 'text-green-600'}" title="${f.ativo ? 'Desativar' : 'Ativar'}"><i data-lucide="${f.ativo ? 'ban' : 'check-circle'}" class="w-4 h-4"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async abrirModalFornecedor(id = null) {
    const isEdit = !!id;
    let dados = { id: '', nome: '', contato: '', telefone: '', documento: '', ie: '', cep: '', endereco: '', ativo: true };
    if (isEdit) {
      const fornecedor = this.fornecedores.find(f => f.id == id);
      if (fornecedor) dados = { ...fornecedor };
    }
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 class="text-xl font-bold flex items-center gap-2"><i data-lucide="truck"></i> ${isEdit ? 'Editar' : 'Novo'} Fornecedor</h3>
          <button class="fechar-modal text-white hover:text-emerald-200"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="p-6 space-y-4">
          <div><label class="block text-sm font-bold text-slate-700">Nome *</label><input type="text" id="f-nome" value="${dados.nome.replace(/"/g, '&quot;')}" class="w-full p-2 border rounded focus:ring-emerald-500"></div>
          <div><label class="block text-sm font-bold text-slate-700">Contato (pessoa)</label><input type="text" id="f-contato" value="${dados.contato || ''}" class="w-full p-2 border rounded"></div>
          <div><label class="block text-sm font-bold text-slate-700">Telefone</label><input type="text" id="f-telefone" value="${dados.telefone || ''}" class="w-full p-2 border rounded"></div>
          <div><label class="block text-sm font-bold text-slate-700">Documento (CNPJ/CPF)</label><input type="text" id="f-documento" value="${dados.documento || ''}" class="w-full p-2 border rounded"></div>
          <div><label class="block text-sm font-bold text-slate-700">Inscrição Estadual (IE)</label><input type="text" id="f-ie" value="${dados.ie || ''}" class="w-full p-2 border rounded"></div>
          <div><label class="block text-sm font-bold text-slate-700">CEP</label><input type="text" id="f-cep" value="${dados.cep || ''}" class="w-full p-2 border rounded"></div>
          <div><label class="block text-sm font-bold text-slate-700">Endereço</label><textarea id="f-endereco" rows="2" class="w-full p-2 border rounded">${dados.endereco || ''}</textarea></div>
          <div class="flex items-center gap-2"><input type="checkbox" id="f-ativo" ${dados.ativo ? 'checked' : ''} class="w-4 h-4 text-emerald-600"><label class="text-sm font-bold">Ativo</label></div>
        </div>
        <div class="p-5 border-t bg-slate-50 flex gap-3">
          <button class="btn-cancelar flex-1 py-2 bg-white border border-slate-300 rounded-lg font-bold">Cancelar</button>
          <button class="btn-salvar flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    modal.querySelector('.fechar-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancelar').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-salvar').addEventListener('click', async () => {
      const payload = {
        nome: document.getElementById('f-nome').value.trim(),
        contato: document.getElementById('f-contato').value.trim(),
        telefone: document.getElementById('f-telefone').value.trim(),
        documento: document.getElementById('f-documento').value.trim(),
        ie: document.getElementById('f-ie').value.trim(),
        cep: document.getElementById('f-cep').value.trim(),
        endereco: document.getElementById('f-endereco').value.trim(),
        ativo: document.getElementById('f-ativo').checked,
        tipo: 'FORNECEDOR'
      };
      if (!payload.nome) {
        window.showToast('Nome é obrigatório.', true);
        return;
      }
      if (isEdit) {
        payload.id = dados.id;
        const { error } = await this.supabase.from('clientes').update(payload).eq('id', payload.id);
        if (error) window.showToast('Erro ao atualizar: ' + error.message, true);
        else { window.showToast('Fornecedor atualizado!'); modal.remove(); await this.carregarFornecedores(); this.renderizarListaFornecedores(); }
      } else {
        // Buscar próximo ID disponível (igual aba clientes)
        const { data: maxIdData } = await this.supabase.from('clientes').select('id').order('id', { ascending: false }).limit(1);
        let novoId = 1;
        if (maxIdData && maxIdData.length > 0) novoId = maxIdData[0].id + 1;
        payload.id = novoId;
        const { error } = await this.supabase.from('clientes').insert(payload);
        if (error) window.showToast('Erro ao criar: ' + error.message, true);
        else { window.showToast('Fornecedor criado!'); modal.remove(); await this.carregarFornecedores(); this.renderizarListaFornecedores(); }
      }
    });
  }

  async toggleStatusFornecedor(id, ativo) {
    if (!confirm(ativo ? 'Desativar este fornecedor?' : 'Ativar este fornecedor?')) return;
    const { error } = await this.supabase.from('clientes').update({ ativo: !ativo }).eq('id', id);
    if (error) window.showToast('Erro ao alterar status: ' + error.message, true);
    else { window.showToast(ativo ? 'Fornecedor desativado.' : 'Fornecedor ativado.'); await this.carregarFornecedores(); this.renderizarListaFornecedores(); }
  }

  // ==================== SUB-ABA COMPRAS ====================
  async renderizarCompras(area) {
    area.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2"><i data-lucide="shopping-cart" class="text-emerald-600"></i> Compras / Contas a Pagar (Fornecedores)</h2>
          <div class="flex gap-2">
            <button id="btn-imprimir-compras" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2"><i data-lucide="printer"></i> Imprimir Relatório</button>
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl shadow-sm border mb-4">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div><label class="text-xs font-bold uppercase">Fornecedor</label><select id="filtro-fornecedor-id" class="w-full p-2 border rounded text-sm"><option value="">Todos</option></select></div>
            <div><label class="text-xs font-bold uppercase">Status</label><select id="filtro-status-compra" class="w-full p-2 border rounded text-sm"><option value="VENCIDOS">Vencidos (Padrão)</option><option value="ABERTOS">Em Aberto</option><option value="PAGOS">Pagos</option><option value="TODOS">Todos</option></select></div>
            <div><label class="text-xs font-bold uppercase">Data Inicial</label><input type="date" id="filtro-data-start" class="w-full p-2 border rounded text-sm"></div>
            <div><label class="text-xs font-bold uppercase">Data Final</label><input type="date" id="filtro-data-end" class="w-full p-2 border rounded text-sm"></div>
            <div class="flex items-end"><button id="btn-aplicar-filtros" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold w-full">Aplicar Filtros</button></div>
          </div>
        </div>
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden flex-1">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-700 sticky top-0">
                <tr>
                  <th class="p-3 cursor-pointer" data-ordem="data_vencimento">Vencimento <span class="seta-ordem"></span></th>
                  <th class="p-3 cursor-pointer" data-ordem="data_lancamento">Lançamento <span class="seta-ordem"></span></th>
                  <th class="p-3 cursor-pointer" data-ordem="fornecedor_nome">Fornecedor <span class="seta-ordem"></span></th>
                  <th class="p-3 cursor-pointer" data-ordem="categoria">Categoria <span class="seta-ordem"></span></th>
                  <th class="p-3 cursor-pointer" data-ordem="valor">Valor (R$) <span class="seta-ordem"></span></th>
                  <th class="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody id="lista-compras" class="divide-y"><tr><td colspan="6" class="p-8 text-center text-slate-400">Carregando...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    // Preencher select de fornecedores
    const selectFornecedor = document.getElementById('filtro-fornecedor-id');
    if (selectFornecedor) {
      selectFornecedor.innerHTML = '<option value="">Todos</option>' + this.fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    }
    // Definir datas padrão: início do ano até hoje
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    document.getElementById('filtro-data-start').value = inicioAno.toISOString().split('T')[0];
    document.getElementById('filtro-data-end').value = hoje.toISOString().split('T')[0];
    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => this.carregarCompras());
    document.getElementById('btn-imprimir-compras').addEventListener('click', () => this.imprimirRelatorioCompras());
    // Ordenação
    document.querySelectorAll('#lista-compras').forEach(th => {
      th.addEventListener('click', (e) => {
        const coluna = e.currentTarget.dataset.ordem;
        if (coluna) this.ordenarCompras(coluna);
      });
    });
    await this.carregarCompras();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async carregarCompras() {
    const tbody = document.getElementById('lista-compras');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Carregando...</td></tr>';

    // Buscar todas as despesas
    const { data: despesas, error } = await this.supabase.from('despesas').select('*').order('data', { ascending: false });
    if (error) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400">Erro: ${error.message}</td></tr>`;
      return;
    }

    // Associar cada despesa a um fornecedor pelo match textual na observação
    const despesasComFornecedor = [];
    for (const desp of despesas) {
      let fornecedorNome = null;
      let fornecedorId = null;
      if (desp.observacao) {
        const match = desp.observacao.match(/Fornecedor:\s*([^|]+)/i);
        if (match) fornecedorNome = match[1].trim();
      }
      if (fornecedorNome) {
        const fornecedor = this.fornecedores.find(f => f.nome.toLowerCase() === fornecedorNome.toLowerCase());
        if (fornecedor) {
          fornecedorId = fornecedor.id;
          fornecedorNome = fornecedor.nome;
        }
      }
      if (fornecedorId) {
        despesasComFornecedor.push({
          id: desp.id,
          data_lancamento: desp.data,
          data_vencimento: desp.data, // a tabela despesas tem data (vencimento)
          fornecedor_id: fornecedorId,
          fornecedor_nome: fornecedorNome,
          categoria: desp.item,
          valor: desp.custo,
          status: desp.status // PENDENTE, PAGO
        });
      }
    }

    // Aplicar filtros
    const fornecedorIdFiltro = document.getElementById('filtro-fornecedor-id').value;
    const statusFiltro = document.getElementById('filtro-status-compra').value;
    const dataStart = document.getElementById('filtro-data-start').value;
    const dataEnd = document.getElementById('filtro-data-end').value;
    const hojeLocal = new Date().toISOString().split('T')[0];

    let filtradas = despesasComFornecedor.filter(d => {
      if (fornecedorIdFiltro && d.fornecedor_id != fornecedorIdFiltro) return false;
      if (dataStart && d.data_vencimento < dataStart) return false;
      if (dataEnd && d.data_vencimento > dataEnd) return false;
      const isVencido = (d.data_vencimento < hojeLocal) && d.status !== 'PAGO';
      if (statusFiltro === 'VENCIDOS') return isVencido;
      if (statusFiltro === 'ABERTOS') return d.status !== 'PAGO'; // inclui vencidos
      if (statusFiltro === 'PAGOS') return d.status === 'PAGO';
      return true;
    });

    this.comprasFiltradas = filtradas; // guardar para impressão e ordenação
    this.ordenarCompras('data_vencimento'); // ordenação inicial
  }

  ordenarCompras(coluna, direcao = 'asc') {
    if (!this.comprasFiltradas) return;
    const sorted = [...this.comprasFiltradas];
    const ordem = direcao === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      let valA = a[coluna];
      let valB = b[coluna];
      if (coluna === 'valor') { valA = parseFloat(valA); valB = parseFloat(valB); }
      if (coluna === 'data_vencimento' || coluna === 'data_lancamento') { valA = valA || ''; valB = valB || ''; }
      if (valA < valB) return -1 * ordem;
      if (valA > valB) return 1 * ordem;
      return 0;
    });
    this.comprasFiltradas = sorted;
    this.exibirComprasTabela();
    // Atualizar setas visuais (simplificado)
    document.querySelectorAll('.seta-ordem').forEach(s => s.innerHTML = '');
    const th = document.querySelector(`[data-ordem="${coluna}"]`);
    if (th) th.querySelector('.seta-ordem').innerHTML = direcao === 'asc' ? ' ▲' : ' ▼';
  }

  exibirComprasTabela() {
    const tbody = document.getElementById('lista-compras');
    if (!tbody) return;
    if (!this.comprasFiltradas || this.comprasFiltradas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhuma compra encontrada para os filtros.</td></tr>';
      return;
    }
    const hojeLocal = new Date().toISOString().split('T')[0];
    tbody.innerHTML = this.comprasFiltradas.map(d => {
      const isVencido = (d.data_vencimento < hojeLocal) && d.status !== 'PAGO';
      let statusHtml = '';
      if (d.status === 'PAGO') statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Pago</span>';
      else if (isVencido) statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">Vencido</span>';
      else statusHtml = '<span class="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Em Aberto</span>';
      return `
        <tr class="border-b hover:bg-slate-50">
          <td class="p-3">${d.data_vencimento ? new Date(d.data_vencimento).toLocaleDateString('pt-BR') : '-'}</td>
          <td class="p-3">${d.data_lancamento ? new Date(d.data_lancamento).toLocaleDateString('pt-BR') : '-'}</td>
          <td class="p-3 font-medium">${d.fornecedor_nome}</td>
          <td class="p-3">${d.categoria || '-'}</td>
          <td class="p-3 font-bold text-right">R$ ${parseFloat(d.valor).toFixed(2)}</td>
          <td class="p-3 text-center">${statusHtml}</td>
        </tr>
      `;
    }).join('');
  }

  async imprimirRelatorioCompras() {
    if (!this.comprasFiltradas || this.comprasFiltradas.length === 0) {
      window.showToast('Nenhum dado para imprimir.', true);
      return;
    }
    const filtroFornecedor = document.getElementById('filtro-fornecedor-id').options[document.getElementById('filtro-fornecedor-id').selectedIndex]?.text || 'Todos';
    const statusFiltro = document.getElementById('filtro-status-compra').options[document.getElementById('filtro-status-compra').selectedIndex]?.text || '';
    const dataStart = document.getElementById('filtro-data-start').value;
    const dataEnd = document.getElementById('filtro-data-end').value;
    let totalGeral = 0;
    const rowsHtml = this.comprasFiltradas.map(d => {
      totalGeral += parseFloat(d.valor);
      let statusText = d.status === 'PAGO' ? 'Pago' : (d.data_vencimento < new Date().toISOString().split('T')[0] ? 'Vencido' : 'Em Aberto');
      return `
        <tr>
          <td style="border-bottom:1px solid #ccc; padding:6px;">${new Date(d.data_vencimento).toLocaleDateString('pt-BR')}</td>
          <td style="border-bottom:1px solid #ccc; padding:6px;">${new Date(d.data_lancamento).toLocaleDateString('pt-BR')}</td>
          <td style="border-bottom:1px solid #ccc; padding:6px;">${d.fornecedor_nome}</td>
          <td style="border-bottom:1px solid #ccc; padding:6px;">${d.categoria || '-'}</td>
          <td style="border-bottom:1px solid #ccc; padding:6px; text-align:right;">R$ ${parseFloat(d.valor).toFixed(2)}</td>
          <td style="border-bottom:1px solid #ccc; padding:6px; text-align:center;">${statusText}</td>
        </tr>
      `;
    }).join('');
    const html = `
      <div style="font-family:Helvetica; padding:20px; max-width:1000px; margin:auto;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://i.postimg.cc/52cvrkkP/LOGRVPORTAL.png" style="height:60px;">
          <h2 style="color:#059669;">RV PORTAL MADEIRAS</h2>
          <h3>Relatório de Compras (Fornecedores)</h3>
          <p>Período: ${dataStart ? new Date(dataStart).toLocaleDateString('pt-BR') : 'início'} até ${dataEnd ? new Date(dataEnd).toLocaleDateString('pt-BR') : 'hoje'}</p>
          <p>Fornecedor: ${filtroFornecedor} | Status: ${statusFiltro}</p>
        </div>
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead><tr style="background:#eee;"><th>Vencimento</th><th>Lançamento</th><th>Fornecedor</th><th>Categoria</th><th>Valor (R$)</th><th>Status</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr style="background:#f0fdf4;"><td colspan="4" style="text-align:right; font-weight:bold;">Total Geral:</td><td style="text-align:right; font-weight:bold;">R$ ${totalGeral.toFixed(2)}</td><td></td></tr></tfoot>
        </table>
      </div>
    `;
    const opt = { margin: 10, filename: `relatorio_compras_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    const printArea = document.getElementById('print-area');
    if (printArea) {
      printArea.innerHTML = html;
      await html2pdf().set(opt).from(html).save();
      printArea.innerHTML = '';
    } else {
      window.showToast('Elemento print-area não encontrado.', true);
    }
  }
}

// Inicialização global
window.initFornecedor = function() {
  const container = document.getElementById('view-fornecedor');
  if (!container || container.dataset.fornecedorIniciado === 'true') return;
  container.dataset.fornecedorIniciado = 'true';
  container.classList.remove('hidden-section');
  container.classList.add('active-section');
  container.innerHTML = '';
  window.fornecedorManager = new FornecedorManager(container, window.supabaseClient || window.sb);
};
// Chamar se a aba já estiver visível na primeira navegação (opcional)
if (document.getElementById('view-fornecedor') && document.getElementById('view-fornecedor').classList.contains('active-section')) {
  window.initFornecedor();
}
