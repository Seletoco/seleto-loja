import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, admLogado, usandoCredencialDeTeste } from "@/lib/admin";
import { AbasAdmin } from "@/components/admin/AbasAdmin";

// Tudo do painel depende do login (cookie) e do banco: nunca pré-gerar.
export const dynamic = "force-dynamic";

async function sair() {
  "use server";
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!(await admLogado())) redirect("/admin/login");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-fraco">Seleto · loja online</p>
          <h1 className="titulao text-3xl">Painel da loja</h1>
        </div>
        <form action={sair}>
          <button className="btn-claro !px-4 !py-2 !text-xs">Sair</button>
        </form>
      </div>
      {usandoCredencialDeTeste() ? (
        <p className="border border-promo/40 bg-white p-3 text-sm text-promo print:hidden">Você está usando as credenciais de teste. Defina ADMIN_USUARIO e ADMIN_SENHA na Vercel.</p>
      ) : null}
      <AbasAdmin />
      <div>{children}</div>
    </div>
  );
}
