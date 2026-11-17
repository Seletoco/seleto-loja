import Link from "next/link";
import { bancoLigado } from "@/lib/db";
import { listarPedidos, STATUS_PEDIDO } from "@/lib/pedidos-admin";
import { cartaoAtivo, ultimasCobrancas } from "@/lib/pagamentos";
import { configDaRede, podeCobrar } from "@/lib/rede";
import { LOJAS } from "@/lib/lojas";
import { reais } from "@/lib/format";
import { PainelPedidos } from "@/components/admin/PainelPedidos";
import { ROTULO_STATUS, Vazio } from "@/components/admin/Blocos";

type Q = { status?: string; loja?: string; busca?: string; dias?: string; numero?: string };

export default async function Pedidos({ searchParams }: { searchParams: Promise<Q> }) {
  if (!bancoLigado()) return <Vazio>Banco não ligado: defina LOJA_DATABASE_URL na Vercel.</Vazio>;
  const q = await searchParams;
  const filtro = {
    status: q.status || undefined,
    loja: Number(q.loja) || undefined,
    busca: q.busca || undefined,
    dias: Number(q.dias) || undefined,
    numero: Number(q.numero) || undefined,
  };
  const lista = await listarPedidos(filtro);
  const cobrancas = await ultimasCobrancas(lista.map((p) => p.numero));
  const pedidos = lista.map((p) => (cobrancas[p.numero] ? { ...p, cobranca: { ...cobrancas[p.numero], emv: undefined } } : p));
  const total = lista.filter((p) => p.status !== "cancelado").reduce((s, p) => s + p.total, 0);
  const filtrando = Object.values(filtro).some(Boolean);

  return (
    <div className="space-y-4">
      <form className="grid gap-2 border border-borda bg-painel p-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_150px_auto]" action="/admin/pedidos">
        <input name="busca" defaultValue={q.busca ?? ""} className="campo" placeholder="Nome, celular ou nº do pedido" aria-label="Buscar" />
        <select name="status" defaultValue={q.status ?? ""} className="campo" aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS_PEDIDO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s] ?? s}</option>)}
        </select>
        <select name="loja" defaultValue={q.loja ?? ""} className="campo" aria-label="Loja">
          <option value="">Todas as lojas</option>
          {LOJAS.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        <select name="dias" defaultValue={q.dias ?? ""} className="campo" aria-label="Período">
          <option value="">Qualquer data</option>
          <option value="1">Hoje e ontem</option>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
        </select>
        <div className="flex gap-2">
          <button className="btn !px-4 !py-2 !text-xs">Filtrar</button>
          {filtrando ? <Link href="/admin/pedidos" className="btn-claro !px-4 !py-2 !text-xs">Limpar</Link> : null}
        </div>
      </form>
      <p className="text-xs text-fraco">
        {lista.length} {lista.length === 1 ? "pedido" : "pedidos"}{filtrando ? " no filtro" : ""} · {reais(total)} sem os cancelados
        {lista.length === 200 ? " · mostrando os 200 mais recentes" : ""}
      </p>
      <PainelPedidos doBanco={pedidos} pixLigado={podeCobrar(configDaRede())} cartaoLigado={cartaoAtivo() && podeCobrar(configDaRede())} />
    </div>
  );
}
