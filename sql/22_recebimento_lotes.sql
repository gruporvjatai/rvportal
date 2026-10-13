-- ============================================================
-- MIGRACAO 22: Recebimento em Lote
--
-- Objetivo: permitir que varias contas a receber sejam baixadas
--   juntas (uma unica forma de pagamento no lote) e que o estorno
--   saiba que aquelas baixas vieram de um mesmo lote.
--
-- Modelo (o mesmo da baixa individual): cada baixa continua sendo
--   uma linha em logs (tipo='recebimento', observacao='Ref Lanc #<id>').
--   A novidade e a coluna logs.lote_id, que aponta para o cabecalho
--   do lote em recebimento_lotes. O titulo continua independente;
--   cada titulo mantem o seu proprio uid (o estorno individual
--   cancela por uid e NAO deve cancelar os outros titulos).
--
-- COMO USAR: rode no Supabase SQL Editor.
-- PODE SER RODADO QUANTAS VEZES QUISER (idempotente).
-- ============================================================

-- 1) logs.lote_id (texto: id do cabecalho do lote)
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS lote_id text;

CREATE INDEX IF NOT EXISTS idx_logs_lote_id ON public.logs(lote_id);

-- 2) Tabela de cabecalho do lote de recebimento
CREATE TABLE IF NOT EXISTS public.recebimento_lotes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data        timestamptz NOT NULL DEFAULT now(),
    cliente_id  text,
    cliente_nome text,
    total       numeric(14,2) NOT NULL DEFAULT 0,
    qtd_titulos integer NOT NULL DEFAULT 0,
    usuario     text,
    observacao  text,
    estornado   boolean NOT NULL DEFAULT false,
    estornado_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- cliente_id copia o tipo de clientes.id (caso seja uuid/bigint),
-- ajustando de 'text' para o tipo real quando necessario.
DO $$
DECLARE
    v_tipo text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO v_tipo
      FROM pg_attribute a
      JOIN pg_class c     ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'clientes'
       AND a.attname = 'id'
       AND NOT a.attisdropped;

    IF v_tipo IS NOT NULL AND v_tipo <> 'text' THEN
        BEGIN
            EXECUTE format('ALTER TABLE public.recebimento_lotes ALTER COLUMN cliente_id TYPE %s USING cliente_id::%s', v_tipo, v_tipo);
        EXCEPTION WHEN others THEN
            -- Se nao conseguir converter (tabela vazia / valores invalidos), mantem text.
            RAISE NOTICE 'recebimento_lotes.cliente_id mantido como text: %', SQLERRM;
        END;
    END IF;
END $$;

-- 3) RLS: somente autenticados (mesmo padrao das demais tabelas)
ALTER TABLE public.recebimento_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_authenticated_all ON public.recebimento_lotes;
CREATE POLICY rls_authenticated_all ON public.recebimento_lotes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_lotes TO authenticated;
REVOKE ALL ON public.recebimento_lotes FROM anon;
