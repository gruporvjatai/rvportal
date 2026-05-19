// fornecedor.js – Módulo de gestão de fornecedores (foco em compras de mercadoria)
// Depende das variáveis globais: sb, STATE, showToast, showLoading, getNextId, payExpense (opcional)

class FornecedorManager {
    constructor(container) {
        this.container = container;
        this.activeSubTab = 'cadastro';
        this.fornecedores = [];
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
                <div class="flex gap-3 mb-5 bg-white/80 p-1 rounded-2xl shadow-md border border-emerald-100">
                    <button data-subaba="cadastro" class="subaba-forn-btn relative flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
                        <i data-lucide="users" class="w-4 h-4"></i> Cadastro
                    </button>
                    <button data-subaba="compras" class="subaba-forn-btn relative flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
                        <i data-lucide="shopping-cart" class="w-4 h-4"></i> Compras
                    </button>
                </div>
                <div id="subaba-forn-cadastro" class="subaba-forn-content flex-1"></div>
                <div id="subaba-forn-compras" class="subaba-forn-content flex-1 hidden"></div>
            </div>
        `;
        this.atualizarEstiloBotoes('cadastro');
        this.container.querySelectorAll('.subaba-forn-btn').forEach(btn => {
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
                btn.classList.add('subaba-forn-btn', 'relative', 'flex-1', 'md:flex-none', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloAtivo.split(' '));
            } else {
                btn.classList.remove(...btn.classList);
                btn.classList.add('subaba-forn-btn', 'relative', 'flex-1', 'md:flex-none', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloInativo.split(' '));
            }
        }
    }

    mostrarSubAba(nome) {
        this.activeSubTab = nome;
        this.atualizarEstiloBotoes(nome);
        this.container.querySelectorAll('.subaba-forn-content').forEach(el => el.classList.add('hidden'));
        const area = document.getElementById(`subaba-forn-${nome}`);
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
            <div class="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-slate-800">Fornecedores</h2>
                    <button id="btn-novo-fornecedor" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2">
                        <i data-lucide="plus"></i> Novo Fornecedor
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50">
                            <tr><th class="p-3 text-left">Nome</th><th class="p-3 text-left">Contato</th><th class="p-3 text-left">Telefone</th><th class="p-3 text-left">Documento</th><th class="p-3 text-center">Ativo</th><th class="p-3 text-center">Ações</th></tr>
                        </thead>
                        <tbody id="lista-fornecedores">
                            ${this.fornecedores.map(f => `
                                <tr class="border-b hover:bg-slate-50">
                                    <td class="p-3 font-medium">${f.nome}</td>
                                    <td class="p-3">${f.contato || '-'}</td>
                                    <td class="p-3">${f.telefone || '-'}</td>
                                    <td class="p-3">${f.documento || '-'}</td>
                                    <td class="p-3 text-center">${f.ativo ? '<span class="text-green-600">Ativo</span>' : '<span class="text-red-500">Inativo</span>'}</td>
                                    <td class="p-3 text-center">
                                        <button onclick="window.fornecedorManager.editarFornecedor('${f.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Editar"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                                        <button onclick="window.fornecedorManager.toggleAtivoFornecedor('${f.id}', ${f.ativo})" class="${f.ativo ? 'text-orange-500' : 'text-green-600'} hover:opacity-80 p-1" title="${f.ativo ? 'Desativar' : 'Ativar'}"><i data-lucide="${f.ativo ? 'ban' : 'check-circle'}" class="w-4 h-4"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('btn-novo-fornecedor').addEventListener('click', () => this.abrirModalFornecedor());
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    abrirModalFornecedor(fornecedor = null) {
        const modalAntigo = document.getElementById('modal-fornecedor');
        if (modalAntigo) modalAntigo.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-fornecedor';
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4';

        const isEdit = !!fornecedor;
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
                    <h3 class="text-xl font-bold">${isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                    <button class="fechar-modal text-white hover:text-emerald-200"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-6 space-y-4">
                    <input type="hidden" id="forn-id" value="${isEdit ? fornecedor.id : ''}">
                    <div><label class="block text-sm font-bold">Nome *</label><input type="text" id="forn-nome" value="${isEdit ? fornecedor.nome : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">Contato (pessoa)</label><input type="text" id="forn-contato" value="${isEdit ? fornecedor.contato || '' : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">Telefone</label><input type="text" id="forn-telefone" value="${isEdit ? fornecedor.telefone || '' : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">CNPJ/CPF</label><input type="text" id="forn-doc" value="${isEdit ? fornecedor.documento || '' : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">Inscrição Estadual</label><input type="text" id="forn-ie" value="${isEdit ? fornecedor.ie || '' : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">CEP</label><input type="text" id="forn-cep" value="${isEdit ? fornecedor.cep || '' : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">Endereço</label><input type="text" id="forn-endereco" value="${isEdit ? fornecedor.endereco || '' : ''}" class="w-full p-2 border rounded"></div>
                    <div><label class="block text-sm font-bold">Data de Cadastro (Fornecedor desde)</label><input type="date" id="forn-data" value="${isEdit ? (fornecedor.fornecedor_desde || '').split('T')[0] : new Date().toISOString().split('T')[0]}" class="w-full p-2 border rounded"></div>
                    <div class="flex items-center gap-2"><input type="checkbox" id="forn-ativo" ${isEdit ? (fornecedor.ativo ? 'checked' : '') : 'checked'} class="w-4 h-4"><label>Ativo</label></div>
                </div>
                <div class="p-5 border-t flex gap-3">
                    <button class="btn-cancelar flex-1 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button>
                    <button class="btn-salvar flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold">Salvar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        modal.querySelector('.fechar-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-cancelar').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-salvar').addEventListener('click', async () => {
            await this.salvarFornecedor(modal);
        });
    }

    async salvarFornecedor(modal) {
        const id = document.getElementById('forn-id').value;
        const isNew = !id;
        let newId = isNew ? getNextId(STATE.clients) : parseInt(id);

        const payload = {
            id: newId,
            nome: document.getElementById('forn-nome').value,
            telefone: document.getElementById('forn-telefone').value,
            documento: document.getElementById('forn-doc').value,
            endereco: document.getElementById('forn-endereco').value,
            tipo: 'FORNECEDOR',
            ie: document.getElementById('forn-ie').value,
            cep: document.getElementById('forn-cep').value,
            contato: document.getElementById('forn-contato').value,
            ativo: document.getElementById('forn-ativo').checked,
            fornecedor_desde: document.getElementById('forn-data').value || null
        };

        const { error } = await sb.from('clientes').upsert(payload);
        if (error) {
            showToast('Erro ao salvar fornecedor: ' + error.message, true);
        } else {
            showToast('Fornecedor salvo com sucesso!');
            modal.remove();
            await this.carregarFornecedores();
            this.renderizarCadastro(document.getElementById('subaba-forn-cadastro'));
        }
    }

    async editarFornecedor(id) {
        const fornecedor = this.fornecedores.find(f => f.id == id);
        if (fornecedor) this.abrirModalFornecedor(fornecedor);
    }

    async toggleAtivoFornecedor(id, ativoAtual) {
        const { error } = await sb.from('clientes').update({ ativo: !ativoAtual }).eq('id', id);
        if (error) {
            showToast('Erro ao alterar status: ' + error.message, true);
        } else {
            showToast(ativoAtual ? 'Fornecedor desativado' : 'Fornecedor ativado');
            await this.carregarFornecedores();
            this.renderizarCadastro(document.getElementById('subaba-forn-cadastro'));
        }
    }

    // ==================== COMPRAS (APENAS MERCADORIA) ====================
    async renderizarCompras(container) {
        // Buscar despesas da tabela despesas
        const { data: despesas, error } = await sb
            .from('despesas')
            .select('*')
            .order('data', { ascending: false });
        if (error) {
            container.innerHTML = '<p class="text-red-500">Erro ao carregar despesas.</p>';
            return;
        }

        // Mapear despesas com nome do fornecedor (pela observação)
        const despesasComFornecedor = despesas.map(desp => {
            let fornecedorNome = '';
            let fornecedorId = null;
            if (desp.observacao && desp.observacao.includes('Fornecedor:')) {
                const match = desp.observacao.match(/Fornecedor:\s*([^|]+)/);
                if (match) fornecedorNome = match[1].trim();
                const forn = this.fornecedores.find(f => f.nome.toLowerCase() === fornecedorNome.toLowerCase());
                if (forn) fornecedorId = forn.id;
            }
            return { ...desp, fornecedor_nome: fornecedorNome, fornecedor_id: fornecedorId };
        });

        const hoje = new Date().toISOString().split('T')[0];
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm border p-4">
                <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 class="text-xl font-bold text-slate-800">Compras de Mercadoria (Fornecedores)</h2>
                    <button id="btn-imprimir-compras" class="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                        <i data-lucide="printer"></i> Imprimir Relatório
                    </button>
                </div>
                <div class="flex flex-wrap gap-3 mb-4 items-center">
                    <select id="filtro-status-compras" class="p-2 border rounded text-sm">
                        <option value="VENCIDOS">Vencidos</option>
                        <option value="EM_ABERTO">Em Aberto (inclui vencidos)</option>
                        <option value="PAGOS">Pagos</option>
                        <option value="TODOS">Todos</option>
                    </select>
                    <input type="date" id="filtro-data-inicio" value="${primeiroDiaMes}" class="p-2 border rounded text-sm">
                    <span>até</span>
                    <input type="date" id="filtro-data-fim" value="${hoje}" class="p-2 border rounded text-sm">
                    <select id="filtro-fornecedor-compras" class="p-2 border rounded text-sm">
                        <option value="">Todos os fornecedores</option>
                        ${this.fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
                        <option value="SEM">Sem fornecedor identificado</option>
                    </select>
                    <button id="btn-aplicar-filtros" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">Filtrar</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm" id="tabela-compras">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="p-3 cursor-pointer" data-order="data">Data <span class="order-arrow"></span></th>
                                <th class="p-3 cursor-pointer" data-order="fornecedor">Fornecedor <span class="order-arrow"></span></th>
                                <th class="p-3 cursor-pointer" data-order="item">Categoria <span class="order-arrow"></span></th>
                                <th class="p-3 cursor-pointer" data-order="valor">Valor (R$) <span class="order-arrow"></span></th>
                                <th class="p-3 cursor-pointer" data-order="vencimento">Vencimento <span class="order-arrow"></span></th>
                                <th class="p-3 cursor-pointer" data-order="status">Status <span class="order-arrow"></span></th>
                                <th class="p-3">Ação</th>
                            </tr>
                        </thead>
                        <tbody id="corpo-tabela-compras"></tbody>
                    </table>
                </div>
            </div>
        `;

        const renderTabela = () => {
            const statusFiltro = document.getElementById('filtro-status-compras').value;
            const dataInicio = document.getElementById('filtro-data-inicio').value;
            const dataFim = document.getElementById('filtro-data-fim').value;
            const fornecedorFiltro = document.getElementById('filtro-fornecedor-compras').value;
            const hojeLocal = getHojeLocalStr();

            let filtered = despesasComFornecedor;

            // 🔴 NOVO: Filtrar APENAS despesas do tipo MERCADORIA
            filtered = filtered.filter(d => d.tipo_despesa === 'MERCADORIA');

            // Filtro por fornecedor
            if (fornecedorFiltro === 'SEM') {
                filtered = filtered.filter(d => !d.fornecedor_id);
            } else if (fornecedorFiltro) {
                filtered = filtered.filter(d => String(d.fornecedor_id) === fornecedorFiltro);
            }

            // Filtro por data de vencimento
            if (dataInicio) filtered = filtered.filter(d => (d.date || '').split('T')[0] >= dataInicio);
            if (dataFim) filtered = filtered.filter(d => (d.date || '').split('T')[0] <= dataFim);

            // Filtro por status
            if (statusFiltro === 'VENCIDOS') {
                filtered = filtered.filter(d => d.status !== 'PAGO' && (d.date || '').split('T')[0] < hojeLocal);
            } else if (statusFiltro === 'EM_ABERTO') {
                filtered = filtered.filter(d => d.status !== 'PAGO');
            } else if (statusFiltro === 'PAGOS') {
                filtered = filtered.filter(d => d.status === 'PAGO');
            }

            this.comprasFiltradas = filtered;
            this.aplicarOrdenacaoTabela('data', 'desc');
        };

        document.getElementById('btn-aplicar-filtros').addEventListener('click', renderTabela);
        document.getElementById('btn-imprimir-compras').addEventListener('click', () => this.imprimirCompras(despesasComFornecedor));

        // Ordenação
        document.querySelectorAll('#tabela-compras th[data-order]').forEach(th => {
            th.addEventListener('click', () => {
                const orderBy = th.dataset.order;
                const currentDir = th.classList.contains('asc') ? 'asc' : (th.classList.contains('desc') ? 'desc' : 'desc');
                const newDir = currentDir === 'desc' ? 'asc' : 'desc';
                document.querySelectorAll('#tabela-compras th').forEach(t => t.classList.remove('asc', 'desc'));
                th.classList.add(newDir);
                this.aplicarOrdenacaoTabela(orderBy, newDir);
            });
        });

        renderTabela();
    }

    aplicarOrdenacaoTabela(orderBy, orderDir) {
        if (!this.comprasFiltradas) return;
        const sorted = [...this.comprasFiltradas];
        sorted.sort((a, b) => {
            let valA, valB;
            if (orderBy === 'data') {
                valA = a.date || '';
                valB = b.date || '';
            } else if (orderBy === 'fornecedor') {
                valA = a.fornecedor_nome || '';
                valB = b.fornecedor_nome || '';
            } else if (orderBy === 'item') {
                valA = a.item || '';
                valB = b.item || '';
            } else if (orderBy === 'valor') {
                valA = a.custo || 0;
                valB = b.custo || 0;
            } else if (orderBy === 'vencimento') {
                valA = a.date || '';
                valB = b.date || '';
            } else if (orderBy === 'status') {
                valA = a.status || '';
                valB = b.status || '';
            }
            if (orderDir === 'asc') return valA > valB ? 1 : -1;
            else return valA < valB ? 1 : -1;
        });
        this.comprasFiltradas = sorted;
        this.exibirComprasTabela();
    }

    exibirComprasTabela() {
        const tbody = document.getElementById('corpo-tabela-compras');
        if (!tbody) return;
        const hojeLocal = getHojeLocalStr();
        tbody.innerHTML = this.comprasFiltradas.map(comp => {
            const isVencido = comp.status !== 'PAGO' && (comp.date || '').split('T')[0] < hojeLocal;
            let statusText = comp.status === 'PAGO' ? 'PAGO' : (isVencido ? 'VENCIDO' : 'EM ABERTO');
            let statusClass = comp.status === 'PAGO' ? 'bg-green-100 text-green-700' : (isVencido ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700');
            return `
                <tr class="border-b hover:bg-slate-50">
                    <td class="p-3">${formatDate(comp.date)}</td>
                    <td class="p-3 font-medium">${comp.fornecedor_nome || '-'}</td>
                    <td class="p-3">${comp.item || '-'}</td>
                    <td class="p-3 text-right font-bold">${formatMoney(comp.custo)}</td>
                    <td class="p-3">${formatDate(comp.date)}</td>
                    <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${statusClass}">${statusText}</span></td>
                    <td class="p-3 text-center">
                        ${comp.status !== 'PAGO' ? `<button onclick="if(window.fornecedorManager && window.payExpense) payExpense(${comp.id})" class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">Baixar</button>` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async imprimirCompras(todasDespesas) {
        const statusFiltro = document.getElementById('filtro-status-compras').value;
        const dataInicio = document.getElementById('filtro-data-inicio').value;
        const dataFim = document.getElementById('filtro-data-fim').value;
        const fornecedorFiltro = document.getElementById('filtro-fornecedor-compras').value;
        const hojeLocal = getHojeLocalStr();

        let filtered = [...todasDespesas];
        // Apenas MERCADORIA
        filtered = filtered.filter(d => d.tipo_despesa === 'MERCADORIA');

        if (fornecedorFiltro === 'SEM') {
            filtered = filtered.filter(d => !d.fornecedor_id);
        } else if (fornecedorFiltro) {
            const forn = this.fornecedores.find(f => f.id == fornecedorFiltro);
            if (forn) filtered = filtered.filter(d => d.fornecedor_nome === forn.nome);
        }
        if (dataInicio) filtered = filtered.filter(d => (d.date || '').split('T')[0] >= dataInicio);
        if (dataFim) filtered = filtered.filter(d => (d.date || '').split('T')[0] <= dataFim);
        if (statusFiltro === 'VENCIDOS') {
            filtered = filtered.filter(d => d.status !== 'PAGO' && (d.date || '').split('T')[0] < hojeLocal);
        } else if (statusFiltro === 'EM_ABERTO') {
            filtered = filtered.filter(d => d.status !== 'PAGO');
        } else if (statusFiltro === 'PAGOS') {
            filtered = filtered.filter(d => d.status === 'PAGO');
        }

        let total = 0;
        const rows = filtered.map(comp => {
            total += comp.custo;
            const isVencido = comp.status !== 'PAGO' && (comp.date || '').split('T')[0] < hojeLocal;
            let statusText = comp.status === 'PAGO' ? 'PAGO' : (isVencido ? 'VENCIDO' : 'EM ABERTO');
            return `<tr>
                <td style="border:1px solid #ccc; padding:6px;">${formatDate(comp.date)}</td>
                <td style="border:1px solid #ccc; padding:6px;">${comp.fornecedor_nome || '-'}</td>
                <td style="border:1px solid #ccc; padding:6px;">${comp.item || '-'}</td>
                <td style="border:1px solid #ccc; padding:6px; text-align:right;">${formatMoney(comp.custo)}</td>
                <td style="border:1px solid #ccc; padding:6px;">${formatDate(comp.date)}</td>
                <td style="border:1px solid #ccc; padding:6px;">${statusText}</td>
            </tr>`;
        }).join('');

        const html = `
            <div style="font-family:Helvetica; padding:20px;">
                <div style="text-align:center;">
                    <img src="https://i.postimg.cc/52cvrkkP/LOGRVPORTAL.png" style="height:60px;">
                    <h2>RV PORTAL MADEIRAS</h2>
                    <h3>Relatório de Compras de Mercadoria</h3>
                    <p>Período: ${dataInicio || 'início'} a ${dataFim || 'hoje'} | Status: ${statusFiltro}</p>
                </div>
                <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <thead><tr style="background:#eee;"><th>Data</th><th>Fornecedor</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
                    <tbody>${rows}</tbody>
                    <tfoot><tr><td colspan="3" style="text-align:right; font-weight:bold;">TOTAL:</td><td style="text-align:right; font-weight:bold;">${formatMoney(total)}</td><td></td><td></td></tr></tfoot>
                </table>
            </div>
        `;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
}

// Expor globalmente
window.fornecedorManager = null;
window.initFornecedor = function() {
    const container = document.getElementById('view-fornecedor');
    if (container && !container.dataset.fornecedorIniciado) {
        container.dataset.fornecedorIniciado = 'true';
        window.fornecedorManager = new FornecedorManager(container);
    }
};

// Garantir funções auxiliares
if (typeof getNextId === 'undefined') {
    window.getNextId = function(array1, array2 = []) {
        let max = 0;
        array1.forEach(item => { const val = parseInt(item.id); if (!isNaN(val) && val > max) max = val; });
        array2.forEach(item => { const val = parseInt(item.id); if (!isNaN(val) && val > max) max = val; });
        return max + 1;
    };
}
