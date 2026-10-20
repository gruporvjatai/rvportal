-- ============================================================
-- MIGRACAO 28: grupo_dre nas categorias de despesa
--
-- Objetivo: permitir que o Painel Executivo monte a DRE sem
-- duplicar compras de estoque com o CMV.
--
-- Grupos:
--   CUSTO       -> ja esta no CMV (compras/producao/instalacao)
--   OPERACIONAL -> despesa operacional
--   FINANCEIRA  -> juros, tarifas bancarias
--   TRIBUTO     -> impostos e taxas
--   OUTROS      -> demais lancamentos
--
-- Idempotente: pode rodar mais de uma vez sem sobrescrever
-- uma classificacao ja feita manualmente.
-- ============================================================

ALTER TABLE public.categorias_despesas
    ADD COLUMN IF NOT EXISTS grupo_dre text;

UPDATE public.categorias_despesas
   SET grupo_dre = CASE
        WHEN upper(nome) LIKE 'FORNECEDOR%'
          OR upper(nome) LIKE 'MERCADORIA%'
          OR upper(nome) LIKE 'MARCENARIA%'
          OR upper(nome) LIKE 'INSTALA%'
            THEN 'CUSTO'
        WHEN upper(nome) LIKE 'IMPOSTO%'
            THEN 'TRIBUTO'
        WHEN upper(nome) LIKE 'JUROS%'
          OR upper(nome) LIKE '%TAXA%'
            THEN 'FINANCEIRA'
        WHEN upper(nome) LIKE 'OUTROS%'
            THEN 'OUTROS'
        ELSE 'OPERACIONAL'
       END
 WHERE grupo_dre IS NULL;

ALTER TABLE public.categorias_despesas
    ALTER COLUMN grupo_dre SET DEFAULT 'OPERACIONAL';

ALTER TABLE public.categorias_despesas
    ALTER COLUMN grupo_dre SET NOT NULL;

ALTER TABLE public.categorias_despesas
    DROP CONSTRAINT IF EXISTS categorias_despesas_grupo_dre_chk;

ALTER TABLE public.categorias_despesas
    ADD CONSTRAINT categorias_despesas_grupo_dre_chk
    CHECK (grupo_dre IN ('CUSTO', 'OPERACIONAL', 'FINANCEIRA', 'TRIBUTO', 'OUTROS'));

-- Conferencia:
-- SELECT nome, grupo_dre FROM public.categorias_despesas ORDER BY nome;
