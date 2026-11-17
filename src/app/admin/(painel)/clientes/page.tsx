import { bancoLigado } from "@/lib/db";
import { alertasAgrupados, listarContas, resumoDoSite } from "@/lib/admin-dados";
import { Numero, Secao, Vazio } from "@/components/admin/Blocos";

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

export default async function Clientes() {
  if (!bancoLigado()) return <Vazio>Banco não ligado: defina LOJA_DATABASE_URL na Vercel.</Vazio>;
  const [r, contas, alertas] = await Promise.all([resumoDoSite(), listarContas(), alertasAgrupados()]);
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-4">
        <Numero rotulo="Contas no site" valor={String(r.contas.total)} />
        <Numero rotulo="Ligadas ao cadastro" valor={String(r.contas.ligadas)} detalhe="CPF conferido com o cadastro das lojas" />
        <Numero rotulo="Novas em 30 dias" valor={String(r.contas.novas30)} />
        <Numero rotulo="Avise-me em aberto" valor={String(r.alertasAtivos)} />
      </div>

      <Secao titulo='O que pediram para ser avisados ("me avise quando chegar")'>
        {alertas.length === 0 ? (
          <Vazio>Nenhum pedido de aviso em aberto.</Vazio>
        ) : (
          <div className="overflow-x-auto border border-borda bg-painel">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-borda text-xs uppercase tracking-wide text-fraco"><th className="p-3">Produto procurado</th><th className="p-3">Tamanho</th><th className="p-3 text-right">Pedidos</th><th className="p-3">Último</th></tr></thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.descricao + (a.tamanho ?? "")} className="border-b border-borda last:border-0">
                    <td className="p-3 font-bold">{a.descricao}</td><td className="p-3">{a.tamanho ?? "—"}</td><td className="p-3 text-right">{a.pedidos}</td><td className="p-3 text-fraco">{data(a.ultimo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Contas">
        {contas.length === 0 ? (
          <Vazio>Nenhuma conta criada ainda.</Vazio>
        ) : (
          <div className="overflow-x-auto border border-borda bg-painel">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-borda text-xs uppercase tracking-wide text-fraco"><th className="p-3">E-mail</th><th className="p-3">Nome</th><th className="p-3">Cadastro das lojas</th><th className="p-3">Criada</th><th className="p-3">Último acesso</th></tr></thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.email} className="border-b border-borda last:border-0">
                    <td className="p-3">{c.email}</td>
                    <td className="p-3">{c.nome ?? "—"}</td>
                    <td className="p-3">{c.ligada ? <span className="font-bold text-ok">Ligada</span> : <span className="text-fraco">Não ligada</span>}</td>
                    <td className="p-3 text-fraco">{data(c.criadaEm)}</td>
                    <td className="p-3 text-fraco">{data(c.ultimoLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-fraco">O CPF nunca aparece aqui: o site só guarda se a conta foi ligada ao cadastro das lojas.</p>
      </Secao>
    </div>
  );
}
