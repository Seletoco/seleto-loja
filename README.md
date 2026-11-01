# Seleto — loja online (ambiente de teste)

Site separado do catálogo e do sistema em produção. **Não altera nada do que está rodando.**

## Estado
- Vitrine, busca/filtros, produto, carrinho, checkout, confirmação do pedido: **prontos**.
- **Pagamento: só exemplo** (Pix, cartão, pagar na retirada), sem cobrança. Veja `src/lib/pagamento.ts`.
- Pedidos de teste ficam **no navegador** (localStorage) até ligar o banco.
- **Área do cliente** (`/conta`): celular + 3 primeiros dígitos do CPF; 5 tentativas/hora por celular.
  Em demonstração, use `21 99999-9999` e `123`.
- **Admin** (`/admin`): usuário `admin` / senha `seleto-teste-2026` (TESTE). Troque com `ADMIN_USUARIO`/`ADMIN_SENHA`.
- Produtos hoje vêm de `data/produtos.json` (instantâneo do catálogo). Gerar de novo:
  `python3 scripts/gerar-dados.py /caminho/seleto-catalogo/cliente.html`

## Banco (plano A: mesmo Supabase, esquema `loja`)
`supabase/migrations/001_loja_schema.sql` (já aplicada) cria o esquema `loja`, 3 tabelas novas e views de **leitura**
(`v_produtos`, `v_variacoes`, `v_cashback`, `v_cliente_verificacao`) e o perfil `loja_app` (sem login).
Para ligar: rode `002_ligar_perfil_loja_app.sql` no SQL Editor com uma senha sua e defina `LOJA_DATABASE_URL` na Vercel.

## Riscos conhecidos
- O estoque do banco atrasa algumas horas: só vendemos variação com 2+ em estoque; a loja confirma antes de separar.
- Pedido não dá baixa sozinho no PDVNet: a equipe baixa à mão.
- NF-e, frete automático e páginas legais (LGPD, trocas) ainda por fazer.

## Rodar
```bash
npm install
npm run dev     # http://localhost:3000
```
