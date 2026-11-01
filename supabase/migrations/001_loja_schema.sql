-- Loja online (seleto-loja). JÁ APLICADA no projeto Supabase `seleto-sass` em 01/11/2026,
-- em partes (loja_01 … loja_04). Guardada aqui para recriar o ambiente.
-- Esquema PRÓPRIO: não altera nenhuma tabela existente.
CREATE SCHEMA IF NOT EXISTS loja;
COMMENT ON SCHEMA loja IS 'Loja online: pedidos próprios + views de leitura do catálogo/estoque/cashback.';

-- ---------- tabelas novas (só a loja online escreve aqui) ----------
CREATE TABLE IF NOT EXISTS loja.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'aguardando_pagamento'
    CHECK (status IN ('aguardando_pagamento','pago','em_separacao','pronto_retirada','enviado','entregue','cancelado')),
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  cliente_email text,
  entrega_tipo text NOT NULL CHECK (entrega_tipo IN ('retirada_loja','entrega_combinada')),
  loja_retirada_id integer,
  endereco jsonb,
  pagamento_metodo text NOT NULL CHECK (pagamento_metodo IN ('pix','cartao','pagar_na_loja')),
  pagamento_status text NOT NULL DEFAULT 'pendente' CHECK (pagamento_status IN ('pendente','confirmado','falhou','estornado')),
  pagamento_ref text,
  subtotal numeric(12,2) NOT NULL,
  desconto numeric(12,2) NOT NULL DEFAULT 0,
  frete numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  observacao text
);
CREATE INDEX IF NOT EXISTS loja_pedidos_telefone_idx ON loja.pedidos (cliente_telefone, criado_em DESC);
CREATE INDEX IF NOT EXISTS loja_pedidos_status_idx ON loja.pedidos (status, criado_em DESC);

CREATE TABLE IF NOT EXISTS loja.pedido_itens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES loja.pedidos(id) ON DELETE CASCADE,
  produto_ref text NOT NULL,
  variacao_id text,
  nome text NOT NULL,
  cor text,
  tamanho text,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unit numeric(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS loja_pedido_itens_pedido_idx ON loja.pedido_itens (pedido_id);

CREATE TABLE IF NOT EXISTS loja.tentativas_login (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telefone text NOT NULL,
  ip text,
  ok boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loja_tentativas_idx ON loja.tentativas_login (telefone, criado_em DESC);

-- Ninguém acessa pela API pública: RLS ligada e sem política = negado para anon/authenticated.
ALTER TABLE loja.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja.tentativas_login ENABLE ROW LEVEL SECURITY;

-- ---------- views de LEITURA do que já existe ----------
-- Estoque só das 4 lojas físicas (3 Taquara, 13 Aerotown, 14 Américas, 15 Nova Iguaçu).
-- `vendavel` = estoque >= 2: o estoque do banco atrasa algumas horas (margem de segurança).
CREATE OR REPLACE VIEW loja.v_variacoes AS
SELECT v.id AS variacao_id, v.produto_id AS produto_ref, v.cor, v.tamanho, v.ean,
       v.preco_original AS preco_cheio,
       CASE WHEN v.preco_promocional > 0 AND v.preco_promocional < v.preco_original
            THEN v.preco_promocional ELSE v.preco_original END AS preco,
       COALESCE(e.estoque, 0) AS estoque_rede,
       (COALESCE(e.estoque, 0) >= 2) AS vendavel
  FROM public.pdvnet_variacoes v
  LEFT JOIN (SELECT variacao_id, sum(estoque_atual) FILTER (WHERE estoque_atual > 0) AS estoque
               FROM public.pdvnet_estoque_lojas
              WHERE loja_id IN (3,13,14,15)
              GROUP BY variacao_id) e ON e.variacao_id = v.id
 WHERE NOT COALESCE(v.inativo, false) AND v.preco_original > 0;

CREATE OR REPLACE VIEW loja.v_produtos AS
SELECT p.id AS ref, p.nome, COALESCE(cm.marca, p.marca) AS marca, p.grupo AS categoria,
       min(x.preco) FILTER (WHERE x.vendavel) AS preco,
       min(x.preco_cheio) FILTER (WHERE x.vendavel AND x.preco < x.preco_cheio) AS preco_de,
       bool_or(x.preco < x.preco_cheio) FILTER (WHERE x.vendavel) AS em_promocao,
       sum(x.estoque_rede) AS estoque_rede,
       count(*) FILTER (WHERE x.vendavel) AS variacoes_vendaveis
  FROM public.pdvnet_produtos p
  JOIN loja.v_variacoes x ON x.produto_ref = p.id
  LEFT JOIN public.catalogo_marcas cm ON cm.referencia = p.id
 WHERE NOT COALESCE(p.inativo, false)
 GROUP BY p.id, p.nome, COALESCE(cm.marca, p.marca), p.grupo
HAVING count(*) FILTER (WHERE x.vendavel) > 0;

CREATE OR REPLACE VIEW loja.v_cashback AS
SELECT right(regexp_replace(c.cliente_telefone, '\D', '', 'g'), 11) AS telefone,
       c.id AS concessao_id, c.valor, c.vale_a_partir_de, c.valido_ate, c.status
  FROM public.cashback_concessoes c
 WHERE c.tipo = 'cashback' AND c.status = 'ativo' AND c.valor IS NOT NULL
   AND c.cliente_telefone IS NOT NULL AND c.cliente_telefone <> '';

-- Verificação de acesso à área do cliente: celular + 3 primeiros dígitos do CPF (nunca o CPF inteiro). Migração 005 aplicou cpf_inicio3.
CREATE OR REPLACE VIEW loja.v_cliente_verificacao AS
SELECT right(regexp_replace(concat(p.ddd, p.celular), '\D', '', 'g'), 11) AS telefone,
       right(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 4) AS cpf_final4,
       split_part(p.nome, ' ', 1) AS primeiro_nome,
       left(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 3) AS cpf_inicio3
  FROM public.pdvnet_clientes p
 WHERE length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
   AND length(regexp_replace(coalesce(p.celular, ''), '\D', '', 'g')) BETWEEN 8 AND 9;

-- ---------- perfil restrito da loja (SEM login até você definir a senha) ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'loja_app') THEN
    CREATE ROLE loja_app NOLOGIN NOINHERIT;
  END IF;
END $$;
GRANT USAGE ON SCHEMA loja TO loja_app;
GRANT SELECT ON loja.v_variacoes, loja.v_produtos, loja.v_cashback, loja.v_cliente_verificacao TO loja_app;
GRANT SELECT, INSERT, UPDATE ON loja.pedidos TO loja_app;
GRANT SELECT, INSERT ON loja.pedido_itens TO loja_app;
GRANT SELECT, INSERT, DELETE ON loja.tentativas_login TO loja_app;
