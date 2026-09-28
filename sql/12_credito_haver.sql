-- 12_credito_haver.sql
-- Modulo de Credito em Haver por cliente.
-- Somente DDL (metadado). Nao faz backfill/altera dados existentes.
-- A coluna nasce 0 para todos os clientes; o operador lanca/edita manualmente
-- na ficha do cliente e o saldo e abatido no Financeiro > Contas a Receber.

-- Saldo de credito em haver do cliente (crédito a favor do cliente).
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS credito_haver numeric(12,2) NOT NULL DEFAULT 0;

-- RLS: as politicas "autenticado all" ja cobrem a tabela clientes; nenhuma acao extra.
-- O DEFAULT 0 nao e aplicado retroativamente em linhas antigas (Postgres apenas
-- registra o metadado), entao registros existentes continuam como estavam.

-- Como usar o credito:
--   * Entrada: ficha do cliente > "Credito em Haver (R$)".
--   * Uso: Financeiro > Contas a Receber > BAIXAR > "Usar credito em haver".
--     Cada uso gera um log tipo 'recebimento' com forma_pagamento = 'Credito em Haver'
--     e debita clientes.credito_haver. Estornar a baixa devolve o valor ao cliente.
--   * O credito NAO entra no caixa/receita (so abate o saldo do titulo).
