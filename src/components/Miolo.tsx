"use client";

import { usePathname } from "next/navigation";

/** A home ocupa a tela toda; as demais páginas ficam num miolo centralizado. */
export function Miolo({ children }: { children: React.ReactNode }) {
  const home = usePathname() === "/";
  return <main className={home ? "flex-1" : "mx-auto w-full max-w-[1500px] flex-1 px-4 py-8"}>{children}</main>;
}
