-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Só view nova (esquema loja), nada de tabela do PDVNet muda.
-- Identidade do cliente para a conta: CPF (só o hash) + nome completo + data de nascimento + celular + e-mail.
-- Estes dados são lidos só pelo SERVIDOR da loja, para CONFERIR o que a pessoa digitou ou preencher o pedido dela; nunca vão para o navegador de outra pessoa.
-- `fone`: telefone completo com DDD (10 ou 11 dígitos), tirado de fone_full ou de ddd+celular, sem o 55; null se não houver.
CREATE OR REPLACE VIEW loja.v_cliente_identidade AS
SELECT x.cpf_hash, x.nome, x.nascimento, x.email, x.inativo, x.data_atualizacao,
       x.digitos AS celular_digitos,
       right(x.digitos, 8) AS celular8,
       CASE WHEN length(x.digitos) IN (10, 11) THEN x.digitos
            WHEN length(x.digitos) IN (12, 13) AND left(x.digitos, 2) = '55' THEN substr(x.digitos, 3)
       END AS fone
  FROM (
    SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex') AS cpf_hash,
           p.nome,
           p.data_nascimento AS nascimento,
           NULLIF(trim(p.email), '') AS email,
           COALESCE(p.inativo, false) AS inativo,
           p.data_atualizacao,
           COALESCE(NULLIF(regexp_replace(coalesce(p.fone_full, ''), '\D', '', 'g'), ''),
                    regexp_replace(concat(p.ddd, p.celular), '\D', '', 'g')) AS digitos
      FROM public.pdvnet_clientes p
     WHERE length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
  ) x;

GRANT SELECT ON loja.v_cliente_identidade TO loja_app;
