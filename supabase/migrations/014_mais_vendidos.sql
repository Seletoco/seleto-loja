-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Só uma view NOVA de leitura (esquema loja); nenhuma tabela muda.
-- Ranking "mais vendidos" da loja: quantas unidades de cada produto saíram nas lojas nos últimos 60 dias (vendas das 4 lojas no PDVNet).
-- A vitrine usa só a ORDEM (nunca mostra quantidade, custo ou margem). Sem esta view o site funciona: a aba "Mais vendidos" fica escondida.

CREATE OR REPLACE VIEW loja.v_mais_vendidos AS
SELECT i.produto_id AS ref,
       sum(i.quantidade)::integer AS vendidos_60d
  FROM public.pdvnet_venda_itens i
 WHERE i.data_hora_venda >= now() - interval '60 days'
   AND NOT COALESCE(i.inativo, false)
   AND i.quantidade > 0
 GROUP BY i.produto_id;

GRANT SELECT ON loja.v_mais_vendidos TO loja_app;
