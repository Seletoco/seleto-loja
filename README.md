# Seleto — loja online (ambiente de teste)

Site separado do catálogo e do sistema em produção. **Não altera nada do que está rodando.**

## Estado
- Vitrine, busca/filtros, produto, carrinho, checkout, confirmação do pedido: **prontos**.
- **Pagamento: só exemplo** (Pix, cartão, pagar na retirada), sem cobrança. Veja `src/lib/pagamento.ts`.
- Pedidos de teste ficam **no navegador** (localStorage) até ligar o banco.
- **Área do cliente** (`/conta`): **CPF completo** (validado); 10 consultas/hora por rede. Mostra só o primeiro nome e os valores.
  Em demonstração, use o CPF `529.982.247-25`.
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

## Logos das marcas (home → "Compre por marca")
Cada botão usa a logo da marca se existir o arquivo `public/marcas/<nome>.svg` (ou `.png`, `.webp`, `.jpg`),
onde `<nome>` é o nome da marca em minúsculas, sem acento, espaço ou símbolo. Sem o arquivo, o botão mostra o nome
em letras grandes. Já incluídas: `adidas`, `nike`, `newbalance`, `fila`.
Faltam (use a logo oficial do kit de revendedor de cada marca): `farm`, `thugnine`, `champion`, `barracrew`, `vans`,
`approve`, `rafrow`, `newera`. Prefira SVG preto (o botão inverte para branco no mouse) ou PNG preto com fundo transparente.

## Cashback no checkout
No passo 3 do checkout o cliente digita o CPF (mesma consulta da área `/conta`) e vê **"Pode usar agora"** x **"Libera em breve"**. Só dá para usar a partir da compra mínima.
A regra fica em `src/lib/regra-cashback.ts` (`regraDeUso()`), hoje com VALORES DE EXEMPLO: compra mínima R$ 500 e teto de 100%
do subtotal. Quando a regra passar a ser definida no sistema, troque só essa função por uma leitura do banco.
O pedido guarda o cashback pedido; **a loja confirma e dá baixa** (a loja online não consome o saldo sozinha).
Hoje a consulta considera o cashback gerado pelo Seleto (`cashback_concessoes`); os bônus do PDVNet ainda não entram.

## Frete pelos Correios (por CEP)
Em "Entrega para todo o Brasil" o cliente digita o CEP: o endereço é preenchido (ViaCEP) e o frete é cotado em `/api/frete`.
- **Com as credenciais do contrato dos Correios** (variáveis `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO`, `CORREIOS_CARTAO_POSTAGEM`,
  `CORREIOS_CONTRATO`, `CEP_ORIGEM`; opcional `CORREIOS_DR`), o preço e o prazo de PAC e SEDEX vêm da API dos Correios (`src/lib/correios.ts`).
  **Essa integração ainda não foi testada contra a API real** — confira na primeira cotação.
- **Sem elas**, o site usa uma ESTIMATIVA DE EXEMPLO por região (`estimativaDeExemplo`), marcada como estimativa na tela e no pedido.
- Peso e caixa vêm de valores assumidos por categoria em `src/lib/frete.ts` — ajuste conforme a realidade da loja.
- Para frete grátis a partir de um valor, use `FRETE_GRATIS_ACIMA` (ainda desligado).
