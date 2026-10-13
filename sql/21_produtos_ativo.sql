-- 21_produtos_ativo.sql
-- Adiciona a coluna "ativo" em produtos para permitir desativar/reativar
-- produtos (item descontinuado, fora de linha) sem excluir o cadastro.
-- Produtos existentes permanecem ativos. Operacao idempotente.

alter table public.produtos
  add column if not exists ativo boolean not null default true;
