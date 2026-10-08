-- 18_fix_despesas_categoria_salario.sql
-- Corrige despesas de salario que ficaram sem categoria_id.
--
-- Contexto: apos a migracao 16 (categorias por id), a aba Equipe passou a ser o
-- unico ponto de lancamento de despesa que nao gravava categoria_id, deixando as
-- despesas de folha ("item" = SALARIO) sem vinculo de categoria. O app foi
-- ajustado em abas/equipe.js para gravar categoria_id = SALARIO. Esta migracao
-- repara os registros historicos afetados.
--
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- Preserva o campo textual legado `item`.

update public.despesas d
set categoria_id = c.id
from public.categorias_despesas c
where d.categoria_id is null
  and upper(c.nome) = 'SALÁRIO'
  and upper(coalesce(d.item, '')) = 'SALÁRIO';
