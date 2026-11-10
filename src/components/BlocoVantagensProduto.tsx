"use client";

import Link from "next/link";
import { LOJAS, linkWhatsappDaLoja } from "@/lib/lojas";
import { useLojaPreferida } from "@/lib/loja-preferida";
import { reais } from "@/lib/format";

/**
 * Retire na loja + cashback + "avise-me", logo abaixo do botão de comprar.
 * Não promete estoque por loja nem prazo: hoje o catálogo não traz estoque por loja, então
 * a loja confirma a disponibilidade (como já diz o checkout).
 */
export function BlocoVantagensProduto({
  nome,
  faixa,
  minPct,
  maxPct,
  geraAgora,
}: {
  nome: string;
  /** Cashback que esta compra gera, pelas regras do sistema. */
  faixa: { min: number; max: number } | null;
  minPct: number;
  maxPct: number;
  /** O cashback automático está ligado no sistema? */
  geraAgora: boolean;
}) {
  const [lojaId, trocar] = useLojaPreferida();
  const loja = LOJAS.find((l) => String(l.id) === lojaId);
  const zap = loja ? linkWhatsappDaLoja(loja.nome, `Olá! Quero retirar na Seleto ${loja.nome}: ${nome}. Tem disponível?`) : null;
  const aviso = `/conta?aba=ajustes&aviso=${encodeURIComponent(nome)}`;

  return (
    <div className="space-y-3 text-sm">
      <section className="border border-borda p-4">
        <p className="font-black uppercase tracking-wide">Retire grátis na loja</p>
        <p className="mt-1 text-fraco">A loja confirma a disponibilidade do seu tamanho e avisa quando estiver separado.</p>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-fraco" htmlFor="loja-retirada">Minha loja</label>
        <select
          id="loja-retirada"
          className="campo mt-1"
          value={lojaId ?? ""}
          onChange={(e) => trocar(e.target.value)}
        >
          <option value="" disabled>Escolha a loja</option>
          {LOJAS.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
        {zap ? (
          <a href={zap} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold underline underline-offset-4">
            Perguntar a disponibilidade no WhatsApp
          </a>
        ) : null}
      </section>

      <section className="border border-borda bg-tenue p-4">
        <p className="font-black uppercase tracking-wide">Cashback Seleto</p>
        <p className="mt-1 text-fraco">
          {!geraAgora ? (
            <>O cashback desta compra volta em breve. Quem já tem saldo continua usando normalmente no caixa.</>
          ) : faixa ? (
            <>
              Esta compra gera de <b className="text-texto">{reais(faixa.min)}</b>
              {faixa.max !== faixa.min ? <> a <b className="text-texto">{reais(faixa.max)}</b></> : null} de cashback
              ({minPct === maxPct ? `${minPct}%` : `${minPct}% a ${maxPct}%, conforme a forma de pagamento`}) para usar em compras futuras.
            </>
          ) : (
            <>Compre e ganhe cashback para usar nas próximas compras.</>
          )}{" "}
          <Link href="/conta" className="font-bold text-texto underline underline-offset-4">Ver meu saldo</Link>
        </p>
      </section>

      <p className="text-fraco">
        Não achou seu tamanho ou a cor?{" "}
        <Link href={aviso} className="font-bold text-texto underline underline-offset-4">Me avise quando chegar</Link>
      </p>
    </div>
  );
}
