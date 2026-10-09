-- 20_movimentacoes.sql
-- Auditoria de movimentacao de produtos: compras (entrada/reposicao),
-- alteracoes de preco e de custo. Idempotente.

-- Garante a coluna de custo no cadastro de produtos (ja usada pela aplicacao).
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS custo numeric;

-- Campos de auditoria em logs (genericos, nao quebram registros existentes).
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS valor_antigo   numeric;
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS valor_novo     numeric;
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS campo_alterado text;
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS valor_unitario numeric;
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS fornecedor     text;
