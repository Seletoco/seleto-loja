import { NextResponse } from "next/server";
import { capturaLigada, registrar, respostaDeCaptura } from "@/lib/tray-captura";

export const dynamic = "force-dynamic";

async function tratar(req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  if (!capturaLigada()) return new NextResponse(null, { status: 404 });
  const { caminho } = await params;
  const rota = caminho.join("/").slice(0, 200);
  await registrar(req, `/web_api/${rota}`);
  const pagina = Math.max(1, Math.min(10_000, Math.floor(Number(new URL(req.url).searchParams.get("page"))) || 1));
  const r = respostaDeCaptura(req.method, rota, new URL(req.url).origin, pagina);
  return NextResponse.json(r.json, { status: r.status, headers: { "Cache-Control": "no-store" } });
}

export { tratar as GET, tratar as POST, tratar as PUT, tratar as PATCH, tratar as DELETE };
