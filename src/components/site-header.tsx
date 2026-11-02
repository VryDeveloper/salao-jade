import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { Brand } from "./brand";

type Page = "agenda" | "reservas" | "admin";

// A ordem do menu define a direção: ir para a direita no menu desliza para a esquerda, e vice-versa
const NAV: { page: Page; href: string; label: string; adminOnly?: boolean }[] = [
  { page: "agenda", href: "/agenda", label: "Agendar" },
  { page: "reservas", href: "/reservas", label: "Minhas reservas" },
  { page: "admin", href: "/admin", label: "Painel do salão", adminOnly: true },
];
const direction = (from: Page, to: Page) =>
  NAV.findIndex((n) => n.page === to) > NAV.findIndex((n) => n.page === from) ? "nav-forward" : "nav-back";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

/** Lê a sessão: renderize dentro de <Suspense fallback={<SiteHeaderShell current=… />}>. */
export async function SiteHeader({ current }: { current: Page }) {
  const user = await getCurrentUser();
  return (
    <SiteHeaderShell current={current} isAdmin={user.role === "ADMIN"}>
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

export function SiteHeaderShell({
  current,
  // Enquanto a sessão carrega, só o próprio painel sabe que o usuário é admin
  isAdmin = current === "admin",
  children,
}: {
  current: Page;
  isAdmin?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 sm:px-8">
        <Brand />
        {/* No celular: marca e usuário na primeira linha, menu inteiro embaixo */}
        <nav
          aria-label="Principal"
          className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 whitespace-nowrap sm:order-none sm:mx-0 sm:w-auto sm:px-0"
        >
          {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) =>
            item.page === current ? (
              <Link
                key={item.page}
                href={item.href}
                aria-current="page"
                className="border-b-2 border-cinnabar px-3.5 py-3 text-sm font-semibold text-cream"
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.page}
                href={item.href}
                transitionTypes={[direction(current, item.page)]}
                className="border-b-2 border-transparent px-3.5 py-3 text-sm text-muted transition-[color,border-color] duration-200 hover:border-line-strong hover:text-cream"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="flex min-h-11 min-w-32 justify-end">{children}</div>
      </div>
    </header>
  );
}
