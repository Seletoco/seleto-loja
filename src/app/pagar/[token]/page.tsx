import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { bancoLigado } from "@/lib/db";
import { cobrancaPorToken } from "@/lib/pagamentos";
import { resumoDoPedido, type ResumoPedido } from "@/lib/pedido-resumo";
import { linkWhatsappGeral } from "@/lib/lojas";
import { reais } from "@/lib/format";
import { CopiaECola, Atualizador, Contagem, FormCartao } from "./cliente";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento do pedido", robots: { index: false, follow: false } };

const Cadeado = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const Check = ({ tamanho = 16 }: { tamanho?: number }) => (
  <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** Etapas do pedido: o cliente sempre sabe onde está. */
function Etapas({ pago }: { pago: boolean }) {
  const passos = [
    { rotulo: "Pedido", feito: true },
    { rotulo: "Pagamento", feito: pago, atual: !pago },
    { rotulo: "Confirmação", feito: pago },
  ];
  return (
    <ol className="mx-auto flex max-w-md items-center justify-between text-xs font-bold uppercase tracking-wide" aria-label="Etapas do pedido">
      {passos.map((p, i) => (
        <li key={p.rotulo} className="flex flex-1 items-center">
          <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${p.feito ? "border-ok bg-ok text-white" : p.atual ? "border-texto text-texto" : "border-borda text-fraco"}`} aria-current={p.atual ? "step" : undefined}>
            {p.feito ? <Check tamanho={12} /> : i + 1}
          </span>
          <span className={`ml-2 ${p.feito || p.atual ? "text-texto" : "text-fraco"}`}>{p.rotulo}</span>
          {i < passos.length - 1 ? <span className={`mx-3 h-0.5 flex-1 ${passos[i + 1].feito || passos[i + 1].atual ? "bg-texto" : "bg-borda"}`} /> : null}
        </li>
      ))}
    </ol>
  );
}

function Resumo({ r }: { r: ResumoPedido }) {
  return (
    <aside className="h-fit space-y-4 border border-borda bg-painel p-5 text-sm lg:sticky lg:top-28">
      <h2 className="text-xs font-black uppercase tracking-widest">Resumo do pedido {r.numero}</h2>
      <ul className="divide-y divide-borda">
        {r.itens.map((i, k) => (
          <li key={k} className="flex justify-between gap-3 py-2">
            <span>
              <span className="block font-medium">{i.quantidade}× {i.nome}</span>
              <span className="block text-xs text-fraco">{[i.cor, i.tamanho && `Tam. ${i.tamanho}`].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="shrink-0 font-bold">{reais(i.preco * i.quantidade)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-borda pt-3">
        <div className="flex justify-between text-fraco"><dt>Subtotal</dt><dd>{reais(r.subtotal)}</dd></div>
        <div className="flex justify-between text-fraco"><dt>Frete{r.servico ? ` (${r.servico})` : ""}</dt><dd>{r.retirada ? "Grátis (retirada)" : reais(r.frete)}</dd></div>
        {r.cashback > 0 ? <div className="flex justify-between text-ok"><dt>Cashback usado</dt><dd>- {reais(r.cashback)}</dd></div> : null}
        <div className="flex justify-between border-t border-borda pt-2 text-base font-black"><dt>Total</dt><dd>{reais(r.total)}</dd></div>
      </dl>
      <div className="border-t border-borda pt-3 text-xs text-fraco">
        <p className="font-bold uppercase tracking-wide text-texto">{r.retirada ? "Retirada" : "Entrega"}</p>
        <p className="mt-1">
          {r.retirada ? `Na loja ${r.loja ?? "escolhida"}, sem custo.` : (r.endereco ?? "Endereço informado no pedido.")}
          {!r.retirada && r.prazoDias ? ` Prazo: até ${r.prazoDias} dias úteis após o envio.` : ""}
        </p>
      </div>
    </aside>
  );
}

export default async function Pagar({ params }: { params: Promise<{ token: string }> }) {
  if (!bancoLigado()) notFound();
  const { token } = await params;
  const c = await cobrancaPorToken(token).catch(() => null);
  if (!c) notFound();
  const resumo = await resumoDoPedido(c.pedidoNumero).catch(() => null);
  const cartao = c.metodo === "cartao";
  const pago = c.status === "pago";
  const qr = !cartao && c.status === "pendente" && c.emv ? await QRCode.toDataURL(c.emv, { margin: 1, width: 280 }) : null;
  const zap = linkWhatsappGeral(`Olá! Sobre o meu pedido ${c.pedidoNumero} no site da Seleto.`);

  const proximos = resumo
    ? [
        { t: "Pagamento confirmado", d: "Recebemos o seu pagamento.", feito: true },
        { t: "A loja separa o seu pedido", d: "Conferimos o estoque e embalamos com cuidado.", feito: false },
        resumo.retirada
          ? { t: `Retire na loja ${resumo.loja ?? ""}`.trim(), d: "A loja avisa você pelo WhatsApp quando estiver pronto.", feito: false }
          : { t: "Enviamos para o seu endereço", d: `${resumo.servico ?? "Entrega"}${resumo.prazoDias ? `, em até ${resumo.prazoDias} dias úteis` : ""}. A nota fiscal acompanha o pedido.`, feito: false },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      {c.ambiente === "sandbox" ? (
        <p className="bg-destaque px-3 py-2 text-center text-xs font-bold uppercase tracking-wide">Ambiente de teste da Rede: {cartao ? "use só cartões de teste" : "não pague este QR Code"}</p>
      ) : null}

      <div className="space-y-4 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-fraco">
          <Cadeado /> Pagamento seguro
        </p>
        <Etapas pago={pago} />
      </div>

      <div className={`grid items-start gap-6 ${resumo ? "lg:grid-cols-[1fr_340px]" : "mx-auto max-w-md"}`}>
        <div className="space-y-4">
          <div className="text-center lg:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-fraco">Pedido {c.pedidoNumero}</p>
            <h1 className="titulao mt-1 text-3xl sm:text-4xl">{pago ? "Pagamento aprovado!" : cartao ? "Pague com cartão" : "Pague com Pix"}</h1>
            {!pago ? <p className="mt-2 text-3xl font-black">{reais(c.valor)}</p> : null}
          </div>

          {pago ? (
            <div className="space-y-5 border border-ok bg-painel p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ok text-white"><Check tamanho={26} /></span>
                <div>
                  <p className="text-lg font-black text-ok">Compra confirmada</p>
                  <p className="text-sm text-fraco">{reais(c.valor)} pagos {cartao ? "no cartão de crédito" : "por Pix"}. Obrigado por comprar na Seleto!</p>
                </div>
              </div>
              {proximos.length ? (
                <ol className="space-y-3 border-t border-borda pt-4">
                  {proximos.map((p, i) => (
                    <li key={i} className="flex gap-3">
                      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${p.feito ? "bg-ok text-white" : "border border-borda text-fraco"}`}>{p.feito ? <Check tamanho={11} /> : i + 1}</span>
                      <span className="text-sm">
                        <span className="block font-bold">{p.t}</span>
                        <span className="block text-fraco">{p.d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Link href="/conta?aba=pedidos" className="btn">Acompanhar meus pedidos</Link>
                <Link href="/produtos" className="btn-claro">Continuar comprando</Link>
                {zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="btn-claro">Falar com a loja</a> : null}
              </div>
              <p className="text-xs text-fraco">Guarde o número do pedido: <b className="text-texto">{c.pedidoNumero}</b>. Você também encontra tudo em “Meu cashback &gt; Pedidos”.</p>
            </div>
          ) : cartao && c.status === "pendente" ? (
            <FormCartao token={token} valor={c.valor} parcelasMax={c.parcelasMax} />
          ) : c.status === "pendente" && qr && c.emv ? (
            <div className="space-y-4 border border-borda bg-painel p-5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR Code gerado no servidor (data URL) */}
              <img src={qr} alt="QR Code do Pix" width={260} height={260} className="mx-auto" />
              <ol className="mx-auto max-w-xs space-y-1 text-left text-sm text-fraco">
                <li><b className="text-texto">1.</b> Abra o app do seu banco e escolha <b className="text-texto">Pix</b>.</li>
                <li><b className="text-texto">2.</b> Leia o QR Code ou use o <b className="text-texto">copia e cola</b>.</li>
                <li><b className="text-texto">3.</b> Confirme. Esta página avisa sozinha quando cair.</li>
              </ol>
              <CopiaECola codigo={c.emv} />
              {c.expiraEm ? <Contagem ate={c.expiraEm} /> : null}
              <Atualizador token={token} />
            </div>
          ) : (
            <div className="border border-borda bg-painel p-6 text-center">
              <p className="font-bold">
                {c.status === "erro" && cartao ? "Não conseguimos confirmar este pagamento." : c.status === "expirado" ? "Este link venceu." : c.status === "cancelado" ? "Este pagamento foi cancelado ou devolvido." : "Este link não está disponível."}
              </p>
              <p className="mt-1 text-sm text-fraco">
                {c.status === "erro" && cartao ? "Não tente pagar de novo: fale com a loja pelo WhatsApp que conferimos na Rede." : "Fale com a loja pelo WhatsApp para receber um novo."}
              </p>
              {zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="btn mt-4">Falar com a loja</a> : null}
            </div>
          )}

          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-fraco lg:justify-start">
            <li className="inline-flex items-center gap-1.5"><Cadeado /> Conexão protegida</li>
            <li>Pagamento processado pela Rede (Itaú)</li>
            <li>Visa · Mastercard · Elo · Amex · Hipercard</li>
          </ul>
          <p className="text-xs text-fraco">A Seleto nunca pede senha, código nem dados do cartão por mensagem.</p>
        </div>

        {resumo ? <Resumo r={resumo} /> : null}
      </div>
    </div>
  );
}
