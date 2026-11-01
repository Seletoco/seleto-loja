import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, admLogado, credenciaisValidas, criarToken, opcoesCookie, usandoCredencialDeTeste } from "@/lib/admin";

async function entrar(formData: FormData) {
  "use server";
  const u = String(formData.get("usuario") ?? "");
  const s = String(formData.get("senha") ?? "");
  if (!credenciaisValidas(u, s)) redirect("/admin/login?erro=1");
  (await cookies()).set(COOKIE, criarToken(), opcoesCookie);
  redirect("/admin");
}

export default async function LoginAdmin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await admLogado()) redirect("/admin");
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-xl border border-borda bg-painel p-6">
      <h1 className="text-xl font-bold">Admin da loja</h1>
      <form action={entrar} className="space-y-3">
        <input name="usuario" className="campo" placeholder="Usuário" autoComplete="username" required />
        <input name="senha" type="password" className="campo" placeholder="Senha" autoComplete="current-password" required />
        {erro ? <p className="text-sm text-promo">Usuário ou senha incorretos.</p> : null}
        <button className="btn w-full">Entrar</button>
      </form>
      {usandoCredencialDeTeste() ? (
        <p className="rounded-md border border-borda bg-tenue p-3 text-xs text-fraco">
          Credenciais de <strong>teste</strong> ativas (usuário <code>admin</code>, senha <code>seleto-teste-2026</code>).
          Defina <code>ADMIN_USUARIO</code> e <code>ADMIN_SENHA</code> na Vercel para trocar.
        </p>
      ) : null}
    </div>
  );
}
