-- 24_backfill_prolabore_pix.sql
-- Repara despesas de PIX (enviado) que entraram sem categoria.
--
-- Contexto: o Google Apps Script que le os e-mails de transferencia do Nubank
-- gravava item = 'PROLABORE' e deixava despesas.categoria_id NULO. Apos a
-- migracao 16 (categorias por id) isso deixou esses lancamentos fora dos
-- filtros/relatorios por categoria. O GAS ja foi corrigido para gravar
-- categoria_id = 'PRÓ-LABORE'; esta migracao conserta os registros historicos.
--
-- Idempotente: so mexe em quem ainda esta sem categoria_id.
-- Preserva o campo textual legado `item`.

UPDATE public.despesas d
   SET categoria_id = c.id
  FROM public.categorias_despesas c
 WHERE d.categoria_id IS NULL
   AND upper(c.nome) = 'PRÓ-LABORE'
   AND upper(btrim(coalesce(d.item, ''))) IN ('PROLABORE', 'PRÓ-LABORE', 'PRO-LABORE');

-- Conferencia:
-- SELECT count(*) FROM public.despesas WHERE categoria_id IS NULL;
