// Utilitario compartilhado (desktop/mobile) para descobrir a data de
// pagamento de titulos e despesas a partir dos logs de baixa.
//
// Nao existe coluna "data_pagamento": a data efetiva fica no log de baixa:
//   - contas a receber: tipo "recebimento", observacao "Ref Lanc #<id>";
//   - contas a pagar:   tipo "despesa",     observacao "Ref Despesa #<id>".
//
// O resumo usa a ULTIMA baixa ativa (status != CANCELADO) e informa
// quantas baixas existem, para o caso de pagamento parcelado.
(function (global) {
  'use strict';

  function indexar(logs, tipo, prefixo) {
    const mapa = new Map();
    const re = new RegExp(prefixo + '\\s*#?(\\d+)', 'i');
    for (const log of (logs || [])) {
      if (!log || log.type !== tipo || log.status === 'CANCELADO') continue;
      if (!log.date) continue; // sem data nao ajuda a mostrar o pagamento
      const m = re.exec(log.note || '');
      if (!m) continue;
      const id = Number(m[1]);
      if (!Number.isFinite(id)) continue;
      if (!mapa.has(id)) mapa.set(id, []);
      mapa.get(id).push(log);
    }
    return mapa;
  }

  function resumo(mapa, id) {
    const baixas = (mapa && mapa.get(Number(id))) || [];
    const comData = baixas.filter((l) => l && l.date);
    if (!comData.length) return { data: null, count: 0 };
    // Prefere baixas com valor/desconto. Se o titulo so tiver baixa de valor
    // zero (registro antigo/ajuste), usa essa data como ultima evidencia.
    const efetivas = comData.filter((l) => (Number(l.totalValue) || 0) > 0 || (Number(l.discount) || 0) > 0);
    const usar = efetivas.length ? efetivas : comData;
    const normalizar = (d) => String(d).split('T')[0];
    usar.sort((a, b) => normalizar(a.date).localeCompare(normalizar(b.date)));
    return { data: normalizar(usar[usar.length - 1].date), count: usar.length };
  }

  // Indexa os logs para o calculo de titulos a receber. Antes cada chamada de
  // calcTituloFinanceiro varria STATE.logs duas vezes; com este indice a
  // varredura acontece uma vez por carga de dados.
  // Mantem as regras atuais: baixa sem data continua valendo para o calculo e
  // vale o primeiro "#numero" encontrado na observacao.
  function indexarTitulos(logs) {
    const parents = new Map();
    const baixas = new Map();
    const re = /#(\d+)/;
    for (const log of (logs || [])) {
      if (!log) continue;
      if (log.type === 'venda' || log.type === 'receita') {
        if (log.status === 'CANCELADO') continue;
        const key = String(log.id);
        if (!parents.has(key)) parents.set(key, []);
        parents.get(key).push(log);
        continue;
      }
      if (log.type !== 'recebimento' || log.status === 'CANCELADO') continue;
      const m = re.exec(log.note || '');
      if (!m) continue;
      const key = String(m[1]);
      if (!baixas.has(key)) baixas.set(key, []);
      baixas.get(key).push(log);
    }
    return { parents, baixas };
  }

  // Cache por referencia do array de logs. Em loadData o array e recriado,
  // entao a troca de referencia invalida o cache automaticamente. Mutacoes
  // locais devem chamar invalidate().
  function criarIndiceTitulosCache() {
    let logsRef = null;
    let indice = null;
    return {
      get(logs) {
        if (logsRef !== logs) {
          logsRef = logs;
          indice = indexarTitulos(logs);
        }
        return indice;
      },
      invalidate() {
        logsRef = null;
        indice = null;
      }
    };
  }

  function saldoDespesa(e) {
    const cost = Number(e && e.cost) || 0;
    const jur = Number(e && e.acrescimoTotal) || 0;
    const disc = Number(e && e.descontoTotal) || 0;
    const pago = Number(e && e.valorPago) || 0;
    return Math.max(0, cost + jur - disc - pago);
  }

  function elegivelDespesa(e) {
    return Boolean(e) && e.status !== 'PAGO' && saldoDespesa(e) > 0.005;
  }

  function statusReceber(r, status, hoje) {
    if (!status) return true;
    const st = String((r && r.status) || '');
    const due = String((r && r.dueDate) || '').split('T')[0];
    if (status === 'PAGOS') return st === 'PAGO';
    if (status === 'ABERTOS') return st !== 'PAGO' && due >= hoje;
    if (status === 'VENCIDOS') return st !== 'PAGO' && due < hoje;
    if (status === 'NAO_PAGOS') return st !== 'PAGO';
    return false;
  }

  function statusDespesa(e, status) {
    if (!status) return true;
    const st = String((e && e.status) || '');
    if (status === 'PAGO') return st === 'PAGO';
    if (status === 'PENDENTE') return st !== 'PAGO' && saldoDespesa(e) > 0.005;
    return st === status;
  }

  global.FinanceiroDatas = {
    indexar,
    resumo,
    indexarTitulos,
    criarIndiceTitulosCache,
    saldoDespesa,
    elegivelDespesa,
    statusReceber,
    statusDespesa
  };
})(typeof window !== 'undefined' ? window : globalThis);
