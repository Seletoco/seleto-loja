-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Só objetos novos (esquema loja).
-- Conta do cliente por e-mail e senha. A senha NUNCA é guardada: só o hash (scrypt, feito no servidor da loja).
-- O vínculo com o cadastro da Seleto usa CPF + telefone conferidos contra o PDVNet; o CPF em si não é gravado, só o hash.

CREATE TABLE IF NOT EXISTS loja.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  senha_hash text NOT NULL,
  nome text,
  cpf_hash text,                    -- preenchido quando o cliente liga a conta ao cadastro da Seleto
  telefone_final text,              -- últimos 4 dígitos do celular informado (só para o cliente reconhecer)
  vinculado_em timestamptz,
  verificado boolean NOT NULL DEFAULT false, -- true só quando provar o WhatsApp (ainda não existe); até lá o histórico de compras fica oculto
  criado_em timestamptz NOT NULL DEFAULT now(),
  ultimo_login timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS loja_contas_email_uq ON loja.contas (lower(email));
-- Um CPF só pode estar ligado a UMA conta: quem souber CPF + telefone de outra pessoa não consegue "roubar" um cadastro já ligado.
CREATE UNIQUE INDEX IF NOT EXISTS loja_contas_cpf_uq ON loja.contas (cpf_hash) WHERE cpf_hash IS NOT NULL;

-- Confere CPF + celular da MESMA linha de cliente (sem expor o CPF nem o telefone completos).
CREATE OR REPLACE VIEW loja.v_cliente_cpf_celular AS
SELECT encode(sha256(convert_to(regexp_replace(p.cpf_cnpj, '\D', '', 'g'), 'UTF8')), 'hex') AS cpf_hash,
       right(regexp_replace(concat(p.ddd, p.celular), '\D', '', 'g'), 8) AS celular8,
       left(regexp_replace(concat(p.ddd, p.celular), '\D', '', 'g'), 2)  AS ddd,
       split_part(p.nome, ' ', 1) AS primeiro_nome
  FROM public.pdvnet_clientes p
 WHERE length(regexp_replace(coalesce(p.cpf_cnpj, ''), '\D', '', 'g')) = 11
   AND length(regexp_replace(coalesce(p.celular, ''), '\D', '', 'g')) BETWEEN 8 AND 9;

ALTER TABLE loja.contas ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON loja.v_cliente_cpf_celular TO loja_app;
GRANT SELECT, INSERT, UPDATE ON loja.contas TO loja_app;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'loja' AND tablename = 'contas' AND policyname = 'loja_app_acesso') THEN
    CREATE POLICY loja_app_acesso ON loja.contas FOR ALL TO loja_app USING (true) WITH CHECK (true);
  END IF;
END $$;
