import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { bancoLigado } from "@/lib/db";
import { cobrancaPorToken } from "@/lib/pagamentos";
import { reais } from "@/lib/format";
import { CopiaECola, Atualizador } from "./cliente";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento do pedido", robots: { index: false, follow: false } };

export default async function Pagar({ params }: { params: Promise<{ token: string }> }) {
  if (!bancoLigado()) notFound();
  const { token } = await params;
  const c = await cobrancaPorToken(token).catch(() => null);
  if (!c) notFound();
  const qr = c.status === "pendente" && c.emv ? await QRCode.toDataURL(c.emv, { margin: 1, width: 280 }) : null;
  const vence = c.expiraEm ? new Date(c.expiraEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="mx-auto max-w-md space-y-5 py-4">
      {c.ambiente === "sandbox" ? (
        <p className="bg-destaque px-3 py-2 text-center text-xs font-bold uppercase tracking-wide">Ambiente de teste da Rede: não pague este QR Code</p>
      ) : null}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-fraco">Pedido {c.pedidoNumero}</p>
        <h1 className="titulao mt-1 text-3xl">Pagamento por Pix</h1>
        <p className="mt-2 text-3xl font-black">{reais(c.valor)}</p>
      </div>

      {c.status === "pago" ? (
        <div className="border border-ok bg-painel p-6 text-center">
          <p className="text-lg font-black text-ok">Pagamento confirmado!</p>
          <p className="mt-1 text-sm text-fraco">Obrigado. A loja vai separar o seu pedido e avisar você pelo WhatsApp.</p>
          <a href="/conta?aba=pedidos" className="btn mt-4">Ver meus pedidos</a>
        </div>
      ) : c.status === "pendente" && qr && c.emv ? (
        <div className="space-y-4 border border-borda bg-painel p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR Code gerado no servidor (data URL) */}
          <img src={qr} alt="QR Code do Pix" width={280} height={280} className="mx-auto" />
          <p className="text-sm text-fraco">Abra o app do seu banco, escolha <b className="text-texto">Pix → Ler QR Code</b>, ou copie o código abaixo.</p>
          <CopiaECola codigo={c.emv} />
          {vence ? <p className="text-xs text-fraco">Vale até {vence}.</p> : null}
          <Atualizador token={token} />
        </div>
      ) : (
        <div className="border border-borda bg-painel p-6 text-center">
          <p className="font-bold">{c.status === "expirado" ? "Este Pix venceu." : c.status === "cancelado" ? "Este Pix foi cancelado." : "Este Pix não está disponível."}</p>
          <p className="mt-1 text-sm text-fraco">Fale com a loja pelo WhatsApp para receber um novo.</p>
        </div>
      )}
      <p className="text-center text-xs text-fraco">Pagamento processado pela Rede (Itaú). A Seleto nunca pede senha nem dados do cartão por mensagem.</p>
    </div>
  );
}
