// gerencial-painel-core.js – cálculos puros do Painel Executivo.
// Não depende de DOM. Pode ser carregado no navegador (window.GerencialPainelCore)
// e no Node (module.exports) para testes.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GerencialPainelCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EPS = 0.005;
  const TIPOS_RECEITA = { venda: true, receita: true };
  const GRUPOS = ['CUSTO', 'OPERACIONAL', 'FINANCEIRA', 'TRIBUTO', 'OUTROS'];

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function round2(v) {
    return Math.round((num(v) + Number.EPSILON) * 100) / 100;
  }

  function dia(v) {
    const s = String(v == null ? '' : v).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }

  function hojeLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDias(iso, n) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function diffDias(isoA, isoB) {
    const a = new Date(`${isoA}T12:00:00`).getTime();
    const b = new Date(`${isoB}T12:00:00`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.round((a - b) / 86400000);
  }

  function periodoDoMes(mes) {
    const [ano, m] = String(mes || '').split('-').map(Number);
    if (!ano || !m) return null;
    const ultimo = new Date(ano, m, 0).getDate();
    return { inicio: `${ano}-${String(m).padStart(2, '0')}-01`, fim: `${ano}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}` };
  }

  function periodoAnterior(inicio, fim, tipo) {
    if (!inicio || !fim) return null;
    if (tipo === 'mes-anterior') {
      const p = periodoDoMes(inicio.slice(0, 7));
      if (!p) return null;
      const d = new Date(`${p.inicio}T12:00:00`);
      d.setMonth(d.getMonth() - 1);
      return periodoDoMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    if (tipo === 'ano-anterior') {
      const shift = (iso) => {
        const [a, m, d] = iso.split('-');
        const ano = Number(a) - 1;
        const ultimo = new Date(ano, Number(m), 0).getDate();
        return `${ano}-${m}-${String(Math.min(Number(d), ultimo)).padStart(2, '0')}`;
      };
      return { inicio: shift(inicio), fim: shift(fim) };
    }
    // Periodo anterior de igual duracao.
    const dias = Math.max(0, diffDias(fim, inicio));
    const novoFim = addDias(inicio, -1);
    const novoInicio = addDias(novoFim, -dias);
    return { inicio: novoInicio, fim: novoFim };
  }

  function normalizarTexto(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  }

  function ehCreditoHaver(forma) {
    return normalizarTexto(forma) === 'CREDITO EM HAVER';
  }

  function extrairRef(obs) {
    const m = String(obs == null ? '' : obs).match(/#(\d+)/);
    return m ? m[1] : null;
  }

  function grupoPorNome(nome) {
    const n = normalizarTexto(nome);
    if (n.startsWith('FORNECEDOR') || n.startsWith('MERCADORIA') || n.startsWith('MARCENARIA') || n.startsWith('INSTALA')) return 'CUSTO';
    if (n.startsWith('IMPOSTO')) return 'TRIBUTO';
    if (n.startsWith('JUROS') || n.includes('TAXA')) return 'FINANCEIRA';
    if (n.startsWith('OUTROS')) return 'OUTROS';
    return 'OPERACIONAL';
  }

  function grupoValido(g) {
    return GRUPOS.indexOf(g) >= 0 ? g : null;
  }

  function indexar(state) {
    const logs = Array.isArray(state && state.logs) ? state.logs : [];
    const titulos = new Map();
    const recebimentos = new Map();
    const pagamentos = new Map();
    const recebimentosAvulsos = [];
    const pagamentosAvulsos = [];
    const produtosPorId = new Map();
    const produtosPorNome = new Map();
    const categoriasPorId = new Map();
    const categoriasPorNome = new Map();

    (state && state.products ? state.products : []).forEach((p) => {
      if (!p) return;
      produtosPorId.set(String(p.id), p);
      if (p.name) produtosPorNome.set(normalizarTexto(p.name), p);
    });

    (state && state.categoriesDespesas ? state.categoriesDespesas : []).forEach((c) => {
      if (!c) return;
      categoriasPorId.set(String(c.id), c);
      if (c.nome) categoriasPorNome.set(normalizarTexto(c.nome), c);
    });

    logs.forEach((l) => {
      if (!l) return;
      if (String(l.status || '').toUpperCase() === 'CANCELADO') return;
      const tipo = String(l.type || '');
      const d = dia(l.date);

      if (TIPOS_RECEITA[tipo]) {
        if (String(l.finStatus || '').toUpperCase() === 'PARCELADO') return;
        const id = String(l.id);
        if (!titulos.has(id)) {
          titulos.set(id, {
            id: id,
            tipo: tipo,
            cliente: l.clientName || 'Consumidor Final',
            clienteId: l.clientId != null ? String(l.clientId) : null,
            data: d,
            vencimento: dia(l.dueDate),
            forma: l.paymentMethod || '',
            finStatus: String(l.finStatus || '').toUpperCase(),
            total: 0,
            paidValue: 0,
            linhas: []
          });
        }
        const t = titulos.get(id);
        t.total += num(l.totalValue);
        t.paidValue = Math.max(t.paidValue, num(l.paidValue));
        if (d && (!t.data || d < t.data)) t.data = d;
        if (!t.vencimento && dia(l.dueDate)) t.vencimento = dia(l.dueDate);
        if (!t.forma && l.paymentMethod) t.forma = l.paymentMethod;
        t.linhas.push(l);
        return;
      }

      if (tipo === 'recebimento') {
        const ref = extrairRef(l.note);
        const item = {
          id: String(l.uid || l.id || ''),
          data: d,
          valor: num(l.totalValue),
          forma: l.paymentMethod || 'Outros',
          credito: ehCreditoHaver(l.paymentMethod),
          desconto: num(l.discount),
          juros: num(l.acrescimo),
          loteId: l.loteId != null ? String(l.loteId) : null
        };
        if (!ref) { recebimentosAvulsos.push(item); return; }
        if (!recebimentos.has(ref)) recebimentos.set(ref, []);
        recebimentos.get(ref).push(item);
        return;
      }

      if (tipo === 'despesa') {
        const ref = extrairRef(l.note);
        const item = {
          id: String(l.uid || l.id || ''),
          data: d,
          valor: num(l.totalValue),
          forma: l.paymentMethod || 'Outros',
          categoria: l.productName || '',
          desconto: num(l.discount),
          juros: num(l.acrescimo),
          loteId: l.loteId != null ? String(l.loteId) : null
        };
        if (!ref) { pagamentosAvulsos.push(item); return; }
        if (!pagamentos.has(ref)) pagamentos.set(ref, []);
        pagamentos.get(ref).push(item);
      }
    });

    const despesas = (state && state.expenses ? state.expenses : []).map((e) => {
      const id = String(e.id);
      const pagos = pagamentos.get(id) || [];
      const pagoLog = pagos.reduce((s, p) => s + p.valor, 0);
      const custo = num(e.cost);
      const juros = num(e.acrescimoTotal);
      const desconto = num(e.descontoTotal);
      const valorPago = num(e.valorPago);
      const status = String(e.status || 'PENDENTE').toUpperCase();
      const pagoTabela = status === 'PAGO' ? (valorPago > 0 ? valorPago : custo) : valorPago;
      const pagoTotal = (status === 'PAGO' || status === 'PARCIAL') ? pagoTabela : Math.max(pagoLog, pagoTabela);
      const devido = Math.max(0, custo + juros - desconto);
      const saldo = Math.max(0, devido - pagoTotal);
      const legado = Math.max(0, pagoTotal - pagoLog);
      const categoria = e.categoriaNome || 'Sem categoria';
      const cat = e.categoriaId != null ? categoriasPorId.get(String(e.categoriaId)) : null;
      const grupo = grupoValido(cat && cat.grupoDre) || grupoValido(e.grupoDre) || grupoPorNome(categoria);
      return {
        id: id,
        data: dia(e.date),
        vencimento: dia(e.date),
        categoria: categoria,
        categoriaId: e.categoriaId != null ? String(e.categoriaId) : null,
        grupo: grupo,
        fornecedor: e.provider || e.note || 'Não informado',
        custo: custo,
        juros: juros,
        desconto: desconto,
        devido: devido,
        valorPago: valorPago,
        pagoLog: pagoLog,
        pagoTotal: pagoTotal,
        pagoTabela: pagoTabela,
        saldo: saldo,
        legado: legado,
        status: status,
        pagamentos: pagos
      };
    });

    // Concilia baixas duplicadas: cada despesa consome no maximo o proprio pagoTotal.
    // O excedente (logs repetidos) nao entra no caixa e vira alerta de qualidade.
    const idsDespesas = new Set();
    let despesasIdDuplicado = 0;
    despesas.forEach((e) => {
      if (idsDespesas.has(e.id)) despesasIdDuplicado += 1;
      else idsDespesas.add(e.id);
    });
    const despesasPorId = new Map();
    despesas.forEach((e) => {
      if (!despesasPorId.has(e.id)) despesasPorId.set(e.id, []);
      despesasPorId.get(e.id).push(e);
      e.pagoLogEfetivo = 0;
    });
    let pagamentosExcedentes = 0;
    let pagamentosOrfaos = 0;
    pagamentos.forEach((lista, id) => {
      const rows = despesasPorId.get(String(id)) || [];
      if (!rows.length) {
        lista.forEach((p) => {
          pagamentosOrfaos += p.valor;
          p.excedente = round2(p.valor);
          p.valor = 0;
        });
        return;
      }
      let pos = 0;
      let restante = rows.length ? Math.max(0, rows[0].pagoTotal) : 0;
      lista.sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
      lista.forEach((p) => {
        let restantePagamento = p.valor;
        let contado = 0;
        while (restantePagamento > EPS && pos < rows.length) {
          if (restante <= EPS) {
            pos += 1;
            restante = pos < rows.length ? Math.max(0, rows[pos].pagoTotal) : 0;
            continue;
          }
          const usar = Math.min(restantePagamento, restante);
          contado += usar;
          restante -= usar;
          restantePagamento -= usar;
          rows[pos].pagoLogEfetivo += usar;
        }
        if (restantePagamento > EPS) pagamentosExcedentes += restantePagamento;
        p.excedente = round2(restantePagamento);
        p.valor = round2(contado);
      });
    });
    despesas.forEach((e) => {
      e.pagoLog = round2(e.pagoLogEfetivo);
      e.legado = round2(Math.max(0, e.pagoTotal - e.pagoLog));
      e.saldo = round2(Math.max(0, e.devido - e.pagoTotal));
      e.pagamentos = (pagamentos.get(e.id) || []).filter((p) => p.valor > EPS);
    });

    return {
      titulos: titulos,
      recebimentos: recebimentos,
      recebimentosAvulsos: recebimentosAvulsos,
      pagamentos: pagamentos,
      pagamentosAvulsos: pagamentosAvulsos,
      pagamentosExcedentes: round2(pagamentosExcedentes),
      pagamentosOrfaos: round2(pagamentosOrfaos),
      despesasIdDuplicado: despesasIdDuplicado,
      despesas: despesas,
      produtosPorId: produtosPorId,
      produtosPorNome: produtosPorNome,
      categoriasPorId: categoriasPorId,
      categoriasPorNome: categoriasPorNome,
      creditoHaver: (state && state.clients ? state.clients : []).reduce((s, c) => s + num(c && c.creditoHaver), 0)
    };
  }

  function enriquecerTitulos(index) {
    const out = [];
    index.titulos.forEach((t) => {
      const recs = index.recebimentos.get(t.id) || [];
      const money = recs.reduce((s, r) => s + (r.credito ? 0 : r.valor), 0);
      const credito = recs.reduce((s, r) => s + (r.credito ? r.valor : 0), 0);
      const desconto = recs.reduce((s, r) => s + r.desconto, 0);
      const juros = recs.reduce((s, r) => s + r.juros, 0);
      const devido = Math.max(0, t.total + juros - desconto);
      let legado = Math.max(0, t.paidValue - money - credito);
      if (t.finStatus === 'PAGO' && money + credito + legado <= EPS) legado = devido;
      const pagoCaixa = money + legado;
      const pagoTotal = pagoCaixa + credito;
      let saldo = Math.max(0, devido - pagoTotal);
      let status = saldo <= EPS ? 'PAGO' : (pagoTotal > EPS ? 'PARCIAL' : 'A RECEBER');
      let ajuste = 0;
      if (t.finStatus === 'PAGO' && saldo > EPS) {
        ajuste = saldo;
        saldo = 0;
        status = 'PAGO';
      }
      out.push({
        id: t.id,
        tipo: t.tipo,
        cliente: t.cliente,
        clienteId: t.clienteId,
        data: t.data,
        vencimento: t.vencimento,
        forma: t.forma,
        finStatus: t.finStatus,
        total: round2(t.total),
        devido: round2(devido),
        money: round2(money),
        credito: round2(credito),
        desconto: round2(desconto),
        juros: round2(juros),
        legado: round2(legado),
        pagoCaixa: round2(pagoCaixa),
        pagoTotal: round2(pagoTotal),
        ajuste: round2(ajuste),
        saldo: round2(saldo),
        status: status,
        linhas: t.linhas
      });
    });
    return out;
  }

  function dentro(data, inicio, fim) {
    if (!data) return false;
    return data >= inicio && data <= fim;
  }

  function calcularCmvLocal(vendas, index) {
    const mapa = new Map();
    (vendas || []).forEach((v) => {
      const chave = v.productId != null ? `id:${v.productId}` : `nome:${normalizarTexto(v.productName)}`;
      if (!mapa.has(chave)) {
        const prod = v.productId != null
          ? index.produtosPorId.get(String(v.productId))
          : index.produtosPorNome.get(normalizarTexto(v.productName));
        mapa.set(chave, {
          nome: v.productName,
          qtd: 0,
          receita: 0,
          custoTotal: 0,
          parceiro: !!(prod && prod.parceiro),
          semHistorico: false,
          semCusto: false
        });
      }
      const item = mapa.get(chave);
      const prod = v.productId != null
        ? index.produtosPorId.get(String(v.productId))
        : index.produtosPorNome.get(normalizarTexto(v.productName));
      const custo = prod ? num(prod.cost) : 0;
      const qtd = num(v.quantity);
      item.qtd += qtd;
      item.receita += num(v.totalValue);
      item.custoTotal += custo * qtd;
      if (!prod || !(custo > 0)) item.semCusto = true;
      item.semHistorico = true;
    });
    return Array.from(mapa.values());
  }

  function calcularCmv(vendas, index, deps) {
    const fn = deps && typeof deps.calcularCustoPorProduto === 'function'
      ? deps.calcularCustoPorProduto
      : null;
    if (fn) {
      try {
        const r = fn(vendas);
        if (Array.isArray(r)) return r;
      } catch (e) {
        // Cai no calculo local se o modulo antigo nao estiver disponivel.
      }
    }
    return calcularCmvLocal(vendas, index);
  }

  function resumoPeriodo(index, inicio, fim, deps, opcoes) {
    const opts = opcoes || {};
    const gerarDiario = opts.diario !== false;
    const titulos = enriquecerTitulos(index);
    const titulosPeriodo = titulos.filter((t) => dentro(t.data, inicio, fim));
    const despesasPeriodo = index.despesas.filter((e) => dentro(e.data, inicio, fim));

    const receita = titulosPeriodo.reduce((s, t) => s + t.total, 0);
    const vendasFlat = [];
    titulosPeriodo.forEach((t) => t.linhas.forEach((l) => vendasFlat.push(l)));
    const cmvProdutos = calcularCmv(vendasFlat, index, deps);
    const cmv = cmvProdutos.reduce((s, p) => s + num(p.custoTotal), 0);
    const lucroBruto = receita - cmv;

    const despesasPorGrupoMap = new Map();
    GRUPOS.forEach((g) => despesasPorGrupoMap.set(g, { grupo: g, total: 0, qtd: 0 }));
    despesasPeriodo.forEach((e) => {
      const g = grupoValido(e.grupo) || 'OPERACIONAL';
      const x = despesasPorGrupoMap.get(g);
      x.total += e.custo;
      x.qtd += 1;
    });
    const despesasPorGrupo = Array.from(despesasPorGrupoMap.values());
    const valorGrupo = (g) => {
      const x = despesasPorGrupoMap.get(g);
      return x ? x.total : 0;
    };
    const despesasOperacionais = valorGrupo('OPERACIONAL') + valorGrupo('OUTROS');
    const tributos = valorGrupo('TRIBUTO');
    const financeiras = valorGrupo('FINANCEIRA');
    const custoForaDre = valorGrupo('CUSTO');
    const resultadoOperacional = lucroBruto - despesasOperacionais;
    const resultadoLiquido = resultadoOperacional - tributos - financeiras;

    // Caixa documentado = baixas/pagamentos vinculados + lancamentos avulsos.
    // Realizado = somente vinculados; legado = PAGO sem baixa (linha separada).
    const despesasPorId = new Map();
    index.despesas.forEach((e) => despesasPorId.set(String(e.id), e));

    const entradasPorForma = new Map();
    const entradasPorDia = new Map();
    let entradasRealizadas = 0;
    let entradasAvulsas = 0;
    let entradasAvulsasAntes = 0;
    let entradasAntes = 0;
    let creditosRecebidos = 0;

    const addEntrada = (item, avulso) => {
      if (!item.data) return;
      if (item.data < inicio) {
        if (avulso) entradasAvulsasAntes += item.valor; else entradasAntes += item.valor;
        return;
      }
      if (item.data > fim) return;
      if (avulso) entradasAvulsas += item.valor; else entradasRealizadas += item.valor;
      const k = item.forma || 'Outros';
      if (!entradasPorForma.has(k)) entradasPorForma.set(k, { forma: k, valor: 0, qtd: 0 });
      const x = entradasPorForma.get(k);
      x.valor += item.valor;
      x.qtd += 1;
      if (gerarDiario) entradasPorDia.set(item.data, (entradasPorDia.get(item.data) || 0) + item.valor);
    };

    index.recebimentos.forEach((lista) => {
      lista.forEach((r) => {
        if (r.credito) { if (dentro(r.data, inicio, fim)) creditosRecebidos += r.valor; return; }
        addEntrada(r, false);
      });
    });
    index.recebimentosAvulsos.forEach((r) => addEntrada(r, true));

    let saidasRealizadas = 0;
    let saidasAvulsas = 0;
    let saidasAvulsasAntes = 0;
    let saidasAntes = 0;
    const saidasPorDia = new Map();
    const saidasPorGrupoMap = new Map();
    GRUPOS.forEach((g) => saidasPorGrupoMap.set(g, { grupo: g, valor: 0, qtd: 0 }));

    const grupoPagamento = (p) => {
      const despesa = p.ref ? despesasPorId.get(String(p.ref)) : null;
      if (despesa) return despesa.grupo;
      const cat = index.categoriasPorNome.get(normalizarTexto(p.categoria));
      if (cat) return grupoValido(cat.grupoDre) || grupoPorNome(cat.nome);
      return grupoPorNome(p.categoria);
    };

    const addSaida = (item, avulso) => {
      if (!item.data) return;
      if (item.data < inicio) {
        if (avulso) saidasAvulsasAntes += item.valor; else saidasAntes += item.valor;
        return;
      }
      if (item.data > fim) return;
      if (avulso) saidasAvulsas += item.valor; else saidasRealizadas += item.valor;
      const g = item.grupo || 'OPERACIONAL';
      if (!saidasPorGrupoMap.has(g)) saidasPorGrupoMap.set(g, { grupo: g, valor: 0, qtd: 0 });
      const x = saidasPorGrupoMap.get(g);
      x.valor += item.valor;
      x.qtd += 1;
      if (gerarDiario) saidasPorDia.set(item.data, (saidasPorDia.get(item.data) || 0) + item.valor);
    };

    index.pagamentos.forEach((lista, ref) => {
      lista.forEach((p) => addSaida(Object.assign({}, p, { ref: ref, grupo: grupoPagamento({ ref: ref, categoria: p.categoria }) }), false));
    });
    index.pagamentosAvulsos.forEach((p) => addSaida(Object.assign({}, p, { grupo: grupoPagamento(p) }), true));

    // Ajustes legados: títulos/despesas PAGO sem log de baixa.
    let entradasLegado = 0;
    let entradasLegadoQtd = 0;
    let entradasLegadoAntes = 0;
    titulos.forEach((t) => {
      if (!(t.legado > EPS) || !t.data) return;
      if (t.data < inicio) { entradasLegadoAntes += t.legado; return; }
      if (t.data > fim) return;
      entradasLegado += t.legado;
      entradasLegadoQtd += 1;
    });

    let saidasLegado = 0;
    let saidasLegadoQtd = 0;
    let saidasLegadoAntes = 0;
    index.despesas.forEach((e) => {
      if (!(e.legado > EPS) || !e.data) return;
      if (e.data < inicio) { saidasLegadoAntes += e.legado; return; }
      if (e.data > fim) return;
      saidasLegado += e.legado;
      saidasLegadoQtd += 1;
    });

    const saldoInicialRealizado = entradasAntes - saidasAntes;
    const saldoInicialDocumentado = saldoInicialRealizado + entradasAvulsasAntes - saidasAvulsasAntes;
    const saldoInicialFinanceiro = saldoInicialRealizado + entradasLegadoAntes - saidasLegadoAntes;
    const saldoInicialApurado = saldoInicialDocumentado + entradasLegadoAntes - saidasLegadoAntes;

    const entradasDocumentadas = entradasRealizadas + entradasAvulsas;
    const saidasDocumentadas = saidasRealizadas + saidasAvulsas;
    const fluxoRealizado = entradasRealizadas - saidasRealizadas;
    const fluxoDocumentado = entradasDocumentadas - saidasDocumentadas;
    const fluxoLegado = entradasLegado - saidasLegado;
    const saldoFinalRealizado = saldoInicialRealizado + fluxoRealizado;
    const saldoFinalDocumentado = saldoInicialDocumentado + fluxoDocumentado;
    const saldoFinalFinanceiro = saldoInicialFinanceiro + fluxoRealizado + fluxoLegado;
    const saldoFinalApurado = saldoInicialApurado + fluxoDocumentado + fluxoLegado;

    // Serie diaria: fluxo documentado (vinculado + avulso).
    const diario = [];
    if (gerarDiario) {
      const dias = Math.max(0, diffDias(fim, inicio));
      let acumulado = saldoInicialDocumentado;
      for (let i = 0; i <= dias; i++) {
        const d = addDias(inicio, i);
        const entDia = entradasPorDia.get(d) || 0;
        const saiDia = saidasPorDia.get(d) || 0;
        acumulado += entDia - saiDia;
        diario.push({ data: d, entradas: round2(entDia), saidas: round2(saiDia), saldo: round2(acumulado) });
      }
    }

    const entradasPorFormaArr = Array.from(entradasPorForma.values())
      .map((x) => ({ forma: x.forma, valor: round2(x.valor), qtd: x.qtd }))
      .sort((a, b) => b.valor - a.valor);

    const saidasPorGrupoArr = GRUPOS.map((g) => {
      const x = saidasPorGrupoMap.get(g) || { valor: 0, qtd: 0 };
      return { grupo: g, valor: round2(x.valor), qtd: x.qtd };
    }).filter((x) => x.valor > EPS || x.qtd > 0);

    const topProdutos = (cmvProdutos || [])
      .map((p) => ({
        nome: p.nome,
        qtd: p.qtd,
        receita: round2(p.receita),
        custo: round2(p.custoTotal),
        lucro: round2(num(p.receita) - num(p.custoTotal)),
        parceiro: !!p.parceiro,
        semCusto: !!p.semCusto,
        semHistorico: !!p.semHistorico
      }))
      .sort((a, b) => b.receita - a.receita);

    const parceiros = topProdutos.filter((p) => p.parceiro);
    const topClientesMap = new Map();
    titulosPeriodo.forEach((t) => {
      const k = t.cliente || 'Consumidor Final';
      if (!topClientesMap.has(k)) topClientesMap.set(k, { nome: k, valor: 0, titulos: 0 });
      const x = topClientesMap.get(k);
      x.valor += t.total;
      x.titulos += 1;
    });
    const topClientes = Array.from(topClientesMap.values())
      .map((x) => ({ nome: x.nome, valor: round2(x.valor), titulos: x.titulos }))
      .sort((a, b) => b.valor - a.valor);

    // Despesas (competencia) e por categoria.
    const despesasPorCategoriaMap = new Map();
    despesasPeriodo.forEach((e) => {
      const k = e.categoria || 'Sem categoria';
      if (!despesasPorCategoriaMap.has(k)) {
        despesasPorCategoriaMap.set(k, { categoria: k, grupo: e.grupo, total: 0, pago: 0, aberto: 0, qtd: 0 });
      }
      const x = despesasPorCategoriaMap.get(k);
      x.total += e.custo;
      x.pago += Math.min(e.pagoTotal, e.devido);
      x.aberto += e.saldo;
      x.qtd += 1;
    });
    const despesasPorCategoria = Array.from(despesasPorCategoriaMap.values())
      .map((x) => ({
        categoria: x.categoria,
        grupo: x.grupo,
        total: round2(x.total),
        pago: round2(x.pago),
        aberto: round2(x.aberto),
        qtd: x.qtd,
        pctDespesas: 0,
        pctReceita: 0
      }))
      .sort((a, b) => b.total - a.total);
    const totalDespesasCategoria = despesasPorCategoria.reduce((s, x) => s + x.total, 0);
    despesasPorCategoria.forEach((x) => {
      x.pctDespesas = totalDespesasCategoria > 0 ? (x.total / totalDespesasCategoria) * 100 : 0;
      x.pctReceita = receita > 0 ? (x.total / receita) * 100 : 0;
    });

    const topFornecedoresMap = new Map();
    despesasPeriodo.forEach((e) => {
      const k = e.fornecedor || 'Não informado';
      if (!topFornecedoresMap.has(k)) topFornecedoresMap.set(k, { nome: k, valor: 0, qtd: 0 });
      const x = topFornecedoresMap.get(k);
      x.valor += e.custo;
      x.qtd += 1;
    });
    const topFornecedores = Array.from(topFornecedoresMap.values())
      .map((x) => ({ nome: x.nome, valor: round2(x.valor), qtd: x.qtd }))
      .sort((a, b) => b.valor - a.valor);

    return {
      inicio: inicio,
      fim: fim,
      receita: round2(receita),
      cmv: round2(cmv),
      lucroBruto: round2(lucroBruto),
      despesasOperacionais: round2(despesasOperacionais),
      tributos: round2(tributos),
      financeiras: round2(financeiras),
      custoForaDre: round2(custoForaDre),
      resultadoOperacional: round2(resultadoOperacional),
      resultadoLiquido: round2(resultadoLiquido),
      margemBruta: receita > 0 ? (lucroBruto / receita) * 100 : 0,
      margemOperacional: receita > 0 ? (resultadoOperacional / receita) * 100 : 0,
      margemLiquida: receita > 0 ? (resultadoLiquido / receita) * 100 : 0,
      despesasPorGrupo: despesasPorGrupo.map((x) => ({ grupo: x.grupo, total: round2(x.total), qtd: x.qtd })),
      cmvProdutos: topProdutos,
      caixa: {
        entradasRealizadas: round2(entradasRealizadas),
        entradasAvulsas: round2(entradasAvulsas),
        entradasDocumentadas: round2(entradasDocumentadas),
        entradasLegado: round2(entradasLegado),
        entradasLegadoQtd: entradasLegadoQtd,
        entradasApuradas: round2(entradasDocumentadas + entradasLegado),
        entradasPorForma: entradasPorFormaArr,
        creditosRecebidos: round2(creditosRecebidos),
        saidasRealizadas: round2(saidasRealizadas),
        saidasAvulsas: round2(saidasAvulsas),
        saidasDocumentadas: round2(saidasDocumentadas),
        saidasLegado: round2(saidasLegado),
        saidasLegadoQtd: saidasLegadoQtd,
        saidasApuradas: round2(saidasDocumentadas + saidasLegado),
        saidasPorGrupo: saidasPorGrupoArr,
        pagamentosAvulsos: round2(saidasAvulsas),
        saldoInicialRealizado: round2(saldoInicialRealizado),
        saldoInicialDocumentado: round2(saldoInicialDocumentado),
        saldoInicialFinanceiro: round2(saldoInicialFinanceiro),
        saldoInicialApurado: round2(saldoInicialApurado),
        saldoFinalRealizado: round2(saldoFinalRealizado),
        saldoFinalDocumentado: round2(saldoFinalDocumentado),
        saldoFinalFinanceiro: round2(saldoFinalFinanceiro),
        saldoFinalApurado: round2(saldoFinalApurado),
        diario: diario
      },
      despesas: {
        total: round2(despesasPeriodo.reduce((s, e) => s + e.custo, 0)),
        pago: round2(despesasPeriodo.reduce((s, e) => s + Math.min(e.pagoTotal, e.devido), 0)),
        aberto: round2(despesasPeriodo.reduce((s, e) => s + e.saldo, 0)),
        qtd: despesasPeriodo.length,
        porCategoria: despesasPorCategoria,
        topFornecedores: topFornecedores
      },
      entradas: {
        porForma: entradasPorFormaArr,
        topClientes: topClientes,
        topProdutos: topProdutos,
        parceiros: parceiros
      },
      flags: {
        itensSemCusto: topProdutos.filter((p) => p.semCusto).length,
        itensSemHistorico: topProdutos.filter((p) => p.semHistorico && !p.semCusto).length,
        titulosLegado: entradasLegadoQtd,
        despesasLegado: saidasLegadoQtd
      }
    };
  }

  function calcularCaixaHoje(index, hoje) {
    const r = resumoPeriodo(index, '1900-01-01', hoje, {}, { diario: false });
    return {
      realizado: r.caixa.saldoFinalRealizado,
      documentado: r.caixa.saldoFinalDocumentado,
      financeiro: r.caixa.saldoFinalFinanceiro,
      apurado: r.caixa.saldoFinalApurado,
      entradas: r.caixa.entradasRealizadas,
      saidas: r.caixa.saidasRealizadas,
      entradasAvulsas: r.caixa.entradasAvulsas,
      saidasAvulsas: r.caixa.saidasAvulsas,
      entradasLegado: r.caixa.entradasLegado,
      saidasLegado: r.caixa.saidasLegado
    };
  }

  function contasAbertas(index, hoje) {
    const titulos = enriquecerTitulos(index);
    const receber = titulos.filter((t) => t.saldo > EPS);
    const pagar = index.despesas.filter((e) => e.saldo > EPS && e.status !== 'PAGO');

    const buckets = () => ({
      vencido: { qtd: 0, valor: 0 },
      d7: { qtd: 0, valor: 0 },
      d30: { qtd: 0, valor: 0 },
      d60: { qtd: 0, valor: 0 },
      d90: { qtd: 0, valor: 0 },
      acima: { qtd: 0, valor: 0 },
      semVencimento: { qtd: 0, valor: 0 }
    });
    const classificar = (lista, valorFn, dataFn) => {
      const b = buckets();
      lista.forEach((x) => {
        const valor = valorFn(x);
        const data = dataFn(x);
        const dias = data ? diffDias(data, hoje) : null;
        let k;
        if (dias == null) k = 'semVencimento';
        else if (dias < 0) k = 'vencido';
        else if (dias <= 7) k = 'd7';
        else if (dias <= 30) k = 'd30';
        else if (dias <= 60) k = 'd60';
        else if (dias <= 90) k = 'd90';
        else k = 'acima';
        b[k].qtd += 1;
        b[k].valor += valor;
      });
      Object.keys(b).forEach((k) => { b[k].valor = round2(b[k].valor); });
      return b;
    };

    const bucketReceber = classificar(receber, (t) => t.saldo, (t) => t.vencimento);
    const bucketPagar = classificar(pagar, (e) => e.saldo, (e) => e.vencimento);

    const topReceber = new Map();
    receber.forEach((t) => {
      const k = t.cliente || 'Consumidor Final';
      if (!topReceber.has(k)) topReceber.set(k, { nome: k, valor: 0, qtd: 0 });
      const x = topReceber.get(k);
      x.valor += t.saldo;
      x.qtd += 1;
    });
    const topPagar = new Map();
    pagar.forEach((e) => {
      const k = e.fornecedor || 'Não informado';
      if (!topPagar.has(k)) topPagar.set(k, { nome: k, valor: 0, qtd: 0 });
      const x = topPagar.get(k);
      x.valor += e.saldo;
      x.qtd += 1;
    });

    return {
      hoje: hoje,
      receber: {
        total: round2(receber.reduce((s, t) => s + t.saldo, 0)),
        qtd: receber.length,
        vencido: bucketReceber.vencido.valor,
        buckets: bucketReceber,
        top: Array.from(topReceber.values()).map((x) => ({ nome: x.nome, valor: round2(x.valor), qtd: x.qtd })).sort((a, b) => b.valor - a.valor),
        titulos: receber.slice().sort((a, b) => String(a.vencimento || '9999').localeCompare(String(b.vencimento || '9999')))
      },
      pagar: {
        total: round2(pagar.reduce((s, e) => s + e.saldo, 0)),
        qtd: pagar.length,
        vencido: bucketPagar.vencido.valor,
        buckets: bucketPagar,
        top: Array.from(topPagar.values()).map((x) => ({ nome: x.nome, valor: round2(x.valor), qtd: x.qtd })).sort((a, b) => b.valor - a.valor),
        titulos: pagar.slice().sort((a, b) => String(a.vencimento || '9999').localeCompare(String(b.vencimento || '9999')))
      },
      creditoHaver: round2(index.creditoHaver || 0)
    };
  }

  function projetar(contas, saldoBase, hoje) {
    const buckets = [7, 30, 60, 90];
    const somaAte = (lista, valorFn, dataFn, dias) => lista.reduce((s, x) => {
      const d = dataFn(x);
      if (!d) return s;
      const diff = diffDias(d, hoje);
      return diff >= 0 && diff <= dias ? s + valorFn(x) : s;
    }, 0);

    const receberFuturo = contas.receber.titulos;
    const pagarFuturo = contas.pagar.titulos;
    const linhas = buckets.map((dias) => {
      const entradas = somaAte(receberFuturo, (t) => t.saldo, (t) => t.vencimento, dias);
      const saidas = somaAte(pagarFuturo, (e) => e.saldo, (e) => e.vencimento, dias);
      return { dias: dias, entradas: round2(entradas), saidas: round2(saidas), saldo: round2(saldoBase + entradas - saidas) };
    });
    return {
      base: round2(saldoBase),
      linhas: linhas,
      vencidoReceber: contas.receber.vencido,
      vencidoPagar: contas.pagar.vencido
    };
  }

  function qualidade(index, atual, contas) {
    const semCategoria = index.despesas.filter((e) => !e.categoria || e.categoria === 'Sem categoria').length;
    const datasInvalidas = index.despesas.filter((e) => !e.data || e.data < '2000-01-01').length;
    const despesasSemValorPago = index.despesas.filter((e) => e.status === 'PAGO' && !(e.valorPago > EPS)).length;
    const diasNegativos = atual.caixa.diario.filter((d) => d.saldo < -EPS).length;
    const recebiveisSemVencimento = contas && contas.receber && contas.receber.buckets
      ? contas.receber.buckets.semVencimento.qtd
      : 0;
    return {
      semCategoria: semCategoria,
      datasInvalidas: datasInvalidas,
      despesasSemValorPago: despesasSemValorPago,
      despesasIdDuplicado: index.despesasIdDuplicado || 0,
      diasNegativos: diasNegativos,
      recebiveisSemVencimento: recebiveisSemVencimento,
      titulosLegado: atual.flags.titulosLegado,
      despesasLegado: atual.flags.despesasLegado,
      itensSemCusto: atual.flags.itensSemCusto,
      itensSemHistorico: atual.flags.itensSemHistorico,
      pagamentosExcedentes: round2(index.pagamentosExcedentes || 0),
      pagamentosOrfaos: round2(index.pagamentosOrfaos || 0),
      creditoHaver: contas && contas.creditoHaver ? contas.creditoHaver : 0
    };
  }

  function montarVariacoes(atual, anterior) {
    if (!anterior) return null;
    const mk = (nome, a, b, inverso) => {
      const delta = num(a) - num(b);
      const pct = Math.abs(num(b)) > EPS ? (delta / Math.abs(num(b))) * 100 : null;
      return { nome: nome, atual: round2(a), anterior: round2(b), delta: round2(delta), pct: pct, inverso: !!inverso };
    };
    return [
      mk('Entradas de caixa', atual.caixa.entradasRealizadas, anterior.caixa.entradasRealizadas),
      mk('Saídas de caixa', atual.caixa.saidasRealizadas, anterior.caixa.saidasRealizadas, true),
      mk('Resultado de caixa', atual.caixa.saldoFinalFinanceiro - atual.caixa.saldoInicialFinanceiro, anterior.caixa.saldoFinalFinanceiro - anterior.caixa.saldoInicialFinanceiro),
      mk('Faturamento', atual.receita, anterior.receita),
      mk('Lucro bruto', atual.lucroBruto, anterior.lucroBruto),
      mk('Resultado líquido', atual.resultadoLiquido, anterior.resultadoLiquido)
    ];
  }

  function calcularPainel(state, opcoes) {
    const opts = opcoes || {};
    const hoje = opts.hoje || hojeLocal();
    const inicio = opts.inicio;
    const fim = opts.fim;
    if (!inicio || !fim) throw new Error('Periodo invalido');
    const deps = opts.deps || {};
    const index = indexar(state);

    const atual = resumoPeriodo(index, inicio, fim, deps);
    let comparacao = null;
    let anterior = null;
    if (opts.comparar && opts.comparar !== 'nenhum') {
      comparacao = periodoAnterior(inicio, fim, opts.comparar);
      if (comparacao) anterior = resumoPeriodo(index, comparacao.inicio, comparacao.fim, deps);
    }

    const contas = contasAbertas(index, hoje);
    const caixaHoje = calcularCaixaHoje(index, hoje);
    const projecao = projetar(contas, caixaHoje.apurado, hoje);
    const qual = qualidade(index, atual, contas);

    const alertas = [];
    if (contas.receber.vencido > EPS) alertas.push({ nivel: 'danger', titulo: 'Recebíveis vencidos', detalhe: `${contas.receber.buckets.vencido.qtd} título(s) · ${contas.receber.vencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` });
    if (contas.pagar.vencido > EPS) alertas.push({ nivel: 'danger', titulo: 'Pagáveis vencidos', detalhe: `${contas.pagar.buckets.vencido.qtd} despesa(s) · ${contas.pagar.vencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` });
    if (atual.flags.titulosLegado > 0) alertas.push({ nivel: 'warn', titulo: 'Títulos PAGO com baixa parcial/ausente', detalhe: `${atual.flags.titulosLegado} título(s) no período; valor está no ajuste legado.` });
    if (atual.flags.despesasLegado > 0) alertas.push({ nivel: 'warn', titulo: 'Despesas PAGO com baixa parcial/ausente', detalhe: `${atual.flags.despesasLegado} despesa(s) no período; valor está no ajuste legado.` });
    if (qual.itensSemCusto > 0) alertas.push({ nivel: 'warn', titulo: 'Vendas sem custo', detalhe: `${qual.itensSemCusto} produto(s) sem custo; CMV tratado como zero.` });
    if (qual.diasNegativos > 0) alertas.push({ nivel: 'warn', titulo: 'Saldo diário negativo', detalhe: `${qual.diasNegativos} dia(s) com caixa documentado negativo.` });
    if (qual.datasInvalidas > 0) alertas.push({ nivel: 'info', titulo: 'Datas inválidas', detalhe: `${qual.datasInvalidas} despesa(s) com data anterior a 2000.` });
    if (qual.pagamentosExcedentes > EPS) alertas.push({ nivel: 'danger', titulo: 'Baixas duplicadas ignoradas', detalhe: `${qual.pagamentosExcedentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em pagamentos excedentes ao valor da despesa; fora do caixa.` });
    if (qual.pagamentosOrfaos > EPS) alertas.push({ nivel: 'warn', titulo: 'Pagamentos sem despesa', detalhe: `${qual.pagamentosOrfaos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} vinculados a despesas inexistentes; fora do caixa.` });
    if (qual.despesasIdDuplicado > 0) alertas.push({ nivel: 'warn', titulo: 'Despesas com ID duplicado', detalhe: `${qual.despesasIdDuplicado} linha(s) repetem o ID de outra despesa; os totais consideram cada linha.` });

    return {
      periodo: { inicio: inicio, fim: fim },
      comparacao: comparacao,
      atual: atual,
      anterior: anterior,
      variacoes: montarVariacoes(atual, anterior),
      contas: contas,
      caixaHoje: caixaHoje,
      projecao: projecao,
      qualidade: qual,
      alertas: alertas
    };
  }

  return {
    GRUPOS: GRUPOS,
    normalizarData: dia,
    periodoDoMes: periodoDoMes,
    periodoAnterior: periodoAnterior,
    indexar: indexar,
    enriquecerTitulos: enriquecerTitulos,
    resumoPeriodo: resumoPeriodo,
    calcularCaixaHoje: calcularCaixaHoje,
    contasAbertas: contasAbertas,
    calcularPainel: calcularPainel
  };
});
