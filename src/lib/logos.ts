/** Logos das marcas: qualquer arquivo `public/marcas/<slug>.(svg|png|webp|jpg)` aparece sozinho (na home e no menu). Só no servidor. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** "New Balance" -> "newbalance"; "HIGH Company" -> "highcompany". É o nome do arquivo da logo em public/marcas. */
export const slugMarca = (nome: string) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function logosDisponiveis(): Map<string, string> {
  const m = new Map<string, string>();
  try {
    const pasta = join(process.cwd(), "public", "marcas");
    if (!existsSync(pasta)) return m;
    for (const arquivo of readdirSync(pasta)) {
      const mt = /^(.+)\.(svg|png|webp|jpe?g)$/i.exec(arquivo);
      if (mt) m.set(mt[1].toLowerCase(), `/marcas/${arquivo}`);
    }
  } catch {
    /* sem logos: as marcas caem no nome em letras grandes */
  }
  return m;
}

/** Marca (nome) -> caminho da logo, só para as marcas que têm arquivo. */
export function logosPorMarca(nomes: string[]): Record<string, string> {
  const logos = logosDisponiveis();
  const r: Record<string, string> = {};
  for (const n of nomes) {
    const l = logos.get(slugMarca(n));
    if (l) r[n] = l;
  }
  return r;
}
