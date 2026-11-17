import { NextResponse } from "next/server";
import { callbackPermitido, capturaLigada, registrar } from "@/lib/tray-captura";

export const dynamic = "force-dynamic";

/** Passo "Solicitar autorização de integração": devolve o código de captura para o callback do PDVNet (ou localhost), como a Tray faz. */
export async function GET(req: Request) {
  if (!capturaLigada()) return new NextResponse(null, { status: 404 });
  await registrar(req, "/auth.php");
  const url = new URL(req.url);
  const origem = url.origin;
  const destino = callbackPermitido(url.searchParams.get("callback")); // nunca redireciona para outro site
  if (destino) {
    destino.searchParams.set("code", "captura");
    destino.searchParams.set("api_address", `${origem}/web_api`);
    destino.searchParams.set("store", "1");
    destino.searchParams.set("store_host", url.host);
    destino.searchParams.set("adm_user", "captura");
    return NextResponse.redirect(destino, 302);
  }
  return new NextResponse("Modo captura da integração: pedido registrado.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
