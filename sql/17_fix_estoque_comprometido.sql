-- 17_fix_estoque_comprometido.sql
-- Corrige o "estoque_comprometido" dos produtos para refletir os logs de venda
-- que ainda NAO foram expedidos (quantidade - qtd_entregue dos logs de venda
-- ativos). Regra de negocio:
--   Comprometido = soma do que falta entregar das vendas em aberto.
-- Produtos de servico e produtos de parceiro nao controlam estoque, portanto
-- ficam com comprometido = 0.
--
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- Faz backup da tabela produtos antes de alterar.

-- 1) Backup da tabela produtos (se ainda nao existir).
create table if not exists public.produtos_backup_20261008 as
select * from public.produtos;

-- 2) Recalcula o comprometido a partir dos logs de venda pendentes.
--    Casa o log pelo produto_id e, quando o log nao tem id (dados antigos),
--    pelo nome do produto (case-insensitive, sem espacos nas pontas).
with pend as (
    select
        p.id,
        coalesce(sum(
            case
                when l.tipo = 'venda'
                 and l.status <> 'CANCELADO'
                 and (l.quantidade - coalesce(l.qtd_entregue, 0)) > 0
                then (l.quantidade - coalesce(l.qtd_entregue, 0))
                else 0
            end
        ), 0) as derived
    from public.produtos p
    left join public.logs l
        on (l.produto_id = p.id)
        or (l.produto_id is null and upper(trim(l.produto_nome)) = upper(trim(p.nome)))
    where coalesce(p.tipo, 'produto') <> 'servico'
      and coalesce(p.produto_parceiro, false) = false
    group by p.id
)
update public.produtos p
set estoque_comprometido = pend.derived
from pend
where pend.id = p.id
  and p.estoque_comprometido <> pend.derived;

-- 3) Servico e parceiro nunca reservam estoque.
update public.produtos
set estoque_comprometido = 0
where (coalesce(tipo, 'produto') = 'servico'
   or coalesce(produto_parceiro, false) = true)
  and estoque_comprometido <> 0;
