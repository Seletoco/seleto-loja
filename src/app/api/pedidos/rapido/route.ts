import { NextResponse } from "next/server";
import { bancoLigado } from "@/lib/db";
import { garantirCatalogo, produtoPorRef } from "@/lib/catalogo";
import { LOJAS } from "@/lib/lojas";
import { validarPedido } from "@/lib/pedido-servidor";
import { regrasCashback } from "@/lib/regras-servidor";
import { excedeuLimiteDePedidos, gravarPedido } from "@/lib/pedido-banco";
import { perfilDoCadastro } from "@/lib/perfil-servidor";
import { ipDe } from "@/lib/conta-servidor";
import { sessaoAtual } from "@/lib/sessao";
import { cartaoAtivo, gerarCartao, gerarPix } from "@/lib/pagamentos";
import { configDaRede, podeCobrar } from "@/lib/rede";

/**
 * Compra com 1 clique: 1 unidade, RETIRADA na loja escolhida, pagamento na retirada. Nome, celular e e-mail vêm do cadastro
 * da própria pessoa (conta já ligada: CPF + nome + nascimento + celular conferidos). Entrega em casa não entra (precisa de endereço e frete).
 * Pagamento: na retirada (padrão) ou, se a Rede estiver ligada, Pix ou cartão na hora (devolve `pagarUrl` para a página de pagamento).
 */
export async function POST(req: Request) {
  if (!bancoLigado()) return NextResponse.json({ erro: "A compra com 1 clique fica disponível quando a loja estiver ligada ao banco." }, { status: 503 });
  const s = await sessaoAtual();
  if (!s?.cpfHash) return NextResponse.json({ erro: "Entre na sua conta e ligue ao seu cadastro para comprar com 1 clique.", precisaLogin: true }, { status: 401 });
  let c: { ref?: unknown; tamanho?: unknown; lojaId?: unknown; pagamento?: unknown };
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const loja = LOJAS.find((l) => l.id === Number(c.lojaId));
  if (!loja) return NextResponse.json({ erro: "Escolha a loja para retirar." }, { status: 400 });

  const querPix = c.pagamento === "pix";
  const querCartao = c.pagamento === "cartao";
  if (querPix && !podeCobrar(configDaRede())) return NextResponse.json({ erro: "O pagamento por Pix não está disponível agora. Escolha pagar na retirada." }, { status: 400 });
  if (querCartao && !(cartaoAtivo() && podeCobrar(configDaRede()))) return NextResponse.json({ erro: "O pagamento por cartão não está disponível agora. Escolha outra forma." }, { status: 400 });

  const perfil = await perfilDoCadastro(s.cpfHash);
  if (!perfil?.fone) {
    return NextResponse.json({ erro: "Seu cadastro não tem um celular completo. Finalize pelo checkout.", usarCheckout: true }, { status: 409 });
  }
  const emailOk = [perfil.email, s.email].find((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) ?? "";

  await garantirCatalogo();
  const regras = await regrasCashback();
  const v = validarPedido(
    {
      itens: [{ ref: c.ref, tamanho: c.tamanho, quantidade: 1 }],
      cliente: { nome: perfil.nome, telefone: perfil.fone, email: emailOk },
      entrega: { tipo: "retirada_loja", loja: loja.nome },
    },
    produtoPorRef,
    regras.tetoUsoPct,
  );
  if ("erro" in v) return NextResponse.json({ erro: v.erro }, { status: 400 });

  if (await excedeuLimiteDePedidos(ipDe(req))) return NextResponse.json({ erro: "Muitos pedidos em pouco tempo. Tente novamente mais tarde." }, { status: 429 });
  try {
    const numero = await gravarPedido(v.pedido, s.contaId ?? null);
    const p = v.pedido;
    let pagarUrl: string | null = null;
    let avisoPagamento: string | null = null;
    if (querPix || querCartao) {
      // O pedido já está gravado; se a cobrança falhar, ele continua valendo e a loja combina o pagamento.
      const r = await (querCartao ? gerarCartao(numero) : gerarPix(numero)).catch(() => ({ ok: false as const, erro: "falha" }));
      if (r.ok) pagarUrl = `/pagar/${r.cobranca.token}`;
      else avisoPagamento = `Seu pedido foi registrado, mas não conseguimos preparar o pagamento por ${querCartao ? "cartão" : "Pix"} agora. Você pode pagar na loja, ao retirar.`;
    }
    return NextResponse.json({ numero, loja: loja.nome, nome: p.cliente.nome, telefone: p.cliente.telefone, email: p.cliente.email, itens: p.itens, subtotal: p.subtotal, total: p.total, pagamento: pagarUrl ? (querCartao ? "cartao" : "pix") : p.pagamentoMetodo, pagarUrl, avisoPagamento });
  } catch (e) {
    console.error("pedido rápido: falha ao gravar", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "Não foi possível registrar o pedido agora. Tente novamente ou chame a loja no WhatsApp." }, { status: 500 });
  }
}
