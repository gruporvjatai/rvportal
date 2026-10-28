-- 31_clientes_cobranca_automatica.sql
-- Flag no cadastro: o robô só manda D-2 / D-0 em lote se estiver true.
-- Clique manual no financeiro NÃO lê esta coluna.
-- Default true: a base atual continua permitida; desliga só quem vocês marcarem.
-- Idempotente.

alter table public.clientes
  add column if not exists cobranca_automatica boolean not null default true;

comment on column public.clientes.cobranca_automatica is
  'Se false, o robô não envia lembrete automático ao WhatsApp deste cliente. Envio manual no financeiro ignora este campo.';
