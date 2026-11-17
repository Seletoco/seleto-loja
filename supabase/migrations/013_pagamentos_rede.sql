-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Só objetos novos (esquema loja).
-- Cobranças pela Rede (e.Rede): uma linha por tentativa de cobrança (hoje: Pix). Nada de dado de cartão aqui.
-- O pedido continua em loja.pedidos; quando a Rede aprova, o site marca pagamento_status = 'confirmado' e status = 'pago'.

CREATE TABLE IF NOT EXISTS loja.pagamentos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES loja.pedidos(id) ON DELETE CASCADE,
  provedor text NOT NULL DEFAULT 'rede',
  metodo text NOT NULL CHECK (metodo IN ('pix', 'cartao')),
  ambiente text NOT NULL CHECK (ambiente IN ('sandbox', 'producao')),
  referencia text NOT NULL,              -- o "reference" enviado à Rede (até 16 caracteres)
  tid text,                              -- identificador da transação na Rede
  token text NOT NULL,                   -- parte secreta do link /pagar/<token> mandado ao cliente
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'expirado', 'erro')),
  qr_emv text,                           -- Pix "copia e cola"
  expira_em timestamptz,
  retorno_codigo text,
  retorno_mensagem text,
  conferido_em timestamptz,              -- última consulta à Rede
  pago_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS loja_pagamentos_referencia_uq ON loja.pagamentos (referencia);
CREATE UNIQUE INDEX IF NOT EXISTS loja_pagamentos_token_uq ON loja.pagamentos (token);
CREATE UNIQUE INDEX IF NOT EXISTS loja_pagamentos_tid_uq ON loja.pagamentos (tid) WHERE tid IS NOT NULL;
CREATE INDEX IF NOT EXISTS loja_pagamentos_pedido_idx ON loja.pagamentos (pedido_id, criado_em DESC);

-- Avisos recebidos da Rede (webhook do Pix), para conferência. Só identificadores, nenhum dado de cliente.
CREATE TABLE IF NOT EXISTS loja.pagamentos_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  tid text,
  eventos text[],
  corpo jsonb
);
CREATE INDEX IF NOT EXISTS loja_pagamentos_eventos_tid_idx ON loja.pagamentos_eventos (tid, recebido_em DESC);

ALTER TABLE loja.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja.pagamentos_eventos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON loja.pagamentos, loja.pagamentos_eventos TO loja_app;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'loja' AND tablename = 'pagamentos' AND policyname = 'loja_app_acesso') THEN
    CREATE POLICY loja_app_acesso ON loja.pagamentos FOR ALL TO loja_app USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'loja' AND tablename = 'pagamentos_eventos' AND policyname = 'loja_app_acesso') THEN
    CREATE POLICY loja_app_acesso ON loja.pagamentos_eventos FOR ALL TO loja_app USING (true) WITH CHECK (true);
  END IF;
END $$;
