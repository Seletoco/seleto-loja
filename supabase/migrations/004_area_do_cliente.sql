-- Área do cliente (login por CPF + código no WhatsApp). Só o que é novo: tabela de códigos e views de leitura por CPF.
-- O site nunca recebe o CPF do banco: tudo se liga pelo hash sha256 do CPF (como em 003).

-- Códigos de acesso (6 dígitos). Quem GRAVA é o SeleChat (dono do banco), ao mandar o código pelo WhatsApp do cashback;
-- o site (loja_app) só LÊ e marca tentativas/uso. Guarda só o hash do código, nunca o código.
CREATE TABLE IF NOT EXISTS loja.codigos_acesso (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cpf_hash text NOT NULL,
  codigo_hash text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  usado_em timestamptz
);
CREATE INDEX IF NOT EXISTS loja_codigos_cpf_idx ON loja.codigos_acesso (cpf_hash, criado_em DESC);
ALTER TABLE loja.codigos_acesso ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON loja.codigos_acesso TO loja_app;

-- Compras do cliente (sem a venda cancelada e sem retirada de funcionário).
CREATE OR REPLACE VIEW loja.v_compras_por_cpf AS
SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex') AS cpf_hash,
       v.id AS venda_id, v.data_hora, v.loja_id,
       v.valor_liquido AS valor, COALESCE(v.valor_bonus, 0) AS cashback_usado, v.total_itens_venda AS itens
  FROM public.pdvnet_vendas v
  JOIN public.pdvnet_clientes p ON p.id = v.cliente_id
 WHERE NOT COALESCE(v.inativa, false) AND NOT COALESCE(v.retirada_funcionario, false)
   AND length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11;
GRANT SELECT ON loja.v_compras_por_cpf TO loja_app;

-- Itens de cada compra.
CREATE OR REPLACE VIEW loja.v_compra_itens_por_cpf AS
SELECT c.cpf_hash, i.venda_id, i.produto_nome, i.marca, i.cor, i.tamanho, i.quantidade, i.preco_liquido
  FROM public.pdvnet_venda_itens i
  JOIN loja.v_compras_por_cpf c ON c.venda_id = i.venda_id
 WHERE NOT COALESCE(i.inativo, false) AND i.quantidade > 0;
GRANT SELECT ON loja.v_compra_itens_por_cpf TO loja_app;

-- Gasto e número de compras dos últimos 12 meses (o nível VIP é calculado no site com a mesma régua do SeleChat).
CREATE OR REPLACE VIEW loja.v_gasto_12m_por_cpf AS
SELECT cpf_hash, count(*)::int AS compras, COALESCE(sum(valor), 0)::numeric(12,2) AS gasto
  FROM loja.v_compras_por_cpf
 WHERE data_hora >= now() - interval '1 year'
 GROUP BY cpf_hash;
GRANT SELECT ON loja.v_gasto_12m_por_cpf TO loja_app;

-- Extrato do cashback: tudo que o cliente ganhou (inclusive o que já gastou todo), com quanto usou e o saldo. Liga ao CPF pelos mesmos
-- três caminhos de v_cashback_por_cpf (003), mas sem filtrar pelo saldo.
CREATE OR REPLACE VIEW loja.v_extrato_cashback_por_cpf AS
SELECT DISTINCT ON (t.cpf_hash, t.concessao_id) t.cpf_hash, t.concessao_id,
       c.valor AS ganhou, c.valor_usado AS usou, (c.valor - c.valor_usado)::numeric(12,2) AS saldo,
       c.vale_a_partir_de, c.valido_ate, c.criado_em
  FROM (
    SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex') AS cpf_hash, c.id AS concessao_id
      FROM public.cashback_concessoes c
      JOIN public.pdvnet_vendas v ON v.id::text = c.venda_id::text
      JOIN public.pdvnet_clientes p ON p.id = v.cliente_id
     WHERE length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
    UNION ALL
    SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex'), c.id
      FROM public.cashback_concessoes c
      JOIN public.pdvnet_clientes p
        ON right(regexp_replace(concat(p.ddd, p.celular), '\D', '', 'g'), 11) = right(regexp_replace(coalesce(c.cliente_telefone, ''), '\D', '', 'g'), 11)
     WHERE length(regexp_replace(coalesce(c.cliente_telefone, ''), '\D', '', 'g')) >= 10
       AND length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
       AND NOT EXISTS (SELECT 1 FROM public.pdvnet_vendas v WHERE v.id::text = c.venda_id::text)
    UNION ALL
    SELECT encode(sha256(convert_to(substring(c.cliente_nome FROM 9 FOR 11), 'UTF8')), 'hex'), c.id
      FROM public.cashback_concessoes c
     WHERE c.cliente_nome ~ '^Cliente [0-9]{11}$'
  ) t
  JOIN public.cashback_concessoes c ON c.id = t.concessao_id
 WHERE c.tipo = 'cashback' AND c.status = 'ativo' AND c.valor IS NOT NULL
 ORDER BY t.cpf_hash, t.concessao_id;
GRANT SELECT ON loja.v_extrato_cashback_por_cpf TO loja_app;
