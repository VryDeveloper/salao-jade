import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { Brand } from "./brand";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

/** Lê a sessão: renderize dentro de <Suspense fallback={<SiteHeaderShell />}>. */
export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <SiteHeaderShell>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full border border-line-strong bg-[#2a221c] text-[13px] font-bold text-gold"
        >
          {initials(user.name)}
        </span>
        <span className="text-sm">{user.name.split(" ")[0]}</span>
        <form action={logout}>
          <button type="submit" className="cursor-pointer px-1 py-3 text-[13px] text-gold hover:text-[#e2c27f]">
            Sair
          </button>
        </form>
      </div>
    </SiteHeaderShell>
  );
}

export function SiteHeaderShell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Brand />
        <nav aria-label="Principal" className="flex flex-wrap gap-1">
          <Link
            href="/agenda"
            aria-current="page"
            className="border-b-2 border-cinnabar px-3.5 py-3 text-sm font-semibold text-cream"
          >
            Agendar
          </Link>
        </nav>
        <div className="flex min-h-11 min-w-32 justify-end">{children}</div>
      </div>
    </header>
  );
}
