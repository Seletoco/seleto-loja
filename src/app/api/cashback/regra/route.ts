import { NextResponse } from "next/server";
import { regrasCashback } from "@/lib/regras-servidor";

/** Regras públicas do cashback (percentuais e prazos). Nada de cliente aqui. */
export async function GET() {
  return NextResponse.json(await regrasCashback(), { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
