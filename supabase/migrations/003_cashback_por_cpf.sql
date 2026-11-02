-- Consulta de cashback pelo CPF completo. JÁ APLICADA em 02/11/2026 (loja_06 e loja_07).
-- O site nunca recebe o CPF do banco: compara só o hash sha256 do que o cliente digitou.

CREATE OR REPLACE VIEW loja.v_cliente_por_cpf AS
SELECT DISTINCT ON (x.h) x.h AS cpf_hash, x.primeiro_nome
  FROM (SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex') AS h,
               split_part(p.nome, ' ', 1) AS primeiro_nome
          FROM public.pdvnet_clientes p
         WHERE length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11) x
 ORDER BY x.h;
GRANT SELECT ON loja.v_cliente_por_cpf TO loja_app;

-- Cashback ligado ao CPF por três caminhos:
--  A) pelo cliente da VENDA que gerou o cashback (o mais preciso);
--  B) venda que ainda não chegou ao banco (o ETL atrasa): pelo celular do cadastro;
--  C) cashback gravado só com o CPF no nome ("Cliente 13925500766").
CREATE OR REPLACE VIEW loja.v_cashback_por_cpf AS
SELECT DISTINCT ON (t.cpf_hash, t.concessao_id) t.cpf_hash, t.concessao_id, t.valor, t.vale_a_partir_de, t.valido_ate
  FROM (
    SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex') AS cpf_hash,
           c.id AS concessao_id, c.valor, c.vale_a_partir_de, c.valido_ate
      FROM public.cashback_concessoes c
      JOIN public.pdvnet_vendas v ON v.id::text = c.venda_id::text
      JOIN public.pdvnet_clientes p ON p.id = v.cliente_id
     WHERE c.tipo = 'cashback' AND c.status = 'ativo' AND c.valor IS NOT NULL
       AND length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
    UNION ALL
    SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex'),
           c.id, c.valor, c.vale_a_partir_de, c.valido_ate
      FROM public.cashback_concessoes c
      JOIN public.pdvnet_clientes p
        ON right(regexp_replace(concat(p.ddd, p.celular), '\D', '', 'g'), 11) = right(regexp_replace(coalesce(c.cliente_telefone, ''), '\D', '', 'g'), 11)
     WHERE c.tipo = 'cashback' AND c.status = 'ativo' AND c.valor IS NOT NULL
       AND length(regexp_replace(coalesce(c.cliente_telefone, ''), '\D', '', 'g')) >= 10
       AND length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
       AND NOT EXISTS (SELECT 1 FROM public.pdvnet_vendas v WHERE v.id::text = c.venda_id::text)
    UNION ALL
    SELECT encode(sha256(convert_to(substring(c.cliente_nome FROM 9 FOR 11), 'UTF8')), 'hex'),
           c.id, c.valor, c.vale_a_partir_de, c.valido_ate
      FROM public.cashback_concessoes c
     WHERE c.tipo = 'cashback' AND c.status = 'ativo' AND c.valor IS NOT NULL AND c.cliente_nome ~ '^Cliente [0-9]{11}$'
  ) t
 ORDER BY t.cpf_hash, t.concessao_id;
GRANT SELECT ON loja.v_cashback_por_cpf TO loja_app;
