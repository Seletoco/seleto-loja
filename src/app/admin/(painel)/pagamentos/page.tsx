import { bancoLigado } from "@/lib/db";
import { pagamentosRecentes } from "@/lib/admin-dados";
import { configDaRede, resumoDaConfig } from "@/lib/rede";
import { reais } from "@/lib/format";
import { CartaoRede } from "@/components/admin/CartaoRede";
import { Secao, Vazio } from "@/components/admin/Blocos";

const ROTULO: Record<string, string> = { pendente: "Aguardando", pago: "Pago", cancelado: "Cancelado", expirado: "Vencido", erro: "Erro" };
const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Pagamentos() {
  const dados = bancoLigado() ? await pagamentosRecentes() : null;
  return (
    <div className="space-y-8">
      <CartaoRede resumo={resumoDaConfig(configDaRede())} />
      <Secao titulo="Cobranças (Pix pela Rede)">
        {!dados ? (
          <Vazio>Banco não ligado.</Vazio>
        ) : dados.semTabela ? (
          <Vazio>Falta aplicar a migration 013 (tabela de pagamentos). Peça ao responsável técnico.</Vazio>
        ) : dados.lista.length === 0 ? (
          <Vazio>Nenhuma cobrança gerada ainda. Gere o Pix na aba Pedidos.</Vazio>
        ) : (
          <div className="overflow-x-auto border border-borda bg-painel">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-borda text-xs uppercase tracking-wide text-fraco"><th className="p-3">Pedido</th><th className="p-3">Cliente</th><th className="p-3">Valor</th><th className="p-3">Situação</th><th className="p-3">Gerado</th><th className="p-3">Pago</th></tr></thead>
              <tbody>
                {dados.lista.map((p, i) => (
                  <tr key={i} className="border-b border-borda last:border-0">
                    <td className="p-3 font-bold">#{p.numero}</td>
                    <td className="p-3">{p.cliente}</td>
                    <td className="p-3">{reais(p.valor)}</td>
                    <td className={`p-3 font-bold ${p.status === "pago" ? "text-ok" : ""}`}>{ROTULO[p.status] ?? p.status}{p.ambiente === "sandbox" ? " (teste)" : ""}</td>
                    <td className="p-3 text-fraco">{hora(p.criadoEm)}</td>
                    <td className="p-3 text-fraco">{p.pagoEm ? hora(p.pagoEm) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
      {dados && !dados.semTabela ? (
        <Secao titulo="Avisos recebidos da Rede">
          {dados.eventos.length === 0 ? (
            <Vazio>Nenhum aviso recebido. Em produção, o endereço do aviso é cadastrado pela central da Rede.</Vazio>
          ) : (
            <ul className="divide-y divide-borda border border-borda bg-painel text-sm">
              {dados.eventos.map((e, i) => <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2"><span>{e.eventos.join(", ") || "—"}</span><span className="text-fraco">{hora(e.recebidoEm)} · TID {e.tid ?? "—"}</span></li>)}
            </ul>
          )}
        </Secao>
      ) : null}
    </div>
  );
}
