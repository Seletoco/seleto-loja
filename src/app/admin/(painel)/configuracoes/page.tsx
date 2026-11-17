import { configuracaoDoSite } from "@/lib/admin-dados";
import { regrasCashback } from "@/lib/regras-servidor";
import { Secao } from "@/components/admin/Blocos";

export default async function Configuracoes() {
  const itens = configuracaoDoSite();
  const grupos = [...new Set(itens.map((i) => i.grupo))];
  const r = await regrasCashback();
  return (
    <div className="space-y-8">
      <p className="text-sm text-fraco">Só mostra se cada configuração existe. Os valores ficam na Vercel (Settings → Environment Variables) e nunca aparecem aqui.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        {grupos.map((g) => (
          <Secao key={g} titulo={g}>
            <ul className="divide-y divide-borda border border-borda bg-painel text-sm">
              {itens.filter((i) => i.grupo === g).map((i) => (
                <li key={i.nome} className="flex gap-3 px-4 py-3">
                  <span className={`mt-0.5 font-black ${i.ok ? "text-ok" : "text-promo"}`}>{i.ok ? "✓" : "!"}</span>
                  <span><b>{i.nome}</b><span className="block text-xs text-fraco">{i.detalhe}</span></span>
                </li>
              ))}
            </ul>
          </Secao>
        ))}
      </div>
      <Secao titulo="Regras de cashback (lidas do sistema)">
        <ul className="grid gap-2 border border-borda bg-painel p-4 text-sm sm:grid-cols-2">
          <li>Ganho: <b>{r.ganhoMinPct}% a {r.ganhoMaxPct}%</b> (Pix e dinheiro pagam mais)</li>
          <li>Libera em <b>{r.diasParaLiberar} dias</b> e vale <b>{r.validadeDias} dias</b></li>
          <li>Uso máximo por compra: <b>{r.tetoUsoPct}%</b></li>
          <li>Cashback automático: <b>{r.geraAgora ? "ligado" : "desligado"}</b>{r.exemplo ? " (regras de exemplo: banco não lido)" : ""}</li>
        </ul>
      </Secao>
    </div>
  );
}
