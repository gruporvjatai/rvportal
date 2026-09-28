-- 13_credito_haver_obs.sql
-- Complemento do modulo de Credito em Haver: referencia/observacao do credito.
-- Somente DDL (metadado). Nao faz backfill/altera dados existentes.

-- Observacao/referencia do credito em haver do cliente
-- (ex.: "Devolucao venda #123", "Pagamento a maior PIX 12/09").
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS credito_haver_obs text;

-- RLS: as politicas "autenticado all" ja cobrem a tabela clientes; nenhuma acao extra.
