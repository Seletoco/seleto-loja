-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Só colunas NOVAS em loja.pedidos (aditivo; nada existente muda).
-- Integração site -> PDVNet (nota fiscal): CPF do comprador para a nota, e o ciclo do pedido no PDVNet.
--   cliente_cpf          CPF só com dígitos (obrigatório no checkout para entrega; opcional na retirada). Uso fiscal; nunca aparece em tela nem em log.
--   pdvnet_liberado_em   quando o admin liberou o pedido para o PDVNet baixar (sem isso o PDVNet não vê o pedido)
--   pdvnet_baixado_em    quando o PDVNet leu o pedido completo
--   pdvnet_status        último status que o PDVNet informou (ex.: 31 = Faturado)
--   pdvnet_venda         número da venda no PDVNet (quando informado)
--   nota_chave/numero    chave e número da nota fiscal (quando informados)

ALTER TABLE loja.pedidos
  ADD COLUMN IF NOT EXISTS cliente_cpf text,
  ADD COLUMN IF NOT EXISTS pdvnet_liberado_em timestamptz,
  ADD COLUMN IF NOT EXISTS pdvnet_baixado_em timestamptz,
  ADD COLUMN IF NOT EXISTS pdvnet_status text,
  ADD COLUMN IF NOT EXISTS pdvnet_venda text,
  ADD COLUMN IF NOT EXISTS nota_chave text,
  ADD COLUMN IF NOT EXISTS nota_numero text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loja_pedidos_cpf_formato') THEN
    ALTER TABLE loja.pedidos ADD CONSTRAINT loja_pedidos_cpf_formato CHECK (cliente_cpf IS NULL OR cliente_cpf ~ '^[0-9]{11}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS loja_pedidos_pdvnet_liberado_idx ON loja.pedidos (pdvnet_liberado_em) WHERE pdvnet_liberado_em IS NOT NULL;
