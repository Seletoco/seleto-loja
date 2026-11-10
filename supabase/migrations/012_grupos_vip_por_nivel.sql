-- NÃO APLICADA. Só aplicar quando o Victor disser "pode aplicar". View NOVA de leitura (esquema loja); nenhuma tabela muda.
-- Os links dos grupos VIP de WhatsApp por nível (Ouro e Diamante) ficam em public.crm_grupo_vip (SeleChat). A loja só lê o nome e o link,
-- e só aceita link de convite do WhatsApp (mesma checagem do SeleChat). A área do cliente mostra o botão do grupo do NÍVEL dele
-- (Ouro -> grupo Ouro, Diamante -> grupo Diamante; Prata não tem grupo). Nunca entram o jid do grupo nem os membros.
CREATE OR REPLACE VIEW loja.v_grupo_vip_nivel AS
SELECT g.nivel, g.nome, g.link_convite AS link
  FROM public.crm_grupo_vip g
 WHERE g.nivel IN ('Ouro', 'Diamante')
   AND g.link_convite ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$';

GRANT SELECT ON loja.v_grupo_vip_nivel TO loja_app;
