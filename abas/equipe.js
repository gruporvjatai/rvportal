
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

// Função principal de renderização da lista
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

    filtrado.sort((a,b) => a.nome.localeCompare(b.nome));

    if (filtrado.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhum funcionário encontrado.</td></tr>';
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
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4">
                <div class="flex items-center justify-center gap-1 flex-wrap">
                    <button onclick="openFechamento('${f.id}')" class="p-2 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Calcular Fechamento"><i data-lucide="calculator" class="w-4 h-4"></i></button>
                    <button onclick="openValeModal('${f.id}')" class="p-2 bg-amber-100 text-amber-700 rounded" title="Lançar Vale"><i data-lucide="banknote" class="w-4 h-4"></i></button>
                    <button onclick="alert('Contrato em breve')" class="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Contrato"><i data-lucide="file-text" class="w-4 h-4"></i></button>
                    <button onclick="openFuncionarioForm('${f.id}')" class="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200" title="Editar"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="toggleFuncionarioStatus('${f.id}', ${f.ativo})" class="p-2 ${f.ativo ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'} rounded" title="${f.ativo ? 'Desativar' : 'Ativar'}"><i data-lucide="${f.ativo ? 'ban' : 'check-circle'}" class="w-4 h-4"></i></button>
                    <!--<button onclick="efetuarPagamento('${f.id}')" class="p-2 bg-indigo-100 text-indigo-700 rounded" title="Efetuar Pagamento"><i data-lucide="dollar-sign" class="w-4 h-4"></i></button>-->
                    <a href="${whatsappLink}" target="_blank" class="p-2 bg-green-100 text-green-600 rounded ${!f.telefone ? 'opacity-50 pointer-events-none' : ''}" title="WhatsApp"><i data-lucide="message-circle" class="w-4 h-4"></i></a>
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

// Modal de Fechamento (simplificado - implementar lógica completa depois)
function openFechamento(funcId) {
    const func = STATE.funcionarios.find(f => String(f.id) === String(funcId));
    if (!func) return;
    const modal = document.getElementById('fechamento-modal');
    document.getElementById('fechamento-titulo').innerText = `Fechamento - ${func.nome}`;
    const conteudo = document.getElementById('fechamento-conteudo');
    const actions = document.getElementById('fechamento-actions');
    
    if (func.tipo_remuneracao === 'mensal') {
        const vales = STATE.vales.filter(v => v.funcionario_id == funcId);
        const totalVales = vales.reduce((s, v) => s + Number(v.valor), 0);
        const salario = func.valor_mensal || 0;
        const liquido = salario - totalVales;
        conteudo.innerHTML = `
            <div class="space-y-3">
                <p><strong>Salário Base:</strong> ${formatMoney(salario)}</p>
                <p><strong>Total em Vales:</strong> ${formatMoney(totalVales)}</p>
                <p class="text-lg font-bold text-emerald-700">Líquido a Pagar: ${formatMoney(liquido)}</p>
                ${vales.length ? '<hr><p class="font-bold">Vales no período:</p><ul>' + vales.map(v => `<li>${formatDate(v.data)} - ${formatMoney(v.valor)} ${v.observacao ? '('+v.observacao+')' : ''}</li>`).join('') + '</ul>' : ''}
            </div>
        `;
        actions.innerHTML = `
            <button onclick="closeFechamentoModal()" class="flex-1 py-2 bg-slate-200 rounded">Cancelar</button>
            <button onclick="confirmarPagamentoMensal('${funcId}', ${liquido})" class="flex-1 py-2 bg-emerald-600 text-white rounded">Efetuar Pagamento</button>
        `;
    } else {
        conteudo.innerHTML = `<p>Funcionalidade para ${func.tipo_remuneracao} em desenvolvimento.</p>`;
        actions.innerHTML = `<button onclick="closeFechamentoModal()" class="w-full py-2 bg-slate-200 rounded">Fechar</button>`;
    }
    modal.classList.remove('hidden');
}

function closeFechamentoModal() {
    document.getElementById('fechamento-modal').classList.add('hidden');
}

async function confirmarPagamentoMensal(funcId, valorLiquido) {
    showLoading(true);
    const hoje = getHojeLocalStr();
    const func = STATE.funcionarios.find(f => f.id == funcId);
    const newId = getNextId(STATE.pagamentos);
    const { error } = await sb.from('rvp_pagamentos').insert([{
        id: newId,
        funcionario_id: funcId,
        data_pagamento: hoje,
        valor_total: func.valor_mensal,
        descontos: func.valor_mensal - valorLiquido,
        valor_liquido: valorLiquido,
        observacao: 'Pagamento mensal'
    }]);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    // Marcar vales como pagos? Opcional.
    closeFechamentoModal();
    showToast("Pagamento registrado!");
    loadData();
}

function efetuarPagamento(funcId) {
    openFechamento(funcId);
}

function imprimirFolhaEquipe() {
    // Implementação futura
    showToast("Funcionalidade de impressão em breve", true);
}
