-- Link do grupo VIP para a área do cliente (o controle de vagas e do link continua no SeleChat, em cashback_limites).
CREATE OR REPLACE VIEW loja.v_vip_grupo AS
SELECT vip_ativo, NULLIF(vip_grupo1_link, '') AS link FROM public.cashback_limites WHERE id = 1;
GRANT SELECT ON loja.v_vip_grupo TO loja_app;
