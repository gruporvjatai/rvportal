-- ============================================================
-- MIGRACAO 19: FOTO DE PRODUTO (coluna + bucket de Storage)
--
-- Objetivo:
--   * Guardar a URL publica da foto de cada produto em produtos.foto_url.
--   * Criar o bucket publico 'produtos-fotos' (leitura publica via URL).
--
-- UPLOAD:
--   O upload/remocao e feito pela Edge Function "produto-foto"
--   (supabase/functions/produto-foto), que usa a service_role. Isso e
--   necessario porque as policies de storage.objects so podem ser criadas
--   pelo owner do schema e este ambiente nao tem essa permissao.
--   O bucket e PUBLICO apenas para leitura.
--
-- COMO USAR: rode no Supabase SQL Editor (ou Management API).
-- PODE SER RODADO QUANTAS VEZES QUISER (idempotente).
-- ============================================================

-- 1) Coluna da foto do produto (URL publica).
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto_url text;

-- 2) Bucket publico para as fotos (leitura).
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos-fotos', 'produtos-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
