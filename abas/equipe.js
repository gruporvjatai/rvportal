// ========== FUNÇÕES DA EQUIPE ==========================================================================================================================================

function toggleTipoRemuneracao() {
    const tipo = document.getElementById('func-tipo').value;
    document.getElementById('func-valor-mensal-container').classList.toggle('hidden', tipo !== 'mensal');
    document.getElementById('func-valor-diaria-container').classList.toggle('hidden', tipo !== 'diaria');
    document.getElementById('func-valor-producao-container').classList.toggle('hidden', tipo !== 'producao');
}

function openFuncionarioForm(id = null) {
    document.getElementById('funcionario-form-container').classList.remove('hidden');
    if (id) {
        const f = STATE.funcionarios.find(x => String(x.id) === String(id));
        if (f) {
            document.getElementById('func-id').value = f.id;
            document.getElementById('func-nome').value = f.nome;
            document.getElementById('func-telefone').value = f.telefone || '';
            document.getElementById('func-documento').value = f.documento || '';
            document.getElementById('func-endereco').value = f.endereco || '';
            document.getElementById('func-data-admissao').value = f.data_admissao || '';
            document.getElementById('func-tipo').value = f.tipo_remuneracao;
            document.getElementById('func-valor-mensal').value = f.valor_mensal || '';
            document.getElementById('func-valor-diaria').value = f.valor_diaria || '';
            document.getElementById('func-valor-producao').value = f.valor_producao || '';
            document.getElementById('func-pix').value = f.chave_pix || '';
            document.getElementById('func-ativo').checked = f.ativo;
            toggleTipoRemuneracao();
        }
    } else {
        document.getElementById('func-id').value = '';
        document.getElementById('func-nome').value = '';
        document.getElementById('func-telefone').value = '';
        document.getElementById('func-documento').value = '';
        document.getElementById('func-endereco').value = '';
        document.getElementById('func-data-admissao').value = '';
        document.getElementById('func-tipo').value = 'mensal';
        document.getElementById('func-valor-mensal').value = STATE.configPadrao.salario_mensal_padrao || '';
        document.getElementById('func-valor-diaria').value = STATE.configPadrao.valor_diaria_padrao || '';
        document.getElementById('func-valor-producao').value = STATE.configPadrao.valor_producao_padrao || '';
        document.getElementById('func-pix').value = '';
        document.getElementById('func-ativo').checked = true;
        toggleTipoRemuneracao();
    }
}

function closeFuncionarioForm() {
    document.getElementById('funcionario-form-container').classList.add('hidden');
}

async function saveFuncionario(e) {
    e.preventDefault();
    showLoading(true);
    const isNew = !document.getElementById('func-id').value;
    const newId = isNew ? getNextId(STATE.funcionarios) : document.getElementById('func-id').value;
    const tipo = document.getElementById('func-tipo').value;

    const payload = {
        id: newId,
        nome: document.getElementById('func-nome').value,
        telefone: document.getElementById('func-telefone').value,
        documento: document.getElementById('func-documento').value,
        endereco: document.getElementById('func-endereco').value,
        data_admissao: document.getElementById('func-data-admissao').value,
        tipo_remuneracao: tipo,
        valor_mensal: tipo === 'mensal' ? parseFloat(document.getElementById('func-valor-mensal').value) || 0 : null,
        valor_diaria: tipo === 'diaria' ? parseFloat(document.getElementById('func-valor-diaria').value) || 0 : null,
        valor_producao: tipo === 'producao' ? parseFloat(document.getElementById('func-valor-producao').value) || 0 : null,
        chave_pix: document.getElementById('func-pix').value,
        ativo: document.getElementById('func-ativo').checked
    };

    const { error } = await sb.from('rvp_funcionarios').upsert(payload);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    closeFuncionarioForm();
    showToast("Funcionário salvo!");
    loadData();
}

async function toggleFuncionarioStatus(id, currentStatus) {
    if (!confirm(currentStatus ? "Desativar funcionário?" : "Reativar funcionário?")) return;
    showLoading(true);
    const { error } = await sb.from('rvp_funcionarios').update({ ativo: !currentStatus }).eq('id', id);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    showToast(currentStatus ? "Funcionário desativado" : "Funcionário reativado");
    loadData();
}

function openValeModal(funcId) {
    document.getElementById('vale-func-id').value = funcId;
    document.getElementById('vale-data').value = getHojeLocalStr();
    document.getElementById('vale-valor').value = '';
    document.getElementById('vale-obs').value = '';
    document.getElementById('vale-modal').classList.remove('hidden');
}

function closeValeModal() {
    document.getElementById('vale-modal').classList.add('hidden');
}

async function salvarVale() {
    const funcId = document.getElementById('vale-func-id').value;
    const data = document.getElementById('vale-data').value;
    const valor = parseFloat(document.getElementById('vale-valor').value);
    if (!funcId || !data || !valor) return showToast("Preencha todos os campos", true);
    showLoading(true);
    const newId = getNextId(STATE.vales);
    const { error } = await sb.from('rvp_vales').insert([{
        id: newId,
        funcionario_id: funcId,
        data,
        valor,
        observacao: document.getElementById('vale-obs').value
    }]);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    closeValeModal();
    showToast("Vale lançado!");
    loadData();
}

// ========== NOVAS FUNÇÕES DE FECHAMENTO ==========

let producaoItemsTemp = []; // guarda itens de produção durante a edição do modal

// Abre o modal de fechamento conforme o tipo de remuneração
function openFechamento(funcId) {
    const func = STATE.funcionarios.find(f => String(f.id) === String(funcId));
    if (!func) return;
    const modal = document.getElementById('fechamento-modal');
    document.getElementById('fechamento-titulo').innerText = `Fechamento - ${func.nome}`;
    const conteudo = document.getElementById('fechamento-conteudo');
    const actions = document.getElementById('fechamento-actions');
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0-based
    const anoAtual = hoje.getFullYear();
    const primeiroDia = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];
    
    if (func.tipo_remuneracao === 'mensal') {
        // Filtro padrão mês atual
        const valesMes = STATE.vales.filter(v => v.funcionario_id == funcId && v.data >= primeiroDia && v.data <= ultimoDia);
        const totalVales = valesMes.reduce((s, v) => s + Number(v.valor), 0);
        const salario = func.valor_mensal || 0;
        const liquido = salario - totalVales;
        conteudo.innerHTML = `
            <div class="space-y-4">
                <div class="flex gap-4 items-end">
                    <div>
                        <label class="text-xs font-bold">Período (mês/ano)</label>
                        <input type="month" id="fech-mes" value="${anoAtual}-${String(mesAtual+1).padStart(2,'0')}" class="border rounded p-2">
                    </div>
                    <button onclick="atualizarFechamentoMensal('${funcId}')" class="p-2 bg-slate-200 rounded">Atualizar</button>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="bg-gray-50 p-3 rounded">
                        <span class="text-gray-500">Salário base</span><br>
                        <strong>${formatMoney(salario)}</strong>
                    </div>
                    <div class="bg-red-50 p-3 rounded">
                        <span class="text-red-600">Total em vales</span><br>
                        <strong>${formatMoney(totalVales)}</strong>
                    </div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <span class="text-green-800 font-bold text-lg">Líquido a Pagar: ${formatMoney(liquido)}</span>
                </div>
                ${valesMes.length ? `<details class="text-xs"><summary>Detalhes dos vales</summary><ul class="list-disc pl-5">${valesMes.map(v => `<li>${formatDate(v.data)} - ${formatMoney(v.valor)} ${v.observacao ? '('+v.observacao+')' : ''}</li>`).join('')}</ul></details>` : ''}
            </div>
        `;
        actions.innerHTML = `
            <button onclick="gerarReciboMensal('${funcId}')" class="flex-1 py-2 bg-indigo-600 text-white rounded font-bold"><i data-lucide="printer" class="w-4 h-4 inline"></i> Recibo</button>
            <button onclick="lancarPagamentoMensal('${funcId}')" class="flex-1 py-2 bg-emerald-600 text-white rounded font-bold"><i data-lucide="check-circle" class="w-4 h-4 inline"></i> Lançar Pagamento</button>
            <button onclick="closeFechamentoModal()" class="flex-1 py-2 bg-slate-200 rounded font-bold">Cancelar</button>
        `;
    } else if (func.tipo_remuneracao === 'diaria') {
        // Determinar última data de pagamento (da tabela rvp_pagamentos)
        const ultimosPag = STATE.pagamentos.filter(p => p.funcionario_id == funcId).sort((a,b) => b.data_pagamento.localeCompare(a.data_pagamento));
        let dataInicio = primeiroDia;
        if (ultimosPag.length) {
            // próximo dia após o último pagamento
            const dt = new Date(ultimosPag[0].data_pagamento + 'T00:00:00');
            dt.setDate(dt.getDate() + 1);
            dataInicio = dt.toISOString().split('T')[0];
        }
        const dataFim = getHojeLocalStr();
        const diariasReg = STATE.diarias.filter(d => d.funcionario_id == funcId && d.data >= dataInicio && d.data <= dataFim);
        const totalDias = diariasReg.length;
        const valorDiaria = func.valor_diaria || 0;
        const total = totalDias * valorDiaria;
        conteudo.innerHTML = `
            <div class="space-y-4">
                <div class="flex gap-4 items-end">
                    <div>
                        <label class="text-xs font-bold">De</label>
                        <input type="date" id="fech-di-inicio" value="${dataInicio}" class="border rounded p-2">
                    </div>
                    <div>
                        <label class="text-xs font-bold">Até</label>
                        <input type="date" id="fech-di-fim" value="${dataFim}" class="border rounded p-2">
                    </div>
                    <button onclick="atualizarFechamentoDiaria('${funcId}')" class="p-2 bg-slate-200 rounded">Atualizar</button>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <label class="text-xs font-bold">Dias trabalhados</label>
                        <input type="number" id="fech-di-dias" value="${totalDias}" class="w-full border rounded p-2" onchange="recalcularDiaria()">
                    </div>
                    <div>
                        <label class="text-xs font-bold">Valor da diária (R$)</label>
                        <input type="number" id="fech-di-valor" value="${valorDiaria}" step="0.01" class="w-full border rounded p-2" onchange="recalcularDiaria()">
                    </div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-lg font-bold text-green-800" id="fech-di-total">Total: ${formatMoney(total)}</div>
            </div>
        `;
        actions.innerHTML = `
            <button onclick="gerarReciboDiaria('${funcId}')" class="flex-1 py-2 bg-indigo-600 text-white rounded font-bold"><i data-lucide="printer" class="w-4 h-4 inline"></i> Recibo</button>
            <button onclick="lancarPagamentoDiaria('${funcId}')" class="flex-1 py-2 bg-emerald-600 text-white rounded font-bold"><i data-lucide="check-circle" class="w-4 h-4 inline"></i> Lançar Pagamento</button>
            <button onclick="closeFechamentoModal()" class="flex-1 py-2 bg-slate-200 rounded font-bold">Cancelar</button>
        `;
    } else if (func.tipo_remuneracao === 'producao') {
        producaoItemsTemp = []; // reseta
        const producoesMes = STATE.producoes ? STATE.producoes.filter(p => p.funcionario_id == funcId && p.data >= primeiroDia && p.data <= ultimoDia) : [];
        let totalProducao = producoesMes.reduce((s, p) => s + Number(p.valor_total), 0);
        conteudo.innerHTML = `
            <div class="space-y-4">
                <div class="flex gap-4 items-end">
                    <div>
                        <label class="text-xs font-bold">Mês/Ano</label>
                        <input type="month" id="fech-prod-mes" value="${anoAtual}-${String(mesAtual+1).padStart(2,'0')}" class="border rounded p-2">
                    </div>
                    <button onclick="adicionarItemProducaoModal()" class="p-2 bg-emerald-600 text-white rounded flex items-center gap-1"><i data-lucide="plus" class="w-4 h-4"></i> Adicionar Item</button>
                </div>
                <div id="fech-prod-lista" class="space-y-2 max-h-60 overflow-y-auto">
                    ${producoesMes.map(p => `
                        <div class="flex justify-between items-center border p-2 rounded">
                            <div>
                                <span class="font-bold">${p.descricao}</span> - ${p.quantidade} un x ${formatMoney(p.valor_unitario)}
                            </div>
                            <span class="font-bold text-emerald-600">${formatMoney(p.valor_total)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-lg font-bold text-green-800" id="fech-prod-total">Total: ${formatMoney(totalProducao)}</div>
            </div>
        `;
        actions.innerHTML = `
            <button onclick="gerarReciboProducao('${funcId}')" class="flex-1 py-2 bg-indigo-600 text-white rounded font-bold"><i data-lucide="printer" class="w-4 h-4 inline"></i> Recibo</button>
            <button onclick="lancarPagamentoProducao('${funcId}')" class="flex-1 py-2 bg-emerald-600 text-white rounded font-bold"><i data-lucide="check-circle" class="w-4 h-4 inline"></i> Lançar Pagamento</button>
            <button onclick="closeFechamentoModal()" class="flex-1 py-2 bg-slate-200 rounded font-bold">Cancelar</button>
        `;
    }
    modal.classList.remove('hidden');
    lucide.createIcons();
}

function closeFechamentoModal() {
    document.getElementById('fechamento-modal').classList.add('hidden');
}

// Atualiza fechamento mensal ao alterar o mês
async function atualizarFechamentoMensal(funcId) {
    const mesInput = document.getElementById('fech-mes').value; // yyyy-mm
    if (!mesInput) return;
    const [ano, mes] = mesInput.split('-').map(Number);
    const primeiroDia = new Date(ano, mes-1, 1).toISOString().split('T')[0];
    const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];
    const valesMes = STATE.vales.filter(v => v.funcionario_id == funcId && v.data >= primeiroDia && v.data <= ultimoDia);
    const totalVales = valesMes.reduce((s, v) => s + Number(v.valor), 0);
    const func = STATE.funcionarios.find(f => f.id == funcId);
    const salario = func.valor_mensal || 0;
    const liquido = salario - totalVales;
    // Atualizar valores na tela sem recriar todo o modal (simples)
    const conteudo = document.getElementById('fechamento-conteudo');
    conteudo.innerHTML = conteudo.innerHTML.replace(/<span class="text-green-800 font-bold text-lg">.*?<\/span>/, `<span class="text-green-800 font-bold text-lg">Líquido a Pagar: ${formatMoney(liquido)}</span>`);
    // Poderíamos recriar, mas para simplificar faremos reload com openFechamento novamente
    openFechamento(funcId);
}

// Recalcular diária ao mudar dias ou valor
function recalcularDiaria() {
    const dias = parseInt(document.getElementById('fech-di-dias').value) || 0;
    const valor = parseFloat(document.getElementById('fech-di-valor').value) || 0;
    const total = dias * valor;
    document.getElementById('fech-di-total').innerText = `Total: ${formatMoney(total)}`;
}

// Atualizar fechamento diária ao clicar "Atualizar"
async function atualizarFechamentoDiaria(funcId) {
    const inicio = document.getElementById('fech-di-inicio').value;
    const fim = document.getElementById('fech-di-fim').value;
    if (!inicio || !fim) return;
    const diariasReg = STATE.diarias.filter(d => d.funcionario_id == funcId && d.data >= inicio && d.data <= fim);
    const totalDias = diariasReg.length;
    document.getElementById('fech-di-dias').value = totalDias;
    recalcularDiaria();
}

// ========== PRODUÇÃO - Adicionar item ==========
function adicionarItemProducaoModal() {
    document.getElementById('producao-item-modal').classList.remove('hidden');
    document.getElementById('prod-item-desc').value = '';
    document.getElementById('prod-item-qtd').value = '';
    document.getElementById('prod-item-valor').value = '';
}

function adicionarItemProducao() {
    const desc = document.getElementById('prod-item-desc').value;
    const qtd = parseFloat(document.getElementById('prod-item-qtd').value);
    const valorUnit = parseFloat(document.getElementById('prod-item-valor').value);
    if (!desc || !qtd || !valorUnit) return showToast("Preencha todos os campos", true);
    producaoItemsTemp.push({ descricao: desc, quantidade: qtd, valor_unitario: valorUnit, valor_total: qtd * valorUnit });
    document.getElementById('producao-item-modal').classList.add('hidden');
    atualizarListaProducao();
}

function atualizarListaProducao() {
    const listaDiv = document.getElementById('fech-prod-lista');
    if (!listaDiv) return;
    const total = producaoItemsTemp.reduce((s, p) => s + p.valor_total, 0);
    listaDiv.innerHTML = producaoItemsTemp.map(p => `
        <div class="flex justify-between items-center border p-2 rounded">
            <div>
                <span class="font-bold">${p.descricao}</span> - ${p.quantidade} un x ${formatMoney(p.valor_unitario)}
            </div>
            <span class="font-bold text-emerald-600">${formatMoney(p.valor_total)}</span>
        </div>
    `).join('');
    document.getElementById('fech-prod-total').innerText = `Total: ${formatMoney(total)}`;
}

// ========== LANÇAR PAGAMENTO (cria despesa pendente) ==========
async function lancarPagamentoMensal(funcId) {
    await lancarPagamentoGenerico(funcId, 'mensal');
}
async function lancarPagamentoDiaria(funcId) {
    await lancarPagamentoGenerico(funcId, 'diaria');
}
async function lancarPagamentoProducao(funcId) {
    await lancarPagamentoGenerico(funcId, 'producao');
}

async function lancarPagamentoGenerico(funcId, tipo) {
    const func = STATE.funcionarios.find(f => f.id == funcId);
    if (!func) return;
    let valor = 0;
    let descricao = "";
    const hoje = getHojeLocalStr();
    if (tipo === 'mensal') {
        const mesInput = document.getElementById('fech-mes').value;
        const [ano, mes] = mesInput.split('-').map(Number);
        const primeiroDia = new Date(ano, mes-1, 1).toISOString().split('T')[0];
        const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];
        const valesMes = STATE.vales.filter(v => v.funcionario_id == funcId && v.data >= primeiroDia && v.data <= ultimoDia);
        const totalVales = valesMes.reduce((s, v) => s + Number(v.valor), 0);
        valor = func.valor_mensal - totalVales;
        descricao = `Salário mensal ${mesInput}`;
    } else if (tipo === 'diaria') {
        const dias = parseInt(document.getElementById('fech-di-dias').value) || 0;
        const valorDiaria = parseFloat(document.getElementById('fech-di-valor').value) || 0;
        valor = dias * valorDiaria;
        const inicio = document.getElementById('fech-di-inicio').value;
        const fim = document.getElementById('fech-di-fim').value;
        descricao = `Diárias ${inicio} a ${fim}`;
    } else if (tipo === 'producao') {
        valor = producaoItemsTemp.reduce((s, p) => s + p.valor_total, 0);
        descricao = `Produção mês ${document.getElementById('fech-prod-mes').value}`;
        // Salvar itens de produção no banco
        const newIdBase = getNextId(STATE.producoes || []);
        const inserts = producaoItemsTemp.map((p, idx) => ({
            id: newIdBase + idx,
            funcionario_id: funcId,
            data: hoje,
            descricao: p.descricao,
            quantidade: p.quantidade,
            valor_unitario: p.valor_unitario,
            valor_total: p.valor_total
        }));
        await sb.from('rvp_producao').insert(inserts);
    }
    if (valor <= 0) return showToast("Valor inválido", true);
    showLoading(true);
    // Inserir na despesa (contas a pagar)
    const despId = getNextId(STATE.expenses);
    const { error } = await sb.from('despesas').insert([{
        id: despId,
        item: `Pagamento - ${func.nome}`,
        quantidade: 1,
        unidade: 'Un',
        custo: valor,
        data: hoje,
        observacao: descricao + (func.chave_pix ? ` | PIX: ${func.chave_pix}` : ''),
        status: 'PENDENTE'
    }]);
    if (error) { showLoading(false); return showToast("Erro ao criar despesa: " + error.message, true); }
    // Registrar pagamento histórico
    const pagId = getNextId(STATE.pagamentos);
    await sb.from('rvp_pagamentos').insert([{
        id: pagId,
        funcionario_id: funcId,
        data_pagamento: hoje,
        valor_total: valor,
        descontos: 0,
        valor_liquido: valor,
        observacao: descricao
    }]);
    closeFechamentoModal();
    showToast("Pagamento lançado como pendente no financeiro!");
    loadData();
}

// ========== RECIBOS (impressão 2 vias em A4) ==========
function gerarReciboMensal(funcId) {
    const func = STATE.funcionarios.find(f => f.id == funcId);
    const mesInput = document.getElementById('fech-mes').value;
    const [ano, mes] = mesInput.split('-').map(Number);
    const primeiroDia = new Date(ano, mes-1, 1).toISOString().split('T')[0];
    const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];
    const valesMes = STATE.vales.filter(v => v.funcionario_id == funcId && v.data >= primeiroDia && v.data <= ultimoDia);
    const totalVales = valesMes.reduce((s, v) => s + Number(v.valor), 0);
    const liquido = func.valor_mensal - totalVales;
    const conteudo = `
        <div style="font-family: Arial; padding: 10px; border-bottom: 1px dashed #999; margin-bottom: 20px;">
            <strong>RECIBO DE PAGAMENTO (1ª via)</strong><br><br>
            Funcionário: ${func.nome}<br>
            Período: ${mesInput}<br>
            Salário: ${formatMoney(func.valor_mensal)} - Vales: ${formatMoney(totalVales)}<br>
            <strong>Líquido: ${formatMoney(liquido)}</strong><br>
            Data: ${getHojeLocalStr()}<br><br>
            Assinatura: _________________________
        </div>
        <div style="font-family: Arial; padding: 10px;">
            <strong>RECIBO DE PAGAMENTO (2ª via)</strong><br><br>
            Funcionário: ${func.nome}<br>
            Período: ${mesInput}<br>
            Salário: ${formatMoney(func.valor_mensal)} - Vales: ${formatMoney(totalVales)}<br>
            <strong>Líquido: ${formatMoney(liquido)}</strong><br>
            Data: ${getHojeLocalStr()}<br><br>
            Assinatura: _________________________
        </div>
    `;
    imprimirRecibo(conteudo);
}

function gerarReciboDiaria(funcId) {
    const func = STATE.funcionarios.find(f => f.id == funcId);
    const dias = document.getElementById('fech-di-dias').value;
    const valorDiaria = document.getElementById('fech-di-valor').value;
    const total = dias * valorDiaria;
    const inicio = document.getElementById('fech-di-inicio').value;
    const fim = document.getElementById('fech-di-fim').value;
    const conteudo = `
        <div style="font-family: Arial; padding: 10px; border-bottom: 1px dashed #999; margin-bottom: 20px;">
            <strong>RECIBO DE PAGAMENTO (1ª via)</strong><br><br>
            Funcionário: ${func.nome}<br>
            Período: ${inicio} a ${fim}<br>
            Dias trabalhados: ${dias} x ${formatMoney(valorDiaria)}<br>
            <strong>Total: ${formatMoney(total)}</strong><br>
            Data: ${getHojeLocalStr()}<br><br>
            Assinatura: _________________________
        </div>
        <div style="font-family: Arial; padding: 10px;">
            <strong>RECIBO DE PAGAMENTO (2ª via)</strong><br><br>
            Funcionário: ${func.nome}<br>
            Período: ${inicio} a ${fim}<br>
            Dias trabalhados: ${dias} x ${formatMoney(valorDiaria)}<br>
            <strong>Total: ${formatMoney(total)}</strong><br>
            Data: ${getHojeLocalStr()}<br><br>
            Assinatura: _________________________
        </div>
    `;
    imprimirRecibo(conteudo);
}

function gerarReciboProducao(funcId) {
    const func = STATE.funcionarios.find(f => f.id == funcId);
    const total = producaoItemsTemp.reduce((s, p) => s + p.valor_total, 0);
    const mes = document.getElementById('fech-prod-mes').value;
    let itensHtml = producaoItemsTemp.map(p => `<tr><td>${p.descricao}</td><td>${p.quantidade}</td><td>${formatMoney(p.valor_unitario)}</td><td>${formatMoney(p.valor_total)}</td></tr>`).join('');
    const conteudo = `
        <div style="font-family: Arial; padding: 10px; border-bottom: 1px dashed #999; margin-bottom: 20px;">
            <strong>RECIBO DE PAGAMENTO (1ª via)</strong><br><br>
            Funcionário: ${func.nome}<br>
            Mês: ${mes}<br>
            <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
                <tr><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr>
                ${itensHtml}
            </table>
            <strong>Total: ${formatMoney(total)}</strong><br>
            Data: ${getHojeLocalStr()}<br><br>
            Assinatura: _________________________
        </div>
        <div style="font-family: Arial; padding: 10px;">
            <strong>RECIBO DE PAGAMENTO (2ª via)</strong><br><br>
            Funcionário: ${func.nome}<br>
            Mês: ${mes}<br>
            <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
                <tr><th>Descrição</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr>
                ${itensHtml}
            </table>
            <strong>Total: ${formatMoney(total)}</strong><br>
            Data: ${getHojeLocalStr()}<br><br>
            Assinatura: _________________________
        </div>
    `;
    imprimirRecibo(conteudo);
}

function imprimirRecibo(htmlContent) {
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = htmlContent;
    setTimeout(() => window.print(), 300);
}

// ========== IMPRIMIR FOLHA DE PAGAMENTOS PENDENTES ==========
async function imprimirFolhaEquipe() {
    // Buscar despesas pendentes com referência a funcionário (item começando com "Pagamento - ")
    const despesasPendentes = STATE.expenses.filter(e => e.status === 'PENDENTE' && e.item.startsWith('Pagamento - '));
    if (despesasPendentes.length === 0) return showToast("Nenhum pagamento pendente encontrado.", true);
    
    // Mapear para obter nome, tipo e pix do funcionário
    const rows = await Promise.all(despesasPendentes.map(async (d) => {
        const match = d.item.match(/Pagamento - (.+)/);
        const nome = match ? match[1] : 'Desconhecido';
        const func = STATE.funcionarios.find(f => f.nome === nome);
        const tipo = func ? func.tipo_remuneracao : '-';
        const pix = func ? func.chave_pix || '-' : '-';
        // extrair período da observacao
        const observacao = d.observacao || '';
        return `
            <tr>
                <td>${nome}</td>
                <td>${tipo}</td>
                <td>${observacao}</td>
                <td>${formatMoney(d.custo)}</td>
                <td>${pix}</td>
            </tr>
        `;
    }));
    
    const total = despesasPendentes.reduce((s, d) => s + d.custo, 0);
    const html = `
        <div style="font-family: Arial; padding: 20px;">
            <h2>Folha de Pagamentos Pendentes</h2>
            <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr><th>Funcionário</th><th>Tipo</th><th>Referência</th><th>Valor</th><th>PIX</th></tr>
                </thead>
                <tbody>${rows.join('')}</tbody>
                <tfoot>
                    <tr><td colspan="4" align="right"><strong>Total</strong></td><td><strong>${formatMoney(total)}</strong></td></tr>
                </tfoot>
            </table>
        </div>
    `;
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = html;
    setTimeout(() => window.print(), 300);
}

// ========== RENDER EQUIPE (com novas colunas) ==========
function renderEquipe(forceRefresh = false) {
    const tbody = document.getElementById('equipe-list');
    if (!tbody) return;

    let filtrado = [...STATE.funcionarios];

    const search = document.getElementById('equipe-search')?.value.toLowerCase() || '';
    const status = document.getElementById('equipe-status-filter')?.value;
    const dataIni = document.getElementById('equipe-data-inicio')?.value;
    const dataFim = document.getElementById('equipe-data-fim')?.value;

    if (search) {
        filtrado = filtrado.filter(f => 
            f.nome.toLowerCase().includes(search) || 
            (f.telefone && f.telefone.includes(search)) || 
            (f.documento && f.documento.includes(search))
        );
    }
    if (status === 'ativos') filtrado = filtrado.filter(f => f.ativo);
    else if (status === 'inativos') filtrado = filtrado.filter(f => !f.ativo);
    if (dataIni) filtrado = filtrado.filter(f => f.data_admissao >= dataIni);
    if (dataFim) filtrado = filtrado.filter(f => f.data_admissao <= dataFim);

    // Calcular vales do mês atual e valor a pagar (apenas para mensais, senão exibe '-')
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const primeiroDia = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];

    filtrado = filtrado.map(f => {
        let valesMes = 0;
        let faltaPagar = '-';
        if (f.tipo_remuneracao === 'mensal' && f.ativo) {
            const vales = STATE.vales.filter(v => v.funcionario_id == f.id && v.data >= primeiroDia && v.data <= ultimoDia);
            valesMes = vales.reduce((s, v) => s + Number(v.valor), 0);
            const salario = Number(f.valor_mensal) || 0;
            faltaPagar = salario - valesMes;
        }
        return { ...f, valesMes, faltaPagar };
    });

    filtrado.sort((a,b) => a.nome.localeCompare(b.nome));

    if (filtrado.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400">Nenhum funcionário encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = filtrado.map(f => {
        const tipoLabel = { mensal: 'Mensal', diaria: 'Diarista', producao: 'Produção' }[f.tipo_remuneracao] || f.tipo_remuneracao;
        const statusBadge = f.ativo 
            ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Ativo</span>'
            : '<span class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Inativo</span>';
        
        const whatsappLink = f.telefone ? `https://wa.me/55${f.telefone.replace(/\D/g,'')}` : '#';
        
        return `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-bold text-slate-700">${f.nome}</td>
            <td class="p-4 text-xs uppercase">${tipoLabel}</td>
            <td class="p-4 text-sm">${f.telefone || '-'}</td>
            <td class="p-4 text-xs">${f.data_admissao ? formatDate(f.data_admissao) : '-'}</td>
            <td class="p-4 text-right font-mono">${f.tipo_remuneracao === 'mensal' ? formatMoney(f.valesMes) : '-'}</td>
            <td class="p-4 text-right font-mono">${f.tipo_remuneracao === 'mensal' ? formatMoney(f.faltaPagar) : '-'}</td>
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4">
                <div class="flex items-center justify-center gap-1 flex-wrap">
                    <button onclick="openFechamento('${f.id}')" class="p-2 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 flex items-center gap-1" title="Calcular"><i data-lucide="calculator" class="w-4 h-4"></i> <span class="text-xs font-bold">Calcular</span></button>
                    <button onclick="openValeModal('${f.id}')" class="p-2 bg-amber-100 text-amber-700 rounded flex items-center gap-1" title="Vale"><i data-lucide="banknote" class="w-4 h-4"></i> <span class="text-xs font-bold">Vale</span></button>
                    <button onclick="alert('Contrato em breve')" class="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Contrato"><i data-lucide="file-text" class="w-4 h-4"></i></button>
                    <button onclick="openFuncionarioForm('${f.id}')" class="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200" title="Editar"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="toggleFuncionarioStatus('${f.id}', ${f.ativo})" class="p-2 ${f.ativo ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'} rounded" title="${f.ativo ? 'Desativar' : 'Ativar'}"><i data-lucide="${f.ativo ? 'ban' : 'check-circle'}" class="w-4 h-4"></i></button>
                    <a href="${whatsappLink}" target="_blank" class="p-2 bg-green-100 text-green-600 rounded ${!f.telefone ? 'opacity-50 pointer-events-none' : ''}" title="WhatsApp"><i data-lucide="message-circle" class="w-4 h-4"></i></a>
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

// Inicializar STATE.producoes ao carregar os dados
// (deve ser adicionado na função loadData() do arquivo principal, mas colocamos uma chamada extra aqui)
// Vamos garantir que ao carregar a página, STATE tenha producoes.
// Adicione no loadData do sistemateste (43).html a busca por rvp_producao.
// Como não queremos mexer no arquivo principal, faremos uma pequena "gambiarra": na primeira chamada de renderEquipe, se STATE.producoes não existir, buscamos.
if (!STATE.producoes) {
    (async () => {
        const { data } = await sb.from('rvp_producao').select('*');
        STATE.producoes = data || [];
    })();
}
