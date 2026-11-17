import { NextResponse } from "next/server";
import { configDaTray, iguais } from "@/lib/tray-auth";
import { callbackPermitido, capturaLigada, registrar } from "@/lib/tray-captura";

export const dynamic = "force-dynamic";

/**
 * Passo "Solicitar autorização de integração" do PDVNet: devolve o navegador ao callback do PDVNet (ou localhost) com o código, como a Tray faz.
 * Com as variáveis TRAY_* configuradas o código é o de verdade (e a chave do aplicativo precisa bater); sem elas, só o modo captura.
 */
export async function GET(req: Request) {
  const cfg = configDaTray();
  const captura = capturaLigada();
  if (!cfg && !captura) return new NextResponse(null, { status: 404 });
  if (captura) await registrar(req.clone(), "/auth.php");
  const url = new URL(req.url);
  if (cfg && !iguais(url.searchParams.get("consumer_key"), cfg.key)) return new NextResponse("Aplicativo não autorizado.", { status: 403, headers: { "Cache-Control": "no-store" } });

  const destino = callbackPermitido(url.searchParams.get("callback")); // nunca redireciona para outro site
  if (destino) {
    destino.searchParams.set("code", cfg ? cfg.codigo : "captura");
    destino.searchParams.set("api_address", `${url.origin}/web_api`);
    destino.searchParams.set("store", "1");
    destino.searchParams.set("store_host", url.host);
    destino.searchParams.set("adm_user", "seleto");
    return NextResponse.redirect(destino, { status: 302, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse("Pedido de autorização registrado.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
