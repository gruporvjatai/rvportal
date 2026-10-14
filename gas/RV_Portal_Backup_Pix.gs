// ==========================================
// CONFIGURAÇÕES DO SISTEMA DE BACKUP RV PORTAL
// ==========================================
const SUPABASE_URL = 'https://lyieiqhkspbowsrlngvn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aWVpcWhrc3Bib3dzcmxuZ3ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM5ODA3MywiZXhwIjoyMDg4OTc0MDczfQ.mhZCDb4XFw1Cna4R3Vk2YKmEiVRJwocXEkq7GqsNiW4';
const SPREADSHEET_ID = '1jxNW0OohTXplnJn77Z34f7FIUB8uyDawQLnUBEGgi_s';
const EMAIL_DESTINO = 'rvportalmadeiras@gmail.com';
const LOG_EMAIL = 'não';

const TABELAS = [
  'produtos', 'clientes', 'logs', 'despesas', 'usuarios', 'equipe', 'folhas', 'vales',
  'mdf_orcamentos', 'mdf_itens', 'mdf_agenda',
  // Tabelas novas (migracoes 14/15/16/22/23) — passaram a existir depois que o
  // backup foi escrito; sem elas o backup ficaria incompleto.
  'categorias',
  'categorias_despesas',
  'recebimento_lotes',
  'pagamento_lotes'
];

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
    Logger.log('Antes de processarPixNubank');
    processarPixNubank();
    Logger.log('Apos processarPixNubank');
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
// FUNÇÃO PRINCIPAL QUE RODA O BACKUP
// ==========================================
function executarBackupSupabase() {
  const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
  let relatorioEmail = "Resumo do Backup Diário - RV Portal:\n\n";
  let houveErro = false;

  const options = {
    'method': 'get',
    'headers': {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    'muteHttpExceptions': true
  };

  TABELAS.forEach(tabela => {
    try {
      let todosOsDados = [];
      let offset = 0;
      const limite = 1000;
      let buscando = true;

      while (buscando) {
        let url = `${SUPABASE_URL}/rest/v1/${tabela}?select=*&offset=${offset}&limit=${limite}`;
        let response = UrlFetchApp.fetch(url, options);

        if (response.getResponseCode() === 200) {
          let dados = JSON.parse(response.getContentText());

          if (dados.length > 0) {
            todosOsDados = todosOsDados.concat(dados);
            if (dados.length < limite) {
              buscando = false;
            } else {
              offset += limite;
            }
          } else {
            buscando = false;
          }
        } else {
          throw new Error("Erro na API: " + response.getContentText());
        }
      }

      if (todosOsDados.length > 0) {
        salvarNaAba(planilha, tabela, todosOsDados);
        relatorioEmail += `Tabela '${tabela}': Backup concluído com sucesso. (${todosOsDados.length} registros salvos)\n`;
      } else {
        relatorioEmail += `Tabela '${tabela}': Tabela vazia. Nenhum dado salvo.\n`;
      }

    } catch (erro) {
      houveErro = true;
      relatorioEmail += `Tabela '${tabela}': Erro ao fazer backup - ${erro.message}\n`;
      Logger.log("Erro na tabela " + tabela + ": " + erro);
    }
  });

  enviarEmailConfirmacao(relatorioEmail, houveErro);
}

function salvarNaAba(planilha, nomeAba, dadosJson) {
  let aba = planilha.getSheetByName(nomeAba);
  if (!aba) {
    aba = planilha.insertSheet(nomeAba);
  }

  aba.clear();

  const cabecalhos = Object.keys(dadosJson[0]);
  const dadosPlanilha = dadosJson.map(linha => {
    return cabecalhos.map(coluna => {
      let valor = linha[coluna];
      if (typeof valor === 'object' && valor !== null) return JSON.stringify(valor);
      return valor;
    });
  });

  const tabelaFinal = [cabecalhos].concat(dadosPlanilha);
  aba.getRange(1, 1, tabelaFinal.length, tabelaFinal[0].length).setValues(tabelaFinal);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, cabecalhos.length).setFontWeight("bold").setBackground("#f1f5f9");
}

function enviarEmailConfirmacao(resumo, houveErro) {
  const assunto = houveErro ? "AVISO: Backup RV Portal concluído com ERROS" : "SUCESSO: Backup RV Portal realizado";
  const corCabecalho = houveErro ? "#ef4444" : "#10b981";
  const corBorda = houveErro ? "#dc2626" : "#059669";
  const resumoHtml = resumo.replace(/\n/g, '<br>');

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: ${corCabecalho}; padding: 25px 20px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-weight: 600; letter-spacing: 0.5px; font-size: 24px;">Relatório de Backup</h2>
            <p style="margin: 5px 0 0 0; font-size: 15px; opacity: 0.9;">RV Portal Madeiras</p>
        </div>
        <div style="padding: 35px 30px; background-color: #ffffff; color: #334155; line-height: 1.6;">
            <p style="font-size: 16px; margin-top: 0;">Olá!</p>
            <p style="font-size: 16px;">O sincronismo de segurança do banco de dados <strong>Supabase</strong> foi finalizado. Confira o status de cada tabela abaixo:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid ${corBorda}; margin: 25px 0; border-radius: 0 8px 8px 0; color: #475569; font-size: 14px;">
                ${resumoHtml}
            </div>
            <p style="font-size: 14px; color: #64748b; margin-top: 35px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <strong>Dica do Sistema:</strong> Este processo garante a proteção dos seus dados em nuvem e impede que o servidor entre em modo de inatividade.
            </p>
        </div>
        <div style="background-color: #f1f5f9; text-align: center; padding: 15px; font-size: 12px; color: #94a3b8;">
            Sistema Autônomo &bull; Gerado automaticamente pelo ERP
        </div>
    </div>
  `;

  MailApp.sendEmail({
    to: EMAIL_DESTINO,
    subject: assunto,
    htmlBody: htmlBody
  });
}

function fazerBackupPlanilha() {
  const idPlanilha = '1jxNW0OohTXplnJn77Z34f7FIUB8uyDawQLnUBEGgi_s';
  const idPastaDestino = '1tIwxzy_tfl-ypyHBB6LOQtnoH4PXoZ8T';

  try {
    const arquivoOrigem = DriveApp.getFileById(idPlanilha);
    const pastaDestino = DriveApp.getFolderById(idPastaDestino);
    const dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
    const nomeOriginal = arquivoOrigem.getName();
    const nomeBackup = "Backup - " + nomeOriginal + " - " + dataAtual;
    arquivoOrigem.makeCopy(nomeBackup, pastaDestino);
    Logger.log("Backup realizado com sucesso: " + nomeBackup);
  } catch (erro) {
    Logger.log("Erro ao realizar o backup: " + erro.message);
  }
}

function excluirBackupsAntigos() {
  const idPastaDestino = '1tIwxzy_tfl-ypyHBB6LOQtnoH4PXoZ8T';
  const pastaDestino = DriveApp.getFolderById(idPastaDestino);
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30);
  const arquivos = pastaDestino.getFiles();
  let excluidos = 0;

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    if (arquivo.getDateCreated() < dataLimite) {
      try {
        if (arquivo.getName().startsWith("Backup -")) {
          arquivo.setTrashed(true);
          excluidos++;
          Logger.log("Backup excluido: " + arquivo.getName());
        }
      } catch (erro) {
        Logger.log("Erro ao excluir " + arquivo.getName() + ": " + erro.message);
      }
    }
  }

  Logger.log("Limpeza concluida. " + excluidos + " backup(s) removido(s).");
}

//===================================================================================================================================================
// PIX NUBANK
//===================================================================================================================================================

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
        Logger.log('Transferencia interna para "' + nomeDestino + '" – NAO lancada.');
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
    // Pix RECEBIDO = dinheiro ja entrou na conta => titulo ja quitado.
    // (Antes ficava 'PENDENTE' junto com valor_pago cheio, o que era
    //  contraditorio: o app calcula o status pelos logs de baixa.)
    status_financeiro: 'PAGO',
    vencimento: dados.data,
    valor_pago: dados.valor,
    endereco_entrega: ''
  };

  return postSupabase('logs', payload, 'Receita Pix inserida: ' + dados.remetente + ' - ' + dados.valor);
}

// Resolve (com cache em ScriptProperties) o id de uma categoria de despesa
// pelo nome. Apos a migracao 16 as categorias passaram a ser referenciadas por
// ID em despesas.categoria_id; o texto `item` serve apenas de historico.
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

  // Categoria padrao dos Pix enviados. Antes gravava so o texto 'PROLABORE'
  // e deixava categoria_id nulo; agora vincula a categoria oficial 'PRÓ-LABORE'.
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

function testarProcessamento() {
  processarPixNubank();
}

function testarAutorizacao() {
  var agendas = CalendarApp.getAllCalendars();
  var meuEmail = Session.getActiveUser().getEmail();

  if (meuEmail) {
    MailApp.sendEmail({
      to: meuEmail,
      subject: "Autorização Concluída - Videira Jataí",
      htmlBody: "<b>Sucesso!</b> Se você recebeu este e-mail, significa que o Google liberou as permissões de envio."
    });
    Logger.log("E-mail de teste enviado para: " + meuEmail);
  } else {
    Logger.log("Autorização concluída!");
  }
}
