-- ============================================================
-- MIGRACAO 29: correcoes de despesas/pagamentos (Out/2026)
--
-- Contexto (auditoria de 20/10/2026):
--   * despesas #1 e #2 estavam com datas invalidas (1900/2000);
--   * 3 pagamentos estavam orfaos (logs com "Ref Despesa #", mas a
--     despesa nao existia): #307, #419 e #828;
--   * despesas 411 e 445 tinham ID duplicado (colisao de getNextId
--     entre Maicon e Marcos em Mai/Jun 2026);
--   * 5 baixas automaticas "Outros" duplicavam baixas manuais
--     PIX/Dinheiro (despesas 679, 680, 806, 807 e 808);
--   * 1 baixa de R$ 2.500,00 em 07/08 era duplicata da outra baixa
--     identica do mesmo dia (despesa 514);
--   * 166 despesas PAGAS tinham baixa completa no log, mas
--     valor_pago = 0 (o Painel ja as tratava como quitadas; agora o
--     valor fica persistido).
--
-- A migracao e IDEMPOTENTE: cada passo verifica o estado antes de
-- alterar. Pode ser rodada mais de uma vez no Supabase SQL Editor.
--
-- IMPORTANTE: a Parte 8 (indice unico em despesas.id) so e criada
-- se nao houver mais IDs duplicados. Se houver, a migracao levanta
-- excecao com a lista para correcao manual.
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1 - Datas das despesas #1 e #2
-- ------------------------------------------------------------
UPDATE public.despesas
   SET data = DATE '2025-10-26'
 WHERE uid IN (
   '8512c1b1-16d5-4dee-ba39-c89e6ec45268', -- #1 EPI RV BLOCOS
   '299c36be-6aef-4546-bed0-22e215cf868b'  -- #2 COMBUSTIVEL UNO
 )
   AND data IN ('1900-01-12', '2000-05-08');

-- ------------------------------------------------------------
-- PARTE 2 - Despesas faltantes dos pagamentos orfaos
-- (mantendo a categoria original de cada log)
-- ------------------------------------------------------------
INSERT INTO public.despesas
  (uid, id, item, quantidade, unidade, custo, data, observacao, status,
   tipo_despesa, fornecedor, valor_pago, desconto_total, acrescimo_total, categoria_id)
SELECT '26fa3217-59b8-494d-a9e7-12efc6ebc8c4', 307,
       'PARAFUSO MARCENARIA REF ABRIL 26', 1, 'UN', 65, '2026-04-14',
       'Ref log #403', 'PAGO', 'SERVICO', 'RV PORTAL MADEIRAS LTDA',
       65, 0, 0, 15
WHERE NOT EXISTS (
  SELECT 1 FROM public.despesas WHERE uid = '26fa3217-59b8-494d-a9e7-12efc6ebc8c4'
);

INSERT INTO public.despesas
  (uid, id, item, quantidade, unidade, custo, data, observacao, status,
   tipo_despesa, fornecedor, valor_pago, desconto_total, acrescimo_total, categoria_id)
SELECT '6aa538dd-b8b8-41ea-8d00-33c64887e2b0', 419,
       'PARAFUSO REF JUN 26', 1, 'UN', 124, '2026-06-10',
       'Ref log #912', 'PAGO', 'SERVICO', 'RV PORTAL MADEIRAS LTDA',
       124, 0, 0, 15
WHERE NOT EXISTS (
  SELECT 1 FROM public.despesas WHERE uid = '6aa538dd-b8b8-41ea-8d00-33c64887e2b0'
);

INSERT INTO public.despesas
  (uid, id, item, quantidade, unidade, custo, data, observacao, status,
   tipo_despesa, fornecedor, valor_pago, desconto_total, acrescimo_total, categoria_id)
SELECT '7ef0b7cc-4695-4981-a36f-961596465493', 828,
       'PRÓ-LABORE', 1, 'UN', 100, '2026-10-14',
       'Ref log #2191', 'PAGO', 'SERVICO', NULL,
       100, 0, 0, 3
WHERE NOT EXISTS (
  SELECT 1 FROM public.despesas WHERE uid = '7ef0b7cc-4695-4981-a36f-961596465493'
);

-- ------------------------------------------------------------
-- PARTE 3 - IDs duplicados 411 e 445
-- Mantem Marcos em #411/#445 e move as linhas do Maicon para IDs
-- novos (889/890), atualizando folhas 24/33.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.despesas
              WHERE uid = '30881a25-3903-4708-84e9-5bbf4febcc54' AND id = 411)
     AND NOT EXISTS (SELECT 1 FROM public.despesas WHERE id = 889) THEN
    UPDATE public.despesas SET id = 889
     WHERE uid = '30881a25-3903-4708-84e9-5bbf4febcc54';
    UPDATE public.folhas SET despesa_id = 889 WHERE id = 24;
  END IF;

  IF EXISTS (SELECT 1 FROM public.despesas
              WHERE uid = 'f0bdc62e-1201-41da-a336-4ca6acb44037' AND id = 445)
     AND NOT EXISTS (SELECT 1 FROM public.despesas WHERE id = 890) THEN
    UPDATE public.despesas SET id = 890
     WHERE uid = 'f0bdc62e-1201-41da-a336-4ca6acb44037';
    UPDATE public.folhas SET despesa_id = 890 WHERE id = 33;
  END IF;
END $$;

-- ------------------------------------------------------------
-- PARTE 4 - Cancela baixas duplicadas
-- 5 automaticas "Outros" (ficam as PIX/Dinheiro) + 1 baixa de
-- R$ 2.500,00 repetida em 07/08/2026.
-- ------------------------------------------------------------
UPDATE public.logs
   SET status = 'CANCELADO'
 WHERE uid IN (
   '532586d3-33f8-4810-aef6-b87c14286557', -- #679 auto Outros
   'ef72932d-476a-4de4-a90f-edcf7ee373a4', -- #680 auto Outros
   '38c26c75-fddf-42a9-8c47-56b6898dba62', -- #806 auto Outros
   'fe3b9ed0-5b9a-4847-a189-3bdcdce945d8', -- #807 auto Outros
   'c59b325b-9b89-4ca1-8dfd-b07bf1a7b67b', -- #808 auto Outros
   '03b6eb92-ab57-414e-ac44-800dadbab3f8'  -- #514 duplicata 2500
 )
   AND status <> 'CANCELADO';

-- ------------------------------------------------------------
-- PARTE 5 - Vincula baixas de salario ja existentes as despesas
-- (sem criar dinheiro novo; apenas liga o log a despesa)
-- ------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('fce06562-5f16-4723-9ce4-f0e94fa1c937'::uuid, 445),
      ('2b924ffa-fc2b-4c19-a633-1385736cd5c3'::uuid, 890),
      ('9087243e-f8e3-4d27-9c46-55b0c5c237f0'::uuid, 508),
      ('4fe9e9fc-61ef-403b-a3f7-c11b88901aac'::uuid, 509),
      ('cf9d1247-5741-4cb9-8d19-33a74deff4f5'::uuid, 514)
    ) AS v(uid, despesa_id)
  LOOP
    UPDATE public.logs
       SET observacao = coalesce(observacao, '') || ' | Ref Despesa #' || r.despesa_id
     WHERE uid = r.uid
       AND coalesce(observacao, '') !~ ('Ref Despesa #' || r.despesa_id || '(\D|$)');
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- PARTE 6 - Diagnostico de IDs duplicados (antes do indice)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_dups integer;
BEGIN
  SELECT count(*) INTO v_dups
    FROM (SELECT id FROM public.despesas GROUP BY id HAVING count(*) > 1) x;

  IF v_dups > 0 THEN
    RAISE EXCEPTION
      'Ainda existem % ID(s) duplicado(s) em despesas. Rode: SELECT id, count(*) FROM despesas GROUP BY id HAVING count(*) > 1; e resolva antes de criar o indice unico.', v_dups;
  END IF;
END $$;

-- ------------------------------------------------------------
-- PARTE 7 - Persiste valor_pago nas despesas com baixa completa
-- Regra: PAGO, valor_pago = 0 e soma das baixas ativas >= custo.
-- Nao altera caixa: o Painel ja tratava essas despesas como quitadas.
-- ------------------------------------------------------------
WITH baixas AS (
  SELECT d.id, sum(l.valor_total) AS pago
    FROM public.despesas d
    JOIN public.logs l
      ON l.tipo = 'despesa'
     AND l.status <> 'CANCELADO'
     AND l.observacao ~ ('Ref Despesa #' || d.id || '(\D|$)')
   GROUP BY d.id
)
UPDATE public.despesas d
   SET valor_pago = d.custo
  FROM baixas b
 WHERE b.id = d.id
   AND d.status = 'PAGO'
   AND coalesce(d.valor_pago, 0) = 0
   AND b.pago >= d.custo - 0.005
   -- so atualiza quando o id e unico (evita aplicar nos dois lados
   -- de uma colisao ainda nao resolvida)
   AND (SELECT count(*) FROM public.despesas d2 WHERE d2.id = d.id) = 1;

-- ------------------------------------------------------------
-- PARTE 8 - Impede novas colisoes de ID
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_despesas_id ON public.despesas (id);

-- ============================================================
-- FIM
-- ============================================================
