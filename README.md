# Seleto — loja online (ambiente de teste)

Site separado do catálogo e do sistema em produção. **Não altera nada do que está rodando.**

## Estado
- Vitrine, busca/filtros, produto, carrinho, checkout, confirmação do pedido: **prontos**.
- **Pagamento em aberto:** o site não cobra. Retirada → "Pagar na retirada"; entrega em casa → "Combinar pelo WhatsApp". Pix e cartão foram retirados até ligar um provedor. Veja `src/lib/pagamento.ts`.
- **Pedidos:** com o banco ligado, o checkout grava em `loja.pedidos` (o servidor recalcula preços e total) e o `/admin` lê de lá. Sem banco (demonstração), ficam no navegador (localStorage).
- **Conta do cliente:** e-mail + senha (hash scrypt) em `loja.contas`, com passo de ligar ao cadastro da Seleto por **CPF + celular** conferidos no PDVNet. Enquanto não houver código por WhatsApp, a sessão fica "não verificada" (sem histórico de compras). Um CPF liga a uma conta só.
- **Área do cliente** (`/conta`): **só com conta** (e-mail + senha). Não existe mais entrada só por CPF. Depois de criar a conta, a pessoa liga ao cadastro da Seleto informando **CPF, celular, nome completo e data de nascimento**, e tudo precisa bater com o MESMO cadastro do PDVNet (view `loja.v_cliente_identidade`, migration 009). Cadastro sem data de nascimento não liga (fale com a loja).
- **Cashback** só para conta ligada; o servidor confere o saldo real no pedido. **Compra com 1 clique** (produto): só conta ligada, 1 unidade, retirada na loja, pagamento na retirada, dados do cadastro. `NEXT_PUBLIC_EXIGIR_LOGIN=1` obriga login para finalizar qualquer pedido.
- **Black Friday:** faixa + popup de entrada aparecem em prévias da Vercel e em desenvolvimento; em produção só com `NEXT_PUBLIC_BLACK_FRIDAY=1`.
- **Admin** (`/admin`): em modo de teste (sem banco) vale um par de teste embutido em `src/lib/admin.ts`. **Em qualquer deploy (produção ou prévia) o admin fica bloqueado** até definir `ADMIN_USUARIO`, `ADMIN_SENHA` (12+) e `ADMIN_SEGREDO` (16+) na Vercel.
- Produtos hoje vêm de `data/produtos.json` (instantâneo do catálogo). Gerar de novo:
  `python3 scripts/gerar-dados.py /caminho/seleto-catalogo/cliente.html`

## Banco (plano A: mesmo Supabase, esquema `loja`)
`supabase/migrations/001_loja_schema.sql` (já aplicada) cria o esquema `loja`, 3 tabelas novas e views de **leitura**
(`v_produtos`, `v_variacoes`, `v_cashback`, `v_cliente_verificacao`) e o perfil `loja_app` (sem login).
Para ligar: rode `002_ligar_perfil_loja_app.sql` no SQL Editor com uma senha sua e defina `LOJA_DATABASE_URL` na Vercel.
**Migrations 007 (regras de cashback + pedidos) e 008 (contas) já foram aplicadas. A 009 (identidade do cliente: nome completo, data de nascimento, celular) está escrita e NÃO foi aplicada**: só aplicar quando o Victor disser. Sem a 009, ligar a conta ao cadastro, a compra de 1 clique e o preenchimento do checkout não funcionam.

## Ir ao ar (modo real)
1. Aplicar migrations 002 (com senha sua), 007 e 008 (com autorização).
2. Na Vercel: `LOJA_DATABASE_URL`, `LOJA_SESSAO_SECRET`, `ADMIN_*`, e `NEXT_PUBLIC_MODO_REAL=1` (antes do build). Nomes em `.env.example`.
3. Preencher dados da empresa (`NEXT_PUBLIC_EMPRESA_*`) e prazo de troca (`NEXT_PUBLIC_TROCA_DIAS`); revisar `/privacidade` e `/trocas` com um advogado.
4. Conferir um pedido de ponta a ponta (retirada e entrega) e o `/admin`.

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

## Cashback (regras do sistema)
O percentual ganho, os prazos e o teto de uso **vêm do sistema** (`loja.v_regras_cashback` e `loja.v_cashback_formas`, migration 007), lidos por `src/lib/regras-servidor.ts`. Hoje: ganha de 10% a 15% (depende da forma de pagamento no caixa), libera em 7 dias, vale 30 dias, cobre até 20% da compra, sem compra mínima. Sem banco, usa esse mesmo padrão marcado como "reserva".
No passo 3 do checkout o cliente digita o CPF e vê **"Pode usar agora"** x **"Libera em breve"**. O pedido guarda o cashback pedido (limitado ao teto); **a loja confirma e dá baixa** (a loja online não consome o saldo sozinha).
A consulta considera o cashback Seleto (`cashback_concessoes`); os bônus do PDVNet foram desativados e não entram.

## Frete pelos Correios (por CEP)
Em "Entrega para todo o Brasil" o cliente digita o CEP: o endereço é preenchido (ViaCEP) e o frete é cotado em `/api/frete`.
- **Com as credenciais do contrato dos Correios** (variáveis `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO`, `CORREIOS_CARTAO_POSTAGEM`,
  `CORREIOS_CONTRATO`; opcionais `CORREIOS_DR` e `CEP_ORIGEM`), o preço e o prazo de PAC e SEDEX vêm da API dos Correios (`src/lib/correios.ts`).
  **Essa integração ainda não foi testada contra a API real** — confira na primeira cotação.
- **Origem dos pedidos:** Av. Ayrton Senna, 2541 — Barra da Tijuca, Rio de Janeiro/RJ, **CEP 22631-004** (`CEP_ORIGEM_PADRAO`).
- **Sem elas**, o site usa uma ESTIMATIVA DE EXEMPLO por região (`estimativaDeExemplo`), marcada como estimativa na tela e no pedido.
- Peso e caixa vêm de valores assumidos por categoria em `src/lib/frete.ts` — ajuste conforme a realidade da loja.
- Para frete grátis a partir de um valor, use `FRETE_GRATIS_ACIMA` (ainda desligado).
