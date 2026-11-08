-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar".
-- Aditiva: views novas de leitura + colunas novas em loja.pedidos + alargamento (não destrutivo) da lista de formas de pagamento.
-- Não altera o esquema public nem as tabelas do SeleChat/PDVNet.

-- ---------- regras do cashback (lidas do sistema; a loja nunca escreve aqui) ----------
-- Expõe SÓ os números necessários. A tabela public.cashback_limites também guarda links/ids de grupos de WhatsApp: não vão para a loja.
CREATE OR REPLACE VIEW loja.v_regras_cashback AS
SELECT l.auto_percentual::numeric        AS percentual_automatico,
       l.dias_para_liberar               AS dias_para_liberar,
       l.validade_dias                   AS validade_dias,
       l.desconto_total_max_pct::numeric AS desconto_total_max_pct,
       COALESCE(l.nao_acumula_promocao, false) AS nao_acumula_promocao
  FROM public.cashback_limites l
 WHERE l.id = 1;

-- Percentual ganho por forma de pagamento (dinheiro, pix, cartao, outros).
CREATE OR REPLACE VIEW loja.v_cashback_formas AS
SELECT f.forma, f.percentual::numeric AS percentual
  FROM public.cashback_formas f;

GRANT SELECT ON loja.v_regras_cashback, loja.v_cashback_formas TO loja_app;

-- ---------- pedidos: pagamento aberto + dados que o checkout já coleta ----------
-- Pix e cartão saíram do checkout; "combinar_whatsapp" vale para entrega em casa. Mantém os valores antigos (nada some).
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'loja.pedidos'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%pagamento_metodo%'
  LOOP
    EXECUTE format('ALTER TABLE loja.pedidos DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE loja.pedidos ADD CONSTRAINT pedidos_pagamento_metodo_check
    CHECK (pagamento_metodo IN ('pix','cartao','pagar_na_loja','combinar_whatsapp'));
END $$;

ALTER TABLE loja.pedidos ADD COLUMN IF NOT EXISTS cashback_usado numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE loja.pedidos ADD COLUMN IF NOT EXISTS cashback_telefone text;
ALTER TABLE loja.pedidos ADD COLUMN IF NOT EXISTS entrega_servico text;
ALTER TABLE loja.pedidos ADD COLUMN IF NOT EXISTS entrega_prazo_dias integer;
ALTER TABLE loja.pedidos ADD COLUMN IF NOT EXISTS frete_estimado boolean NOT NULL DEFAULT false;
ALTER TABLE loja.pedidos ADD COLUMN IF NOT EXISTS conta_id uuid;
