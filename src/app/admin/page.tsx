import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, admLogado, usandoCredencialDeTeste } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { listarPedidos } from "@/lib/pedidos-admin";
import { garantirCatalogo, statusDoCatalogo } from "@/lib/catalogo";
import { PainelPedidos } from "./painel";

// Painel depende do login (cookie) e do banco: nunca pré-gerar.
export const dynamic = "force-dynamic";

async function sair() {
  "use server";
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export default async function Admin() {
  if (!(await admLogado())) redirect("/admin/login");
  const doBanco = bancoLigado() ? await listarPedidos() : undefined;
  await garantirCatalogo();
  const cat = statusDoCatalogo();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Painel da loja</h1>
        <form action={sair}>
          <button className="btn-claro">Sair</button>
        </form>
      </div>
      {usandoCredencialDeTeste() ? (
        <p className="rounded-md border border-promo/40 bg-white p-3 text-sm text-promo">
          Você está usando as credenciais de teste. Defina ADMIN_USUARIO e ADMIN_SENHA na Vercel antes de ir ao ar.
        </p>
      ) : null}
      <section className="rounded-lg border border-borda bg-painel p-4 text-sm">
        <p className="font-semibold">Catálogo</p>
        <p className="text-fraco">
          Fonte: <b className="text-texto">{cat.fonte === "banco" ? "banco (tempo real, cache de 5 min)" : "arquivo antigo (data/produtos.json)"}</b>
          {" · "}{cat.produtos} produtos ({cat.comFoto} com foto)
          {cat.atualizadoEm ? <> · lido às {new Date(cat.atualizadoEm).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</> : null}
          {cat.desligado ? " · DESLIGADO por CATALOGO_DO_BANCO=0" : null}
        </p>
        {cat.erro ? <p className="mt-1 text-promo">Último aviso: {cat.erro}</p> : null}
      </section>
      <PainelPedidos doBanco={doBanco} />
    </div>
  );
}
