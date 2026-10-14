// ==========================================
// RV PORTAL - LEITOR DE PIX (RV VIDROS)
// ==========================================
// Script ENXUTO para a conta rvvidroseacabamentos@gmail.com.
// Faz APENAS: ler os e-mails de transferencia do Nubank e lancar no Supabase.
// NAO faz backup (o backup continua somente no GAS da conta principal).
//
// COMO PUBLICAR (resumo; passo a passo detalhado é enviado no chat):
//   1. Logado em rvvidroseacabamentos@gmail.com, acesse https://script.google.com
//   2. Novo projeto -> cole TODO este arquivo em Code.gs -> salvar
//   3. Implantar > Nova implantacao > tipo "App da Web"
//        - Executar como: Eu
//        - Quem tem acesso: Qualquer pessoa
//   4. Copie a URL que termina em /exec e cole no sistema (GAS_WEB_APP_URLS)
// ==========================================

const SUPABASE_URL = 'https://lyieiqhkspbowsrlngvn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWVpcWhrc3Bib3dzcmxuZ3ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM5ODA3MywiZXhwIjoyMDg4OTc0MDczfQ.mhZCDb4XFw1Cna4R3Vk2YKmEiVRJwocXEkq7GqsNiW4';
const EMAIL_DESTINO = 'rvportalmadeiras@gmail.com';
const LOG_EMAIL = 'não';

var PIX_PROP_PREFIX = 'PIXMSG_';
var PIX_TAG = 'PIX_ID:';
var EXCECOES_PIX = [
  'RV VIDROS E ACABAMENTOS',
  'RV NEGOCIOS E COMPANHIA LTDA',
  'RV BLOCOS E ESTRUTURAS'
];

// ==========================================
// ENDPOINT PARA PROCESSAR PIX VIA CHAMADA EXTERNA
// ==========================================
function doPost(e) {
  Logger.log('doPost iniciado');
  const resultado = { success: false, message: '' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    resultado.message = 'Ja existe um processamento em andamento. Aguarde.';
    return jsonOut(resultado);
  }
  try {
    processarPixNubank();
    resultado.success = true;
    resultado.message = 'Processamento Pix executado com sucesso!';
  } catch (error) {
    Logger.log('Erro capturado: ' + error.message);
    resultado.success = false;
    resultado.message = 'Erro ao processar: ' + error.message;
  } finally {
    try { lock.releaseLock(); } catch (errLock) {}
  }
  Logger.log('doPost finalizado: ' + JSON.stringify(resultado));
  return jsonOut(resultado);
}

function doOptions(e) {
  return ContentService.createTextOutput('');
}

function doGet() {
  return ContentService.createTextOutput('Use POST para executar o processamento de Pix.');
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// LEITURA DOS E-MAILS E LANCAMENTO
// ==========================================
function processarPixNubank() {
  const assunto = 'Transferência realizada com sucesso';
  const busca = 'label:inbox is:unread from:nubank.com.br subject:"' + assunto + '"';
  const threads = GmailApp.search(busca, 0, 20);

  if (threads.length === 0) {
    Logger.log("Nenhum e-mail novo de transferencia encontrado.");
    return;
  }

  const logsProcessados = [];

  for (let t = 0; t < threads.length; t++) {
    const mensagens = threads[t].getMessages();
    for (let m = 0; m < mensagens.length; m++) {
      const msg = mensagens[m];
      const msgId = msg.getId();

      if (!msg.isUnread()) continue;

      if (jaProcessouMensagem(msgId)) {
        Logger.log("Mensagem ja processada (ID gravado). Marcando como lida.");
        msg.markRead();
        continue;
      }

      const corpo = msg.getPlainBody();
      const dados = extrairDadosTransferencia(corpo, msgId);
      if (!dados) {
        Logger.log("Nao foi possivel extrair dados do e-mail. Ignorando.");
        marcarMensagemProcessada(msgId);
        msg.markRead();
        continue;
      }

      const nomeDestino = (dados.destinatario || dados.remetente || '').trim().toUpperCase();
      const isExcecao = EXCECOES_PIX.some(function (exc) {
        return nomeDestino.indexOf(exc.toUpperCase()) !== -1;
      });
      if (isExcecao) {
        Logger.log('Transferencia interna para "' + nomeDestino + '" - NAO lancada.');
        marcarMensagemProcessada(msgId);
        msg.markRead();
        continue;
      }

      if (verificarDuplicidade(dados)) {
        Logger.log("Transacao ja processada (fingerprint/banco). Ignorando.");
        marcarMensagemProcessada(msgId);
        msg.markRead();
        continue;
      }

      marcarMensagemProcessada(msgId);

      let sucesso = false;
      if (dados.tipo === 'enviado') {
        sucesso = inserirDespesaTransferencia(dados);
      } else if (dados.tipo === 'recebido') {
        sucesso = inserirReceitaTransferencia(dados);
      } else {
        Logger.log("Tipo de transacao desconhecido: " + dados.tipo);
        desmarcarMensagemProcessada(msgId);
        continue;
      }

      if (sucesso) {
        logsProcessados.push(dados);
        msg.markRead();
        Logger.log("Transferencia processada: " + (dados.destinatario || dados.remetente) + " - " + dados.valor);
      } else {
        desmarcarMensagemProcessada(msgId);
        Logger.log("Falha ao inserir transacao. E-mail permanece nao lido para nova tentativa.");
      }
    }
  }

  if (logsProcessados.length > 0) {
    enviarResumoPix(logsProcessados);
  }
}

function extrairDadosTransferencia(corpo, msgId) {
  // Normaliza TODOS os espacos, inclusive quebras de linha. O e-mail do Nubank
  // quebra o nome do destinatario no meio ("RV PORTAL\nMADEIRAS"); sem isso o
  // regex principal falhava e o fallback capturava o titulo generico
  // "outra conta do Nubank" como se fosse o nome.
  const texto = corpo.replace(/\s+/g, ' ').trim();

  let tipo = 'desconhecido';
  if (texto.indexOf('Valor enviado') !== -1) tipo = 'enviado';
  else if (texto.indexOf('Valor recebido') !== -1) tipo = 'recebido';
  else if (/transfer[eê]ncia para/i.test(texto)) tipo = 'enviado';
  else if (/transfer[eê]ncia de/i.test(texto)) tipo = 'recebido';

  let nome = '';
  // Nubank -> Nubank: "A transferência entre contas do Nubank para <NOME> foi realizada"
  let matchNome = texto.match(/transfer[eê]ncia\s+entre\s+contas\s+do\s+Nubank\s+para\s+(.+?)\s+foi\s+realizada/i);
  // Outros bancos/contatos: "A transferência para <NOME> foi realizada"
  if (!matchNome) matchNome = texto.match(/transfer[eê]ncia\s+para\s+(.+?)\s+foi\s+realizada/i);
  // Pix recebido: "A transferência de <NOME> foi realizada"
  if (!matchNome) matchNome = texto.match(/transfer[eê]ncia\s+de\s+(.+?)\s+foi\s+realizada/i);
  if (matchNome) nome = matchNome[1].trim();

  nome = nome.replace(/\*/g, '').trim();
  // Nunca usar o titulo generico do Nubank como nome do destinatario.
  if (/^outra conta do nubank$/i.test(nome)) nome = '';
  if (!nome) {
    const altMatch = corpo.match(/\bNome\s*\n\s*([^\n]+)/i);
    if (altMatch) nome = altMatch[1].trim().replace(/\*/g, '');
  }

  let valor = 0;
  const valorMatch = texto.match(/R\$\s*([\d.,]+)/);
  if (valorMatch) {
    const raw = valorMatch[1].replace(/\./g, '').replace(',', '.');
    valor = parseFloat(raw) || 0;
  }

  let data = '';
  const meses = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  };
  const dateMatch = texto.match(/(\d{1,2})\s+([A-Z]{3})\s+[àa]s\s+(\d{1,2}:\d{2})/i);
  if (dateMatch) {
    const dia = ('0' + dateMatch[1]).slice(-2);
    const mes = meses[dateMatch[2].toUpperCase()];
    let anoAjustado = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    if (mes && parseInt(mes, 10) > mesAtual) anoAjustado = anoAjustado - 1;
    data = anoAjustado + '-' + mes + '-' + dia;
  } else {
    const fb = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (fb) data = fb[3] + '-' + fb[2] + '-' + fb[1];
  }
  if (!data) data = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const pixId = gerarPixId(data, valor, nome, msgId);

  return {
    tipo: tipo,
    valor: valor,
    data: data,
    destinatario: (tipo === 'enviado') ? nome : '',
    remetente: (tipo === 'recebido') ? nome : '',
    id: pixId,
    pixId: pixId,
    msgId: msgId || '',
    descricao: 'Transferência ' + (tipo === 'enviado' ? 'para' : 'de') + ' ' + nome
  };
}

function gerarPixId(data, valor, nome, msgId) {
  const base = [
    data || '',
    Number(valor || 0).toFixed(2),
    String(nome || '').toUpperCase().replace(/\s+/g, ''),
    msgId || ''
  ].join('|');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, base);
  let hex = '';
  for (let i = 0; i < 8; i++) {
    const b = (digest[i] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex;
}

function jaProcessouMensagem(msgId) {
  if (!msgId) return false;
  return PropertiesService.getScriptProperties().getProperty(PIX_PROP_PREFIX + msgId) === '1';
}

function marcarMensagemProcessada(msgId) {
  if (!msgId) return;
  PropertiesService.getScriptProperties().setProperty(PIX_PROP_PREFIX + msgId, '1');
}

function desmarcarMensagemProcessada(msgId) {
  if (!msgId) return;
  PropertiesService.getScriptProperties().deleteProperty(PIX_PROP_PREFIX + msgId);
}

function verificarDuplicidade(dados) {
  if (!dados || !dados.valor || !dados.data) return false;

  const options = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    muteHttpExceptions: true
  };

  if (dados.pixId) {
    const tag = encodeURIComponent('%' + PIX_TAG + dados.pixId + '%');
    if (existeRegistro(SUPABASE_URL + '/rest/v1/despesas?select=id&observacao=ilike.' + tag + '&limit=1', options)) return true;
    if (existeRegistro(SUPABASE_URL + '/rest/v1/logs?select=id&observacao=ilike.' + tag + '&limit=1', options)) return true;
  }

  const autoTag = encodeURIComponent('%Gerado Automaticamente%');
  const urlDesp = SUPABASE_URL + '/rest/v1/despesas?select=id'
    + '&custo=eq.' + Number(dados.valor)
    + '&data=eq.' + dados.data
    + '&observacao=ilike.' + autoTag
    + '&limit=5';
  try {
    const resp = UrlFetchApp.fetch(urlDesp, options);
    if (resp.getResponseCode() === 200) {
      const rows = JSON.parse(resp.getContentText()) || [];
      if (rows.length > 0) return true;
    }
  } catch (e) {
    Logger.log("Erro ao verificar duplicidade em despesas: " + e.message);
  }

  return false;
}

function existeRegistro(url, options) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const dadosRet = JSON.parse(response.getContentText());
      return dadosRet && dadosRet.length > 0;
    }
  } catch (e) {
    Logger.log("Erro ao consultar duplicidade: " + e.message);
  }
  return false;
}

function inserirReceitaTransferencia(dados) {
  const novoId = obterProximoId('logs');
  if (!novoId) return false;

  const payload = {
    id: novoId,
    tipo: 'receita',
    produto_nome: 'Transferência Pix Recebida',
    quantidade: 1,
    data: dados.data,
    observacao: 'Pix recebido de ' + (dados.remetente || 'Desconhecido') + ' - *Gerado Automaticamente. | ' + PIX_TAG + dados.pixId,
    valor_total: dados.valor,
    cliente_nome: dados.remetente || 'Consumidor Final',
    forma_pagamento: 'PIX',
    status: 'ATIVO',
    status_entrega: 'ENTREGUE',
    qtd_entregue: 1,
    desconto: 0,
    status_financeiro: 'PAGO',
    vencimento: dados.data,
    valor_pago: dados.valor,
    endereco_entrega: ''
  };

  return postSupabase('logs', payload, 'Receita Pix inserida: ' + dados.remetente + ' - ' + dados.valor);
}

// Resolve (com cache em ScriptProperties) o id de uma categoria de despesa
// pelo nome. As despesas referenciam a categoria por ID (categoria_id); o
// texto `item` serve apenas de historico.
function obterCategoriaDespesaId(nome) {
  if (!nome) return null;
  const props = PropertiesService.getScriptProperties();
  const cacheKey = 'CATDESP_' + nome;
  const cached = props.getProperty(cacheKey);
  if (cached) return Number(cached);

  const url = SUPABASE_URL + '/rest/v1/categorias_despesas?select=id&nome=eq.'
    + encodeURIComponent(nome) + '&limit=1';
  const options = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    muteHttpExceptions: true
  };
  try {
    const resp = UrlFetchApp.fetch(url, options);
    if (resp.getResponseCode() === 200) {
      const rows = JSON.parse(resp.getContentText()) || [];
      if (rows.length > 0) {
        props.setProperty(cacheKey, String(rows[0].id));
        return rows[0].id;
      }
    }
    Logger.log('Categoria de despesa nao encontrada: ' + nome + ' -> ' + resp.getContentText());
  } catch (e) {
    Logger.log('Erro ao buscar categoria de despesa: ' + e.message);
  }
  return null;
}

function inserirDespesaTransferencia(dados) {
  const nomeDestino = (dados.destinatario || '').toUpperCase().trim();
  for (let i = 0; i < EXCECOES_PIX.length; i++) {
    if (nomeDestino.indexOf(EXCECOES_PIX[i].toUpperCase()) !== -1) {
      Logger.log("Movimentacao interna detectada: " + dados.destinatario + " - Ignorando lancamento.");
      return true;
    }
  }

  const novoId = obterProximoId('despesas');
  if (!novoId) return false;

  const categoriaId = obterCategoriaDespesaId('PRÓ-LABORE');

  const payload = {
    id: novoId,
    item: 'PRÓ-LABORE',
    quantidade: 1,
    unidade: 'Un',
    custo: dados.valor,
    data: dados.data,
    categoria_id: categoriaId,
    observacao: 'Pago via PIX em ' + dados.data + ' - *Gerado Automaticamente. | ' + PIX_TAG + dados.pixId,
    fornecedor: dados.destinatario || '',
    status: 'PENDENTE'
  };

  return postSupabase('despesas', payload, 'Despesa Pix inserida: ' + dados.destinatario + ' - ' + dados.valor);
}

function postSupabase(tabela, payload, logOk) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const url = SUPABASE_URL + '/rest/v1/' + tabela;
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 201) {
    Logger.log(logOk);
    return true;
  }
  Logger.log("Erro ao inserir em " + tabela + ": " + response.getContentText());
  return false;
}

function obterProximoId(tabela) {
  const url = SUPABASE_URL + '/rest/v1/' + tabela + '?select=id&order=id.desc&limit=1';
  const options = {
    method: 'get',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    muteHttpExceptions: true
  };
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const dados = JSON.parse(response.getContentText());
      if (dados.length > 0 && dados[0].id) return Number(dados[0].id) + 1;
      return 1;
    }
    Logger.log("Erro ao buscar max id de " + tabela + ": " + response.getContentText());
    return null;
  } catch (e) {
    Logger.log("Excecao ao obter id: " + e.message);
    return null;
  }
}

function enviarResumoPix(logs) {
  if (LOG_EMAIL === 'sim') {
    const total = logs.length;
    let corpo = "Foram processadas " + total + " transferencias Pix:\n\n";
    logs.forEach(function (d) {
      const tipo = d.tipo === 'enviado' ? 'Enviado' : 'Recebido';
      const nome = d.destinatario || d.remetente || 'Desconhecido';
      corpo += tipo + " - " + nome + " - R$ " + d.valor.toFixed(2) + " - " + d.data + "\n";
    });
    MailApp.sendEmail(EMAIL_DESTINO, total + " transferências Pix processadas", corpo);
  } else {
    Logger.log("Log de e-mail desativado");
  }
}

// Use esta funcao no editor do Apps Script para testar manualmente.
function testarProcessamento() {
  processarPixNubank();
}
