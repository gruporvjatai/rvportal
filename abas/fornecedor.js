// fornecedor.js – Módulo de gestão de fornecedores e compras
// Depende de: sb (cliente Supabase), showToast, showLoading, formatMoney, formatDate (globais)

let fornecedorState = {
    fornecedores: [],
    compras: [],
    subAbaAtiva: 'cadastro'
};

// Inicialização da aba
window.initFornecedor = async function() {
    const container = document.getElementById('view-fornecedor');
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('hidden-section');
    container.classList.add('active-section');
    
    await carregarFornecedores();
    await carregarCompras();
    
    renderizarInterface();
    mostrarSubAba('cadastro');
};

async function carregarFornecedores() {
    const { data, error } = await sb
        .from('clientes')
        .select('*')
        .eq('tipo', 'FORNECEDOR')
        .order('nome');
    if (error) {
        console.error('Erro ao carregar fornecedores:', error);
        fornecedorState.fornecedores = [];
    } else {
        fornecedorState.fornecedores = data || [];
    }
}

async function carregarCompras() {
    // Buscar despesas (tabela despesas) associadas a fornecedores
    // Vamos relacionar despesas com fornecedores pelo nome (ou futuramente por ID)
    const { data: despesas, error } = await sb
        .from('despesas')
        .select('*')
        .order('data', { ascending: false });
    if (error) {
        console.error('Erro ao carregar despesas:', error);
        fornecedorState.compras = [];
        return;
    }
    
    // Mapear fornecedores por nome (simplificado)
    const fornecedoresMap = new Map();
    fornecedorState.fornecedores.forEach(f => {
        fornecedoresMap.set(f.nome.toLowerCase(), f);
    });
    
    // Filtrar despesas que correspondem a algum fornecedor (ou que tenham observação com "Fornecedor:")
    const compras = [];
    for (const d of despesas) {
        let fornecedorNome = null;
        // Tenta extrair da observação "Fornecedor: ..."
        if (d.observacao && d.observacao.includes('Fornecedor:')) {
            const match = d.observacao.match(/Fornecedor:\s*([^|]+)/);
            if (match) fornecedorNome = match[1].trim();
        }
        // Se não, tenta comparar com algum fornecedor cadastrado
        if (!fornecedorNome) {
            for (const f of fornecedorState.fornecedores) {
                if (d.observacao && d.observacao.toLowerCase().includes(f.nome.toLowerCase())) {
                    fornecedorNome = f.nome;
                    break;
                }
            }
        }
        if (fornecedorNome) {
            compras.push({
                id: d.id,
                fornecedor: fornecedorNome,
                data_lancamento: d.data,
                data_vencimento: d.data, // despesas não têm vencimento separado, usar a mesma data
                valor: d.custo,
                status_pagamento: d.status || 'PENDENTE',
                observacao: d.observacao
            });
        }
    }
    fornecedorState.compras = compras;
}

function renderizarInterface() {
    const container = document.getElementById('view-fornecedor');
    container.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="flex gap-3 mb-5 bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-md border border-emerald-100 w-fit">
                <button data-subaba="cadastro" class="subaba-fornecedor-btn relative px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
                    <i data-lucide="user-plus"></i> <span>Cadastro</span>
                </button>
                <button data-subaba="compras" class="subaba-fornecedor-btn relative px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
                    <i data-lucide="shopping-cart"></i> <span>Compras</span>
                </button>
            </div>
            <div id="subaba-fornecedor-cadastro" class="subaba-fornecedor-content flex-1"></div>
            <div id="subaba-fornecedor-compras" class="subaba-fornecedor-content flex-1 hidden"></div>
        </div>
    `;
    
    // Estilizar botões ativos (inicialmente cadastro)
    atualizarEstiloBotoes('cadastro');
    
    document.querySelectorAll('.subaba-fornecedor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const aba = e.currentTarget.dataset.subaba;
            mostrarSubAba(aba);
        });
    });
}

function atualizarEstiloBotoes(abaAtiva) {
    const botoes = {
        cadastro: document.querySelector('[data-subaba="cadastro"]'),
        compras: document.querySelector('[data-subaba="compras"]')
    };
    const estiloAtivo = 'bg-emerald-600 text-white shadow-md border-transparent';
    const estiloInativo = 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50';
    
    for (const [aba, btn] of Object.entries(botoes)) {
        if (!btn) continue;
        if (aba === abaAtiva) {
            btn.classList.remove(...btn.classList);
            btn.classList.add('subaba-fornecedor-btn', 'relative', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloAtivo.split(' '));
        } else {
            btn.classList.remove(...btn.classList);
            btn.classList.add('subaba-fornecedor-btn', 'relative', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloInativo.split(' '));
        }
    }
}

function mostrarSubAba(aba) {
    fornecedorState.subAbaAtiva = aba;
    atualizarEstiloBotoes(aba);
    
    document.querySelectorAll('.subaba-fornecedor-content').forEach(el => el.classList.add('hidden'));
    const area = document.getElementById(`subaba-fornecedor-${aba}`);
    if (area) area.classList.remove('hidden');
    
    if (aba === 'cadastro') {
        renderizarCadastro(area);
    } else if (aba === 'compras') {
        renderizarCompras(area);
    }
}

// ==================== CADASTRO DE FORNECEDORES ====================
async function renderizarCadastro(container) {
    await carregarFornecedores();
    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-slate-800">Fornecedores</h2>
                <button id="btn-novo-fornecedor" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2">
                    <i data-lucide="plus"></i> Novo Fornecedor
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-slate-700">
                        <tr><th class="p-3">Nome</th><th class="p-3">Contato</th><th class="p-3">Telefone</th><th class="p-3">Documento</th><th class="p-3">IE</th><th class="p-3">CEP</th><th class="p-3">Status</th><th class="p-3 text-center">Ações</th></tr>
                    </thead>
                    <tbody id="fornecedores-list" class="divide-y">
                        ${fornecedorState.fornecedores.map(f => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-3 font-medium">${f.nome}</td>
                                <td class="p-3">${f.contato || '-'}</td>
                                <td class="p-3">${f.telefone || '-'}</td>
                                <td class="p-3">${f.documento || '-'}</td>
                                <td class="p-3">${f.ie || '-'}</td>
                                <td class="p-3">${f.cep || '-'}</td>
                                <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${f.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${f.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                <td class="p-3 text-center">
                                    <button onclick="editarFornecedor('${f.id}')" class="text-indigo-600 hover:text-indigo-800 mr-2"><i data-lucide="edit-3" width="16"></i></button>
                                    <button onclick="toggleFornecedorStatus('${f.id}', ${f.ativo})" class="${f.ativo ? 'text-orange-500' : 'text-green-600'}"><i data-lucide="${f.ativo ? 'ban' : 'check-circle'}" width="16"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('btn-novo-fornecedor').onclick = () => abrirModalFornecedor();
}

function abrirModalFornecedor(fornecedor = null) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4';
    modal.style.backdropFilter = 'blur(2px)';
    const isEdit = !!fornecedor;
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div class="bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
                <h3 class="text-xl font-bold">${isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                <button class="fechar-modal text-white hover:text-emerald-200"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="forn-id" value="${fornecedor?.id || ''}">
                <div><label class="block text-sm font-bold text-slate-700">Nome *</label><input type="text" id="forn-nome" value="${fornecedor?.nome || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">Contato</label><input type="text" id="forn-contato" value="${fornecedor?.contato || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">Telefone</label><input type="text" id="forn-telefone" value="${fornecedor?.telefone || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">CPF/CNPJ</label><input type="text" id="forn-doc" value="${fornecedor?.documento || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">Inscrição Estadual</label><input type="text" id="forn-ie" value="${fornecedor?.ie || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">CEP</label><input type="text" id="forn-cep" value="${fornecedor?.cep || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">Endereço</label><input type="text" id="forn-endereco" value="${fornecedor?.endereco || ''}" class="w-full p-2 border rounded-lg"></div>
                <div><label class="block text-sm font-bold text-slate-700">Ativo</label><select id="forn-ativo" class="w-full p-2 border rounded-lg"><option value="true" ${fornecedor?.ativo !== false ? 'selected' : ''}>Sim</option><option value="false" ${fornecedor?.ativo === false ? 'selected' : ''}>Não</option></select></div>
            </div>
            <div class="p-4 border-t flex gap-3 justify-end">
                <button class="cancelar-modal px-4 py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button>
                <button id="salvar-fornecedor" class="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    lucide.createIcons();
    
    const fechar = () => modal.remove();
    modal.querySelector('.fechar-modal').addEventListener('click', fechar);
    modal.querySelector('.cancelar-modal').addEventListener('click', fechar);
    modal.querySelector('#salvar-fornecedor').addEventListener('click', async () => {
        const payload = {
            nome: document.getElementById('forn-nome').value,
            contato: document.getElementById('forn-contato').value,
            telefone: document.getElementById('forn-telefone').value,
            documento: document.getElementById('forn-doc').value,
            ie: document.getElementById('forn-ie').value,
            cep: document.getElementById('forn-cep').value,
            endereco: document.getElementById('forn-endereco').value,
            ativo: document.getElementById('forn-ativo').value === 'true',
            tipo: 'FORNECEDOR'
        };
        if (!payload.nome) return showToast('Nome é obrigatório', true);
        const id = document.getElementById('forn-id').value;
        let error;
        if (id) {
            const { error: err } = await sb.from('clientes').update(payload).eq('id', id);
            error = err;
        } else {
            const { error: err } = await sb.from('clientes').insert(payload);
            error = err;
        }
        if (error) {
            showToast('Erro ao salvar: ' + error.message, true);
        } else {
            showToast('Fornecedor salvo!');
            fechar();
            await carregarFornecedores();
            renderizarCadastro(document.getElementById('subaba-fornecedor-cadastro'));
        }
    });
}

window.editarFornecedor = async (id) => {
    const f = fornecedorState.fornecedores.find(f => f.id == id);
    if (f) abrirModalFornecedor(f);
};

window.toggleFornecedorStatus = async (id, ativo) => {
    if (!confirm(ativo ? 'Desativar fornecedor?' : 'Reativar fornecedor?')) return;
    const { error } = await sb.from('clientes').update({ ativo: !ativo }).eq('id', id);
    if (error) showToast('Erro: ' + error.message, true);
    else {
        showToast(ativo ? 'Fornecedor desativado' : 'Fornecedor ativado');
        await carregarFornecedores();
        renderizarCadastro(document.getElementById('subaba-fornecedor-cadastro'));
    }
};

// ==================== COMPRAS (CONTAS A PAGAR FORNECEDORES) ====================
let comprasFiltro = {
    status: 'VENCIDOS', // 'TODOS', 'PENDENTES', 'PAGOS'
    startDate: '',
    endDate: '',
    ordenarPor: 'vencimento',
    ordem: 'asc'
};

function renderizarCompras(container) {
    // Definir datas padrão: início do ano até hoje
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const startDefault = inicioAno.toISOString().split('T')[0];
    const endDefault = hoje.toISOString().split('T')[0];
    
    comprasFiltro.startDate = comprasFiltro.startDate || startDefault;
    comprasFiltro.endDate = comprasFiltro.endDate || endDefault;
    
    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border p-6">
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 class="text-xl font-bold text-slate-800">Compras / Contas a Pagar (Fornecedores)</h2>
                <button id="btn-imprimir-compras" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2">
                    <i data-lucide="printer"></i> Imprimir
                </button>
            </div>
            
            <!-- Filtros -->
            <div class="bg-slate-50 p-4 rounded-lg mb-4 flex flex-wrap gap-4 items-end">
                <div>
                    <label class="block text-xs font-bold text-slate-500">Status</label>
                    <select id="filtro-status-compras" class="p-2 border rounded-lg text-sm">
                        <option value="VENCIDOS" ${comprasFiltro.status === 'VENCIDOS' ? 'selected' : ''}>Vencidos (em aberto)</option>
                        <option value="PENDENTES" ${comprasFiltro.status === 'PENDENTES' ? 'selected' : ''}>Em aberto (todos)</option>
                        <option value="PAGOS" ${comprasFiltro.status === 'PAGOS' ? 'selected' : ''}>Pagos</option>
                        <option value="TODOS" ${comprasFiltro.status === 'TODOS' ? 'selected' : ''}>Todos</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500">Data Inicial</label>
                    <input type="date" id="filtro-data-start" value="${comprasFiltro.startDate}" class="p-2 border rounded-lg text-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500">Data Final</label>
                    <input type="date" id="filtro-data-end" value="${comprasFiltro.endDate}" class="p-2 border rounded-lg text-sm">
                </div>
                <div>
                    <button id="btn-aplicar-filtros" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">Filtrar</button>
                </div>
            </div>
            
            <!-- Tabela -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left border" id="tabela-compras">
                    <thead class="bg-slate-100 text-slate-700">
                        <tr>
                            <th class="p-3 cursor-pointer hover:bg-slate-200" data-col="fornecedor">Fornecedor <span class="ordenacao"></span></th>
                            <th class="p-3 cursor-pointer hover:bg-slate-200" data-col="data_lancamento">Lançamento <span class="ordenacao"></span></th>
                            <th class="p-3 cursor-pointer hover:bg-slate-200" data-col="data_vencimento">Vencimento <span class="ordenacao"></span></th>
                            <th class="p-3 cursor-pointer hover:bg-slate-200" data-col="valor">Valor (R$) <span class="ordenacao"></span></th>
                            <th class="p-3 cursor-pointer hover:bg-slate-200" data-col="status_pagamento">Status <span class="ordenacao"></span></th>
                            <th class="p-3">Observação</th>
                        </tr>
                    </thead>
                    <tbody id="compras-list-body">
                        <tr><td colspan="6" class="p-8 text-center text-slate-400">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    lucide.createIcons();
    
    // Aplicar ordenação e filtros
    atualizarTabelaCompras();
    
    // Eventos
    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
        comprasFiltro.startDate = document.getElementById('filtro-data-start').value;
        comprasFiltro.endDate = document.getElementById('filtro-data-end').value;
        comprasFiltro.status = document.getElementById('filtro-status-compras').value;
        atualizarTabelaCompras();
    });
    document.getElementById('btn-imprimir-compras').addEventListener('click', () => imprimirCompras());
    
    // Ordenação nos headers
    document.querySelectorAll('#tabela-compras th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (comprasFiltro.ordenarPor === col) {
                comprasFiltro.ordem = comprasFiltro.ordem === 'asc' ? 'desc' : 'asc';
            } else {
                comprasFiltro.ordenarPor = col;
                comprasFiltro.ordem = 'asc';
            }
            atualizarTabelaCompras();
        });
    });
}

function atualizarTabelaCompras() {
    let dados = [...fornecedorState.compras];
    const hoje = new Date().toISOString().split('T')[0];
    
    // Filtrar por data de vencimento (usando data_vencimento)
    if (comprasFiltro.startDate) {
        dados = dados.filter(c => c.data_vencimento >= comprasFiltro.startDate);
    }
    if (comprasFiltro.endDate) {
        dados = dados.filter(c => c.data_vencimento <= comprasFiltro.endDate);
    }
    
    // Filtrar por status
    if (comprasFiltro.status === 'PAGOS') {
        dados = dados.filter(c => c.status_pagamento === 'PAGO');
    } else if (comprasFiltro.status === 'PENDENTES') {
        dados = dados.filter(c => c.status_pagamento !== 'PAGO');
    } else if (comprasFiltro.status === 'VENCIDOS') {
        dados = dados.filter(c => c.status_pagamento !== 'PAGO' && c.data_vencimento < hoje);
    }
    // 'TODOS' não filtra
    
    // Ordenar
    const ordem = comprasFiltro.ordem === 'asc' ? 1 : -1;
    dados.sort((a, b) => {
        let valA = a[comprasFiltro.ordenarPor];
        let valB = b[comprasFiltro.ordenarPor];
        if (comprasFiltro.ordenarPor === 'valor') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else if (comprasFiltro.ordenarPor === 'data_lancamento' || comprasFiltro.ordenarPor === 'data_vencimento') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }
        if (valA < valB) return -1 * ordem;
        if (valA > valB) return 1 * ordem;
        return 0;
    });
    
    const tbody = document.getElementById('compras-list-body');
    if (!tbody) return;
    
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhuma compra encontrada.</td></tr>';
        return;
    }
    
    const hojeStr = hoje;
    tbody.innerHTML = dados.map(c => {
        const isVencido = c.status_pagamento !== 'PAGO' && c.data_vencimento < hojeStr;
        const rowClass = isVencido ? 'bg-red-50' : (c.status_pagamento === 'PAGO' ? 'bg-green-50' : '');
        let statusText = c.status_pagamento === 'PAGO' ? 'Pago' : (isVencido ? 'Vencido' : 'Em aberto');
        let statusClass = c.status_pagamento === 'PAGO' ? 'text-green-700 bg-green-100' : (isVencido ? 'text-red-700 bg-red-100' : 'text-yellow-700 bg-yellow-100');
        return `
            <tr class="hover:bg-slate-50 ${rowClass}">
                <td class="p-3 font-medium">${c.fornecedor}</td>
                <td class="p-3">${formatDate(c.data_lancamento)}</td>
                <td class="p-3">${formatDate(c.data_vencimento)}</td>
                <td class="p-3 font-bold">${formatMoney(c.valor)}</td>
                <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass}">${statusText}</span></td>
                <td class="p-3 text-xs text-slate-500">${c.observacao || '-'}</td>
            </tr>
        `;
    }).join('');
    
    // Atualizar ícones de ordenação nos cabeçalhos
    document.querySelectorAll('#tabela-compras th[data-col] .ordenacao').forEach(span => span.innerHTML = '');
    const colAtiva = comprasFiltro.ordenarPor;
    const thAtivo = document.querySelector(`#tabela-compras th[data-col="${colAtiva}"] .ordenacao`);
    if (thAtivo) thAtivo.innerHTML = comprasFiltro.ordem === 'asc' ? ' ▲' : ' ▼';
}

function imprimirCompras() {
    const dados = [];
    document.querySelectorAll('#compras-list-body tr').forEach(tr => {
        if (tr.cells.length < 6) return;
        dados.push({
            fornecedor: tr.cells[0].innerText,
            lancamento: tr.cells[1].innerText,
            vencimento: tr.cells[2].innerText,
            valor: tr.cells[3].innerText,
            status: tr.cells[4].innerText,
            obs: tr.cells[5].innerText
        });
    });
    
    if (dados.length === 0) return showToast('Nenhum dado para imprimir', true);
    
    const html = `
        <div style="font-family: Helvetica; padding: 20px; max-width: 1000px; margin: auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://i.postimg.cc/52cvrkkP/LOGRVPORTAL.png" style="height: 60px;">
                <h2 style="color: #059669;">RV PORTAL MADEIRAS</h2>
                <h3>Relatório de Compras / Contas a Pagar (Fornecedores)</h3>
                <p>Filtros: Status ${comprasFiltro.status} | Período: ${formatDate(comprasFiltro.startDate)} até ${formatDate(comprasFiltro.endDate)}</p>
            </div>
            <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse: collapse;">
                <thead><tr style="background:#eee;"><th>Fornecedor</th><th>Lançamento</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Observação</th></tr></thead>
                <tbody>
                    ${dados.map(d => `
                        <tr>
                            <td>${d.fornecedor}</td>
                            <td>${d.lancamento}</td>
                            <td>${d.vencimento}</td>
                            <td align="right">${d.valor}</td>
                            <td>${d.status}</td>
                            <td>${d.obs}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// Expor funções globalmente
window.initFornecedor = initFornecedor;
window.editarFornecedor = editarFornecedor;
window.toggleFornecedorStatus = toggleFornecedorStatus;
