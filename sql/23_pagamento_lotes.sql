-- ============================================================
-- MIGRACAO 23: Pagamento em Lote (Contas a Pagar)
--
-- Objetivo: permitir que varias contas a pagar (despesas) sejam
--   baixadas juntas (uma unica forma de pagamento no lote) e que o
--   estorno saiba que aquelas baixas vieram de um mesmo lote.
--
-- Modelo (o mesmo da baixa individual): cada baixa continua sendo
--   uma linha em logs (tipo='despesa', observacao='Ref Despesa #<id>').
--   A novidade e a coluna logs.lote_id (ja criada na migracao 22),
--   que aponta para o cabecalho do lote em pagamento_lotes. O titulo
--   continua independente; cada titulo mantem o seu proprio uid (o
--   estorno individual cancela por uid e NAO deve cancelar os outros
--   titulos).
--
-- COMO USAR: rode no Supabase SQL Editor.
-- PODE SER RODADO QUANTAS VEZES QUISER (idempotente).
-- ============================================================

-- 1) logs.lote_id (garante a coluna tambem caso a migracao 22 nao tenha rodado)
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS lote_id text;

CREATE INDEX IF NOT EXISTS idx_logs_lote_id ON public.logs(lote_id);

-- 2) Tabela de cabecalho do lote de pagamento
CREATE TABLE IF NOT EXISTS public.pagamento_lotes (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data          timestamptz NOT NULL DEFAULT now(),
    fornecedor_id text,
    fornecedor    text,
    total         numeric(14,2) NOT NULL DEFAULT 0,
    qtd_titulos   integer NOT NULL DEFAULT 0,
    usuario       text,
    observacao    text,
    estornado     boolean NOT NULL DEFAULT false,
    estornado_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS: somente autenticados (mesmo padrao das demais tabelas)
ALTER TABLE public.pagamento_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_authenticated_all ON public.pagamento_lotes;
CREATE POLICY rls_authenticated_all ON public.pagamento_lotes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamento_lotes TO authenticated;
REVOKE ALL ON public.pagamento_lotes FROM anon;
