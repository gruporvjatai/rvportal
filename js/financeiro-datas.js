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

  global.FinanceiroDatas = { indexar, resumo };
})(typeof window !== 'undefined' ? window : globalThis);
