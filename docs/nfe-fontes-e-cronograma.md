# NF-e — Fontes, Cronograma e Análise de Viabilidade

> Documento de referência do RV Portal. Objetivo: consolidar o cenário atual (2026),
> o cronograma da Reforma Tributária do Consumo, as fontes confiáveis para acompanhar
> mudanças e a análise realista de dificuldade para emissão de NF-e.
>
> Última revisão: **out/2026**. Revisar a cada 1–2 meses (ver rotina na seção 5).

---

## 1. Contexto atual

Vivemos no meio da **Reforma Tributária do Consumo** (EC 132/2023 + LC 214/2025) e de
mudanças estruturais no **CNPJ**. Isso redefine a complexidade da emissão fiscal:

- **IBS/CBS na NF-e (NT 2025.002 – RTC):** novos grupos **UB** (por item) e **W03**
  (totais), além de **CST IBS/CBS** e **cClassTrib**. Em 2026 a alíquota é simbólica
  (IBS 0,1% + CBS 0,9%), sem cobrança efetiva.
- **Regime Normal (CRT=3):** preenchimento obrigatório desde **03/08/2026**. A
  **rejeição por ausência** (regra UB12-10 / rejeição 1115) foi adiada "sem data" na
  NT 2025.002-RTC v1.51 — obrigatório preencher, mas ainda não bloqueia.
- **Simples Nacional / MEI (CRT=1 e CRT=4):** **dispensados em 2026**; obrigatoriedade
  em **04/01/2027** (Resoluções CGSN 190/2026 e 191/2026).
- **CNPJ alfanumérico:** NT Conjunta DFe 2025.001 + NT 2026.004 (homologação desde
  **15/06/2026**). Novos CNPJs alfanuméricos emitidos a partir de **julho/2026**.
- **NF-e Simplificada (varejo):** Ajuste Sinief 11/2025 — venda presencial para **PJ**
  deve sair em **NF-e 55** (substitui NFC-e 65 nesse caso); versão simplificada em
  desenvolvimento (**DANFE tipo 2**, `tpImp=6`, NT 2026.002).
- **NFS-e nacional (fora do escopo):** obrigatória para ME/EPP do Simples a partir de
  **01/11/2026** — não afeta a NF-e, mas afeta se houver prestação de serviço.

---

## 2. Linha do tempo

| Data | Marco |
|---|---|
| Jan/2026 | Campos IBS/CBS exigidos (regime normal); rejeição suspensa |
| 15/06/2026 | Homologação do CNPJ alfanumérico na NF-e/NFC-e |
| 03/08/2026 | IBS/CBS obrigatórios (regime normal); rejeição adiada |
| 01/11/2026 | NFS-e nacional obrigatória para ME/EPP do Simples |
| **04/01/2027** | **IBS/CBS obrigatórios para Simples Nacional e MEI** |
| 2027 | CBS em alíquota real, inicia *split payment*, Simples incorpora IBS/CBS |
| 2029–2032 | Extinção gradual de PIS/COFINS/ICMS/ISS |
| 2033 | Modelo IBS/CBS pleno |

**Leitura de prazo:** se a empresa for **Simples Nacional**, há folga até **jan/2027**
para o IBS/CBS — mas o cadastro (NCM/CFOP/cClassTrib) deve começar já.

---

## 3. Fontes confiáveis

### 3.1 Oficiais (primárias — o que realmente vale)

| Fonte | Link | O que acompanhar |
|---|---|---|
| Portal Nacional NF-e | https://www.nfe.fazenda.gov.br | Notas Técnicas, Informes, Schemas XSD, Manuais |
| Notas RTC (lista) | https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY= | NT 2025.002 e versões (IBS/CBS) |
| Portal DF-e SVRS | https://dfe-portal.svrs.rs.gov.br | Documentos + Validador RTC |
| Validador RTC NF-e | https://dfe-portal.svrs.rs.gov.br/Cff/ValidadorRtcNfe | Testar XML de IBS/CBS antes de emitir |
| SEFAZ Goiás | portal da Secretaria da Economia de GO | Autorizador local, prazos GO |
| Confaz | https://www.confaz.fazenda.gov.br | Ajustes Sinief (base das NTs) |
| Receita Federal | https://www.gov.br/receitafederal | CNPJ alfanumérico, Simples, NFS-e |
| NFS-e Nacional | https://www.gov.br/nfse | Se um dia entrar serviço |
| Comitê Gestor IBS | https://www.cgibs.gov.br | Regulamentação do IBS |

### 3.2 Setoriais (radar — confirme sempre no oficial)

- **Blog Tecnospeed / PlugNotas** — https://blog.tecnospeed.com.br
- **Focus NFe** — https://focusnfe.com.br (docs de API + blog fiscal)
- **eNotas** — https://enotas.com.br
- **Migrate / InvoiCy** — https://migrate.info/reforma-tributaria
- **TOTVS Fiscal** — blog de clientes fiscais
- **ACBr** (fórum + GitHub) e **nfephp-org/sped-nfe** (CHANGELOG)
- **Portal Contábeis**, **SPED Brasil**, **calculadoracontabil**

---

## 4. Dificuldade real

### 4.1 Fácil (o SaaS resolve)

- Assinatura XML, mTLS, SOAP, contingência, schemas, DANFE, novas NTs.
- Chamar REST do provedor via Edge Function e guardar XML/PDF no Storage.

### 4.2 Médio (trabalho próprio, não do provedor)

- Cadastros fiscais por produto: **NCM, CFOP, CST/CSOSN, cClassTrib, origem,
  unidade tributável**.
- Regras por operação: interna/interestadual, PJ/PF, consumidor final, **DIFAL/ST**
  (madeira tem particularidades em GO).
- CNPJ alfanumérico nos campos do destinatário.

### 4.3 O que mata o projeto ("morrer na praia")

1. **Cadastro fiscal errado** → rejeição em série. É o risco nº 1 — fiscal, não técnico.
2. **Self-host** (assinar/transmitir por conta própria): exigiria acompanhar *toda* NT
   e a reforma até 2033. Inviável para o porte da operação.
3. **Ignorar 2027:** no Simples ou no Normal, a falta de cClassTrib passa a rejeitar.

---

## 5. Rotina de acompanhamento sugerida

- **Semanal:** checar Informes/Notas no portal NF-e + 1 blog setorial.
- **Mensal:** rodar o **Validador RTC** com um XML real de homologação.
- **A cada NT nova:** confirmar se o provedor SaaS já implementou; se não, abrir ticket.

---

## 6. O que compensa e o que não compensa

**Compensa:**

- **SaaS via Edge Function** — o provedor absorve SEFAZ/Reforma; nós cuidamos dos cadastros.
- **Adapter** (`FiscalProvider`) para trocar de provedor sem refazer o app.
- **Homologação desde já**, alimentada pelo Validador RTC.
- Iniciar a **Fase 1 (cadastros fiscais)** agora — independe do contador.

**Não compensa:**

- **Self-host** de biblioteca (sped-nfe / erpbrasil) para negócio pequeno.
- Integrar **NFC-e/NFS-e agora** (escopo mudando: NFC-e simplificada; NFS-e nacional).
- Emitir **antes** do contador definir regime/CFOP/CSOSN/NCM.

---

## 7. Veredito

**É viável — não vamos morrer na praia**, desde que:

1. Usemos **SaaS** (decisão tomada).
2. O regime seja confirmado (**Simples Nacional** dá folga até jan/2027).
3. O **cadastro fiscal** seja tratado como tarefa séria com o contador.

O limitante não é a tecnologia (~1 mês de trabalho); é a **qualidade do cadastro** e a
**velocidade das mudanças da reforma**, que o SaaS cobre — o cadastro, não.

### Perguntas que definem tudo (com o contador)

1. Regime hoje: **Simples Nacional** (CRT=1) ou Normal (CRT=3)?
2. Goiás trata a madeira com **ST/antecipação**? Há venda interestadual a consumidor
   final (DIFAL)?

---

## 8. Checklist de cadastro fiscal (para levar ao contador)

**Emitente:** CNPJ, razão social, nome fantasia, IE, CRT (regime), endereço completo +
código IBGE do município, CNAE, série e numeração por modelo, ambiente.

**Produto (por item):** NCM, CEST (se ST), CFOP padrão, origem, CST/CSOSN de ICMS,
CST de PIS/COFINS, cClassTrib (IBS/CBS), unidade tributável, GTIN (se houver),
peso líquido/bruto.

**Cliente (por destinatário):** CPF/CNPJ, IE (e indicador de IE), código IBGE do
município, e-mail, indicador de consumidor final.

---

## 9. MarketUP — dá para "empurrar" nossos dados e só finalizar a NF? (Não)

**Pergunta:** gerar/empurrar os dados do nosso sistema para a MarketUP, para o usuário
só conferir e finalizar a NF por lá.

**Resposta:** **não é possível** — e a MarketUP não tem API pública. O único caminho de
entrada por arquivo é a **importação de XML** em `VENDAS > PEDIDOS > Importar`, e ele
serve para **notas já emitidas**, não para emitir.

### O que a importação de XML realmente faz

| Recurso | O que aceita | Para quê serve |
|---|---|---|
| Importar XML de venda | XML de **NF-e já autorizada** (tem `chave de acesso`) | Histórico de vendas + cadastro de produtos/clientes |
| Importar vários (XML) | ZIP com até **50 XMLs** de NF-e já emitidas | Mesma coisa, em massa |
| Emitir NF pelo Pedido | Pedido **criado manualmente** dentro da MarketUP | Emissão NF-e (produto) / NFS-e (serviço) |

### Por que não fecha o fluxo desejado

1. **A importação exige XML de nota pronta.** O XML de uma NF-e carrega a **chave de
   acesso**, `nProt`, protocolo de autorização da SEFAZ. Sem nota emitida, não há XML
   para importar — então não dá para "empurrar o pedido" e deixar a MarketUP emitir.
2. **Não existe endpoint de criação de pedido.** Sem API pública (confirmado por
   resposta oficial de 2023, ausência de repos/Swagger), o pedido só nasce manualmente
   na interface — exatamente a digitação que se queria evitar.
3. **Não há API de emissão.** A MarketUP emite internamente; não expõe emissão por API.
4. **Sentido invertido.** O XML é **canal de entrada** (trazer notas de outro emissor),
   não de saída. A MarketUP ainda tem "**exportar XML das notas**" — ou seja, para
   *receber* nosso XML ela exigiria que o XML já fosse uma nota emitida por nós.

### Conclusão

O fluxo "nosso sistema → MarketUP → usuário só confere/finaliza" **não é suportado**.
Para usar a MarketUP como emissor, o pedido continuaria sendo digitado manualmente lá.
Isso **reforça a decisão** já tomada: **seguir com provedor de API real** via Edge
Function (Focus NFe / PlugNotas / eNotas), onde o fluxo "criar nota → assinar →
transmitir → receber XML/PDF" acontece de ponta a ponta por API.

Uso legítimo da MarketUP no nosso cenário: **emissor manual isolado** (se hoje é o que
se faz) ou, no futuro, **destino** de XML já emitido — nunca como emissor programático.

## 10. Existe API de NF-e gratuita e confiável? (Não — só "grátis mas você opera")

**Pergunta:** assim como a MarketUP é um emissor gratuito, existe alguma **API de NF-e
gratuita e confiável**?

**Resposta curta:** **não existe** uma API de NF-e **gerenciada, permanente e gratuita**.
O que existe é: (a) o canal oficial da SEFAZ, que é gratuito mas você implementa tudo;
(b) bibliotecas **open-source** gratuitas, mas **self-host** (você opera); (c) **apps do
governo** gratuitos, mas manuais e sem API; e (d) APIs comerciais com **trial grátis**,
que passam a cobrar por documento. Segue o detalhamento.

### 10.1 As quatro categorias

| Categoria | Exemplos | Custo | É API pronta? | Confiável? | Serve p/ o nosso caso? |
|---|---|---|---|---|---|
| **Canal oficial SEFAZ** | Web services SOAP da SEFAZ (`NFeAutorizacao`, etc.) | **Grátis** (o certificado A1 é pago) | Não — você monta | Sim, é a fonte | Só com esforço grande de dev |
| **Open-source (self-host)** | **ACBr** (Delphi), **NFePHP / sped-nfe** (PHP), erpbrasil (Ruby) | **Grátis** (software) | Biblioteca, não serviço | Sim, mantidas | Exige servidor + operação |
| **Apps do governo** | **Nota Fiscal Fácil (NFF)** (ENCAT), emissores estaduais, NFA-e | **Grátis** | Não — app manual | Sim | Não integra (é manual) |
| **Comercial (trial grátis)** | Focus NFe, Nuvem Fiscal, PlugNotas, eNotas, NFE.io | Trial grátis → **pago por doc** | Sim | Sim | Sim (decisão atual) |

### 10.2 Detalhes por categoria

**a) Canal oficial da SEFAZ (o "grátis" de verdade).** Os web services da SEFAZ que
autorizam a NF-e **não cobram nada**. O "custo" é de engenharia: certificado A1, mTLS,
XMLDSig, schemas XSD, contingência, assinatura, atualização a cada NT e à Reforma até
2033. É exatamente esse trabalho que os SaaS vendem. Ou seja, "API grátis" na prática =
"você vira o fornecedor".

**b) Open-source (gratuito, mas self-host).**
- **ACBr** — projeto brasileiro mais usado (Pascal/Delphi, ~30 mil commits, ativo).
  Fontes/DLLs para NF-e, NFC-e, NFS-e, CT-e, SPED.
- **NFePHP (`nfephp-org/sped-nfe`)** — 1.6k estrelas, licença MIT/LGPL, **ativo**: já
  atualizado com NT 2025.002-RTC (Reforma) e NT Conjunta 2025.001 (CNPJ alfanumérico).
- Outros: `erpbrasil` (Ruby), `pynfe` (Python), libs Node (menos maduras).
  Todas são **bibliotecas**, não serviços: precisam de **servidor próprio**, certificado
  A1 e alguém mantendo. Contraria a decisão "sem self-host" e não temos backend próprio.

**c) Apps do governo (gratuitos, sem API).**
- **Nota Fiscal Fácil (NFF)** — app/web gratuito do ENCAT para **MEI e baixo volume**;
  emite NF-e/NFC-e/NFA-e de forma **manual**. Não é API e não fala com nosso sistema.
- **Emissor de NF-e estadual / Nota Fiscal Avulsa (NFA-e)** — gratuitos, manuais.
- Uso legítimo: como **contingência** se o SaaS estiver indisponível.

**d) APIs comerciais com trial grátis (depois pagam).**
- **Focus NFe** — **30 dias de teste**; depois **R$94,90/mês** (plano Solo, 100 docs/mês,
  R$0,11 por doc extra; Retail NFC-e R$62,90). Sem setup nem fidelidade. Documentação
  aberta, webhooks, SVG. É a referência de preço.
- **Nuvem Fiscal**, **PlugNotas (Tecnospeed)**, **eNotas**, **NFE.io** — também com
  trial/sandbox; cobram por documento depois. (Preços variam; conferir à época.)
- ERPs com **plano gratuito** (ex.: Bling) têm API, mas **conferir se o plano grátis
  inclui emissão fiscal** — normalmente a NF-e fica nos planos pagos.

### 10.3 Veredito

1. **Não há almoço grátis gerenciado.** Nenhuma API comercial é gratuita de forma
   permanente; todas cobram por documento após o trial.
2. **O "grátis" real = operar você mesmo** (SEFAZ direto + ACBr/NFePHP). Isso não é
   "API gratuita", é assumir o problema que o SaaS resolve.
3. **Para o nosso caso**, a relação custo/risco continua favorecendo o **SaaS pago**:
   ~**R$95–120/mês** (Focus Solo) cobre a operação e absorve a Reforma, contra o custo
   de manter servidor + biblioteca + certificado + atualização de NT indefinidamente.
4. **Estratégia recomendada:** começar pelo **trial de 30 dias da Focus NFe** para
   validar o fluxo ponta a ponta sem custo; manter **ACBr/NFF** documentados como
   **contingência**; e encapsular tudo no adapter `FiscalProvider` para trocar de
   provedor (ou migrar para self-host) sem tocar no app.

> Observação: o certificado digital **A1 (eCNPJ)** é obrigatório em qualquer rota
> (SaaS ou self-host) e **é pago** (renovação anual). Logo, "gratuito 100%" não existe.

## Referências

- Emenda Constitucional nº 132/2023.
- Lei Complementar nº 214/2025.
- Nota Técnica 2025.002 (RTC) — NF-e/NFC-e — Portal Nacional NF-e.
- Nota Técnica 2026.004 — CNPJ alfanumérico — Portal Nacional NF-e.
- Ajuste Sinief 11/2025 e 24/2024.
- Resoluções CGSN 190/2026 e 191/2026.
