-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". Troca uma view de LEITURA (esquema loja); nenhuma tabela muda.
-- Acrescenta, no FIM da view, se o cashback AUTOMÁTICO por venda está ligado no sistema (public.cashback_limites.auto_ativo).
-- Assim o site para de prometer "ganhe cashback" quando o automático está desligado, e volta sozinho quando o Victor religar.
CREATE OR REPLACE VIEW loja.v_regras_cashback AS
SELECT l.auto_percentual::numeric        AS percentual_automatico,
       l.dias_para_liberar               AS dias_para_liberar,
       l.validade_dias                   AS validade_dias,
       l.desconto_total_max_pct::numeric AS desconto_total_max_pct,
       COALESCE(l.nao_acumula_promocao, false) AS nao_acumula_promocao,
       COALESCE(l.auto_ativo, false)     AS auto_ativo
  FROM public.cashback_limites l
 WHERE l.id = 1;
GRANT SELECT ON loja.v_regras_cashback TO loja_app;
