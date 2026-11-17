import Link from "next/link";
import { bancoLigado } from "@/lib/db";
import { resumoDoSite } from "@/lib/admin-dados";
import { listarPedidos } from "@/lib/pedidos-admin";
import { garantirCatalogo, statusDoCatalogo } from "@/lib/catalogo";
import { reais } from "@/lib/format";
import { Numero, ROTULO_STATUS, Secao, Vazio } from "@/components/admin/Blocos";

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Resumo() {
  await garantirCatalogo();
  const cat = statusDoCatalogo();
  if (!bancoLigado()) return <Vazio>Banco não ligado: defina LOJA_DATABASE_URL na Vercel para ver os números.</Vazio>;
  const [r, ultimos] = await Promise.all([resumoDoSite(), listarPedidos({}, 6)]);
  const fila = ["aguardando_pagamento", "pago", "em_separacao", "pronto_retirada"].map((s) => [s, r.porStatus[s] ?? 0] as const);
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Hoje" valor={reais(r.hoje.valor)} detalhe={`${r.hoje.pedidos} ${r.hoje.pedidos === 1 ? "pedido" : "pedidos"}`} destaque />
        <Numero rotulo="Últimos 7 dias" valor={reais(r.semana.valor)} detalhe={`${r.semana.pedidos} pedidos`} />
        <Numero rotulo="Últimos 30 dias" valor={reais(r.mes.valor)} detalhe={`${r.mes.pedidos} pedidos · ticket médio ${reais(r.ticketMedio30)}`} />
        <Numero rotulo="Pix pagos (30 dias)" valor={reais(r.pixPagos30.valor)} detalhe={`${r.pixPagos30.pedidos} pedidos`} />
      </div>

      <Secao titulo="Fila de trabalho" acao={<Link href="/admin/pedidos" className="text-xs font-bold underline">Ver pedidos</Link>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fila.map(([s, n]) => (
            <Link key={s} href={`/admin/pedidos?status=${s}`} className="border border-borda bg-painel p-4 transition hover:border-texto">
              <p className="text-xs font-bold uppercase tracking-widest text-fraco">{ROTULO_STATUS[s]}</p>
              <p className="mt-1 text-2xl font-black">{n}</p>
            </Link>
          ))}
        </div>
      </Secao>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Secao titulo="Últimos pedidos">
          {ultimos.length === 0 ? (
            <Vazio>Nenhum pedido ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-borda border border-borda bg-painel">
              {ultimos.map((p) => (
                <li key={p.numero}>
                  <Link href={`/admin/pedidos?numero=${p.numero}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-tenue">
                    <span><b>#{p.numero}</b> · {p.cliente.nome} · <span className="text-fraco">{hora(p.criadoEm)}</span></span>
                    <span className="flex items-center gap-3"><span className="text-xs text-fraco">{ROTULO_STATUS[p.status] ?? p.status}</span><b>{reais(p.total)}</b></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>
        <div className="space-y-8">
          <Secao titulo="Clientes do site" acao={<Link href="/admin/clientes" className="text-xs font-bold underline">Ver</Link>}>
            <div className="grid grid-cols-3 gap-3">
              <Numero rotulo="Contas" valor={String(r.contas.total)} />
              <Numero rotulo="Ligadas" valor={String(r.contas.ligadas)} />
              <Numero rotulo="Novas 30d" valor={String(r.contas.novas30)} />
            </div>
            <p className="text-xs text-fraco">{r.alertasAtivos} {r.alertasAtivos === 1 ? "pedido" : "pedidos"} de &quot;me avise quando chegar&quot; em aberto.</p>
          </Secao>
          <Secao titulo="Catálogo" acao={<Link href="/admin/catalogo" className="text-xs font-bold underline">Ver</Link>}>
            <p className="border border-borda bg-painel p-4 text-sm">
              <b>{cat.produtos}</b> produtos no site · fonte {cat.fonte === "banco" ? "banco (tempo real)" : "arquivo antigo"}
              {cat.erro ? <span className="mt-1 block text-xs text-promo">Último aviso: {cat.erro}</span> : null}
            </p>
          </Secao>
        </div>
      </div>
    </div>
  );
}
