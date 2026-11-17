import { notFound } from "next/navigation";
import { bancoLigado } from "@/lib/db";
import { listarPedidos } from "@/lib/pedidos-admin";
import { reais, telefoneBonito } from "@/lib/format";
import { ROTULO_STATUS } from "@/components/admin/Blocos";
import { BotaoImprimir } from "@/components/admin/BotaoImprimir";

/** Folha de separação para imprimir: o que pegar no estoque e para quem. */
export default async function Separacao({ params }: { params: Promise<{ numero: string }> }) {
  if (!bancoLigado()) notFound();
  const { numero } = await params;
  const n = Number(numero);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const [p] = await listarPedidos({ numero: n }, 1);
  if (!p) notFound();
  const data = new Date(p.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    <div className="mx-auto max-w-2xl space-y-5 bg-white p-6 text-sm print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-fraco">Folha de separação · Seleto</p>
          <h2 className="titulao text-4xl">Pedido #{p.numero}</h2>
          <p className="text-fraco">{data} · {ROTULO_STATUS[p.status] ?? p.status}</p>
        </div>
        <BotaoImprimir />
      </div>
      <div className="grid gap-4 border-y border-borda py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-fraco">Cliente</p>
          <p className="font-bold">{p.cliente.nome}</p>
          <p>{telefoneBonito(p.cliente.telefone)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-fraco">{p.entrega.tipo === "retirada_loja" ? "Retirada" : "Entrega"}</p>
          <p className="font-bold">{p.entrega.tipo === "retirada_loja" ? `Loja ${p.entrega.loja ?? "—"}` : p.entrega.servico ?? "A combinar"}</p>
          {p.entrega.endereco ? <p>{p.entrega.endereco}</p> : null}
        </div>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-texto text-xs uppercase tracking-wide">
            <th className="py-2">✓</th><th className="py-2">Produto</th><th className="py-2">Ref.</th><th className="py-2">Cor</th><th className="py-2">Tam.</th><th className="py-2 text-right">Qtd.</th>
          </tr>
        </thead>
        <tbody>
          {p.itens.map((i) => (
            <tr key={i.ref + i.tamanho + i.cor} className="border-b border-borda">
              <td className="py-2 pr-2"><span className="inline-block size-4 border border-texto" /></td>
              <td className="py-2 pr-2 font-bold">{i.nome}</td>
              <td className="py-2 pr-2">{i.ref}</td>
              <td className="py-2 pr-2">{i.cor || "—"}</td>
              <td className="py-2 pr-2">{i.tamanho || "—"}</td>
              <td className="py-2 text-right font-bold">{i.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 text-right">
        <p>Subtotal {reais(p.subtotal)}{p.frete ? ` · Frete ${reais(p.frete)}` : ""}</p>
        {p.cashback ? <p className="font-bold">Cashback a abater no caixa: {reais(p.cashback.usado)}</p> : null}
        <p className="text-lg font-black">Total {reais(p.total)}</p>
        <p className="text-fraco">Pagamento: {p.cobranca?.status === "pago" ? "Pix pago pelo site" : p.pagamento.rotulo}</p>
      </div>
      <p className="border-t border-borda pt-3 text-xs text-fraco">Separado por: ______________________ &nbsp; Conferido por: ______________________</p>
    </div>
  );
}
