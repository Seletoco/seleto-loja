import Link from "next/link";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { marcas } from "@/lib/catalogo";

/** "New Balance" -> "newbalance"; "HIGH Company" -> "highcompany". É o nome do arquivo da logo em public/marcas. */
const slug = (nome: string) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Logos disponíveis: qualquer arquivo `public/marcas/<slug>.(svg|png|webp|jpg)` aparece sozinho. */
function logosDisponiveis(): Map<string, string> {
  const m = new Map<string, string>();
  try {
    const pasta = join(process.cwd(), "public", "marcas");
    if (!existsSync(pasta)) return m;
    for (const arquivo of readdirSync(pasta)) {
      const mt = /^(.+)\.(svg|png|webp|jpe?g)$/i.exec(arquivo);
      if (mt) m.set(mt[1].toLowerCase(), `/marcas/${arquivo}`);
    }
  } catch {
    /* sem logos: todas as marcas caem no nome em letras grandes */
  }
  return m;
}

/**
 * "Compre por marca": um botão por marca. Com a logo, quando o arquivo existe; senão, o nome em letras
 * grandes. No mouse, o botão inverte (fundo preto, logo branca).
 */
export function MarcasEmDestaque({ quantas = 12 }: { quantas?: number }) {
  const logos = logosDisponiveis();
  const lista = marcas().filter((m) => m.valor !== "Outros").slice(0, quantas);
  return (
    <section aria-label="Compre por marca">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="titulao text-3xl sm:text-4xl">Compre por marca</h2>
        <Link href="/produtos" className="text-sm font-bold underline">Ver tudo</Link>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {lista.map((m) => {
          const logo = logos.get(slug(m.valor));
          return (
            <li key={m.valor}>
              <Link
                href={`/produtos?marca=${encodeURIComponent(m.valor)}`}
                className="group flex h-36 flex-col items-center justify-between border border-borda bg-white px-4 pb-3 pt-4 transition duration-300 hover:-translate-y-0.5 hover:border-texto hover:bg-texto hover:text-white hover:shadow-lg sm:h-40"
              >
                <span className="flex w-full flex-1 items-center justify-center">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logos estáticas em /public/marcas
                    <img src={logo} alt={m.valor} loading="lazy" className="max-h-14 w-auto max-w-[75%] object-contain transition duration-300 group-hover:invert sm:max-h-16" />
                  ) : (
                    <span className="titulao line-clamp-2 text-center text-2xl leading-none sm:text-3xl">{m.valor}</span>
                  )}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-fraco transition group-hover:text-white/70">
                  {m.n} produtos
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
