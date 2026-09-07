-- ============================================================
-- MIGRACAO 8: Preparar coluna "tipo" em clientes
--
-- Prepara o banco para a futura aba "Pessoas" (clientes + 
-- fornecedores) sem quebrar nenhuma tela atual:
--   * Adiciona a coluna 'tipo' com default 'cliente'
--   * Toda linha existente vira 'cliente' (retrocompativel)
--   * CHECK limita os valores a 'cliente' e 'fornecedor'
--   * Indice para filtro futuro por tipo
--   * View 'v_contagem_clientes_tipo' para acompanhar a divisao
--
-- O SISTEMA JA ESTA PREPARADO: sistema.html e mobile.html mapeiam
-- c.tipo (fallback 'cliente') e o formulario atual cria/edita sem
-- enviar 'tipo' (banco assume 'cliente'), entao nada quebra.
--
-- COMO USAR: rode no Supabase SQL Editor (preferencialmente 1x).
-- ============================================================

ALTER TABLE public.clientes
    ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'cliente';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.clientes'::regclass
          AND conname = 'clientes_tipo_check'
    ) THEN
        ALTER TABLE public.clientes
            ADD CONSTRAINT clientes_tipo_check
            CHECK (tipo IN ('cliente', 'fornecedor'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON public.clientes (tipo);

CREATE OR REPLACE VIEW public.v_contagem_clientes_tipo AS
SELECT
    tipo,
    COUNT(*) AS total
FROM public.clientes
GROUP BY tipo
ORDER BY tipo;
