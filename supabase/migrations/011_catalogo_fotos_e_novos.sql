-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Só views NOVAS de leitura (esquema loja); nenhuma tabela muda.
-- O catálogo da loja lê do banco (v_produtos/v_variacoes, migration 001). Estas duas views completam o que a vitrine precisa:
--  * v_fotos: a foto aprovada do catálogo (public.catalogo_fotos, status 'ok'), ligada ao produto pela REFERÊNCIA do fabricante.
--  * v_produtos_novos: produto "novo" = chegou compra de reposição nos últimos 30 dias (data_ultima_compra das variações).
-- Sem elas o site continua funcionando: usa a foto e o "novo" do arquivo antigo (data/produtos.json).

CREATE OR REPLACE VIEW loja.v_fotos AS
SELECT DISTINCT ON (p.id) p.id AS ref, f.url
  FROM public.pdvnet_produtos p
  JOIN public.catalogo_fotos f ON f.referencia = p.referencia
 WHERE f.status = 'ok' AND f.url IS NOT NULL AND f.url <> ''
 ORDER BY p.id, f.atualizado_em DESC NULLS LAST;

CREATE OR REPLACE VIEW loja.v_produtos_novos AS
SELECT v.produto_id AS ref,
       bool_or(v.data_ultima_compra >= now() - interval '30 days') AS novo
  FROM public.pdvnet_variacoes v
 WHERE NOT COALESCE(v.inativo, false)
 GROUP BY v.produto_id;

GRANT SELECT ON loja.v_fotos, loja.v_produtos_novos TO loja_app;
