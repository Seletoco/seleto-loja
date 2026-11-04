-- Área do cliente, fase 2: preferências de mensagens e pedidos de aviso de produto. Só tabelas novas.

CREATE TABLE IF NOT EXISTS loja.preferencias (
  cpf_hash text PRIMARY KEY,
  avisos_cashback boolean NOT NULL DEFAULT true,
  avisos_promocoes boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS loja.alertas_produto (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cpf_hash text NOT NULL,
  descricao text NOT NULL CHECK (char_length(descricao) BETWEEN 2 AND 120),
  tamanho text CHECK (tamanho IS NULL OR char_length(tamanho) <= 12),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  avisado_em timestamptz
);
CREATE INDEX IF NOT EXISTS loja_alertas_cpf_idx ON loja.alertas_produto (cpf_hash) WHERE ativo;
ALTER TABLE loja.preferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja.alertas_produto ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON loja.preferencias TO loja_app;
GRANT SELECT, INSERT, UPDATE ON loja.alertas_produto TO loja_app;

-- O perfil loja_app não ignora RLS e as tabelas da loja não tinham política: sem ela o perfil não enxerga nem grava nada.
-- Cada GRANT já limita o que ele pode fazer; a política só libera as linhas.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pedidos','pedido_itens','tentativas_login','codigos_acesso','preferencias','alertas_produto'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'loja' AND tablename = t AND policyname = 'loja_app_acesso') THEN
      EXECUTE format('CREATE POLICY loja_app_acesso ON loja.%I FOR ALL TO loja_app USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;
