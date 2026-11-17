import { bancoLigado } from "@/lib/db";
import { produtosSemFoto } from "@/lib/admin-dados";
import { buscar, categorias, garantirCatalogo, marcas, statusDoCatalogo } from "@/lib/catalogo";
import { Numero, Secao, Vazio } from "@/components/admin/Blocos";

export default async function Catalogo() {
  await garantirCatalogo();
  const cat = statusDoCatalogo();
  const promo = buscar({ promo: true }).length;
  const novos = buscar({}).filter((p) => p.novo).length;
  const semFoto = bancoLigado() ? await produtosSemFoto() : null;
  const hora = cat.atualizadoEm ? new Date(cat.atualizadoEm).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Numero rotulo="No site" valor={String(cat.produtos)} detalhe={`fonte: ${cat.fonte === "banco" ? "banco, atualiza a cada 5 min" : "arquivo antigo"}${hora ? ` · lido às ${hora}` : ""}`} destaque />
        <Numero rotulo="Em promoção" valor={String(promo)} />
        <Numero rotulo="Novidades" valor={String(novos)} />
        <Numero rotulo="Mais vendidos" valor={cat.maisVendidos ? String(cat.maisVendidos) : "—"} detalhe={cat.maisVendidos ? "produtos com venda nas lojas (60 dias)" : "falta aplicar a migration 014 (ranking de vendas)"} />
        <Numero rotulo="Vendáveis sem foto" valor={semFoto ? String(semFoto.total) : "—"} detalhe={semFoto ? `de ${semFoto.vendaveis} vendáveis no sistema (não aparecem no site)` : undefined} />
      </div>
      {cat.erro ? <p className="border border-promo/40 bg-white p-3 text-sm text-promo">Último aviso do catálogo: {cat.erro}</p> : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <Secao titulo="Por categoria">
          <ul className="divide-y divide-borda border border-borda bg-painel text-sm">
            {categorias().map((c) => <li key={c.valor} className="flex justify-between px-4 py-2"><span>{c.valor}</span><b>{c.n}</b></li>)}
          </ul>
        </Secao>
        <Secao titulo="Por marca">
          <ul className="divide-y divide-borda border border-borda bg-painel text-sm">
            {marcas().slice(0, 25).map((m) => <li key={m.valor} className="flex justify-between px-4 py-2"><span>{m.valor}</span><b>{m.n}</b></li>)}
          </ul>
        </Secao>
      </div>

      <Secao titulo="Vendáveis sem foto (fora do site), com mais estoque primeiro">
        {!semFoto ? (
          <Vazio>Banco não ligado.</Vazio>
        ) : semFoto.lista.length === 0 ? (
          <Vazio>Todos os produtos vendáveis têm foto.</Vazio>
        ) : (
          <div className="overflow-x-auto border border-borda bg-painel">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-borda text-xs uppercase tracking-wide text-fraco"><th className="p-3">Ref.</th><th className="p-3">Produto</th><th className="p-3">Marca</th><th className="p-3">Categoria</th></tr></thead>
              <tbody>
                {semFoto.lista.map((p) => (
                  <tr key={p.ref} className="border-b border-borda last:border-0"><td className="p-3 font-mono text-xs">{p.ref}</td><td className="p-3">{p.nome}</td><td className="p-3">{p.marca ?? "—"}</td><td className="p-3">{p.categoria ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-fraco">Para aparecer no site, cadastre a foto no catálogo de fotos do sistema (a mesma usada no SeleChat).</p>
      </Secao>
    </div>
  );
}
