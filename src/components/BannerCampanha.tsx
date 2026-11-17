import Image from "next/image";
import Link from "next/link";

/**
 * Banner de campanha em largura total (Black Friday). Arte 1291×258 sobre fundo preto: em telas largas sobram faixas pretas
 * dos lados (como na arte original) e em telas estreitas a imagem encolhe inteira, sem cortar texto nem produtos.
 * Quem decide se aparece é o servidor (`blackFridayAtiva`).
 */
export function BannerCampanha({ href, alt }: { href: string; alt: string }) {
  return (
    <section className="bg-[#050505]" aria-label="Campanha">
      <Link href={href} className="mx-auto block max-w-[1291px] transition hover:opacity-95">
        <Image src="/banners/black-friday.png" alt={alt} width={1291} height={258} sizes="(min-width: 1291px) 1291px, 100vw" priority className="h-auto w-full" />
      </Link>
    </section>
  );
}
