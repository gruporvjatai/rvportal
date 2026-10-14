-- 26_padronizar_status_financeiro_pendente.sql
-- Padroniza o status financeiro dos titulos A RECEBER.
--
-- Contexto: o sistema gravava o status de titulo em aberto de duas formas
-- diferentes ("A RECEBER" na criacao da venda e "PENDENTE" ao estornar uma
-- baixa / parcelar / lancar receita avulsa). Essa divergencia quebrava regras
-- que dependiam do valor exato (ex.: botao de parcelamento no desktop).
-- Padrao unico a partir de agora: "A RECEBER" para titulo em aberto sem baixa,
-- "PARCIAL" quando ha baixa parcial e "PAGO" quando quitado.
--
-- Afeta somente as tabelas SEM prefixo "jsp" (logs e do sistema RV Portal).
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.
-- Faz backup da tabela logs antes de alterar.

-- 1) Backup da tabela logs (se ainda nao existir).
create table if not exists public.logs_backup_20261014 as
select * from public.logs;

-- 2) Normaliza titulos em aberto de venda/receita gravados como PENDENTE.
--    Considera apenas registros nao cancelados e sem baixa (valor_pago = 0),
--    ou seja, os que realmente estao "A RECEBER".
update public.logs
set status_financeiro = 'A RECEBER'
where tipo in ('venda', 'receita')
  and status_financeiro = 'PENDENTE'
  and coalesce(status, '') <> 'CANCELADO'
  and coalesce(valor_pago, 0) = 0;
