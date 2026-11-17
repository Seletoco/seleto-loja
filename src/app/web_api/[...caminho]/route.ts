import { NextResponse } from "next/server";
import { bancoTray } from "@/lib/tray-banco";
import { tratarTray } from "@/lib/tray-api";
import { configDaTray } from "@/lib/tray-auth";
import { capturaLigada, registrar, respostaDeCaptura } from "@/lib/tray-captura";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

/**
 * "API Tray" para o PDVNet. Com as quatro variáveis TRAY_* configuradas, responde de verdade (só pedidos liberados no admin).
 * Sem elas, só existe o modo captura (TRAY_CAPTURA=1), que apenas registra o que o PDVNet pede e devolve listas vazias.
 */
async function tratar(req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  const cfg = configDaTray();
  const captura = capturaLigada();
  if (!cfg && !captura) return new NextResponse(null, { status: 404 });
  const { caminho } = await params;
  const rota = caminho.join("/").slice(0, 200);
  const url = new URL(req.url);
  if (captura) await registrar(req.clone(), `/web_api/${rota}`);

  if (cfg) {
    const corpo = req.method === "GET" ? "" : (await req.text().catch(() => "")).slice(0, 20_000);
    try {
      const r = await tratarTray({ metodo: req.method, caminho: rota, query: url.searchParams, corpo, origem: url.origin }, cfg, bancoTray);
      return NextResponse.json(r.json, { status: r.status, headers: SEM_CACHE });
    } catch (e) {
      const semColuna = (e as { code?: string }).code === "42703";
      console.error("[tray] erro:", e instanceof Error ? e.message.slice(0, 160) : "erro");
      return NextResponse.json({ code: 500, message: semColuna ? "Falta aplicar a migration 015." : "Erro interno." }, { status: 500, headers: SEM_CACHE });
    }
  }

  const pagina = Math.max(1, Math.min(10_000, Math.floor(Number(url.searchParams.get("page"))) || 1));
  const r = respostaDeCaptura(req.method, rota, url.origin, pagina);
  return NextResponse.json(r.json, { status: r.status, headers: SEM_CACHE });
}

export { tratar as GET, tratar as POST, tratar as PUT, tratar as PATCH, tratar as DELETE };
