import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, admLogado, usandoCredencialDeTeste } from "@/lib/admin";
import { bancoLigado } from "@/lib/db";
import { listarPedidos } from "@/lib/pedidos-admin";
import { PainelPedidos } from "./painel";

async function sair() {
  "use server";
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export default async function Admin() {
  if (!(await admLogado())) redirect("/admin/login");
  const doBanco = bancoLigado() ? await listarPedidos() : undefined;
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
      <PainelPedidos doBanco={doBanco} />
    </div>
  );
}
