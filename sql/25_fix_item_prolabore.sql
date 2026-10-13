-- 25_fix_item_prolabore.sql
-- Corrige o texto legado `item` das despesas de PIX que entraram como
-- 'PROLABORE' (sem acento/hifen) em vez de 'PRÓ-LABORE'.
--
-- Contexto: o Google Apps Script gravava item = 'PROLABORE'. Apos a migracao 16
-- o texto `item` virou apenas historico/compat, mas ainda aparece em relatorios
-- e como fallback de exibicao. Esta migracao alinha o texto a categoria oficial.
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.

UPDATE public.despesas
   SET item = 'PRÓ-LABORE'
 WHERE upper(btrim(coalesce(item, ''))) IN ('PROLABORE', 'PRO-LABORE');

-- Conferencia:
-- SELECT count(*) FROM public.despesas
--  WHERE upper(btrim(coalesce(item,''))) IN ('PROLABORE','PRO-LABORE'); -- deve ser 0
