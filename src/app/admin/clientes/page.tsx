import type { Metadata } from "next";
import { connection } from "next/server";
import { getCustomers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatLongDate, formatRange } from "@/lib/format";
import { AdminShell, panel } from "../admin-shell";

export const metadata: Metadata = { title: "Clientes — Painel do salão" };

export default function CustomersPage() {
  return (
    <AdminShell current="clientes" title="Clientes">
      <Customers />
    </AdminShell>
  );
}

async function Customers() {
  await Promise.all([requireAdmin(), connection()]);
  const customers = await getCustomers();
  if (customers.length === 0) return <p className={`${panel} text-muted`}>Nenhum cliente cadastrado ainda.</p>;

  return (
    <div className={`${panel} overflow-x-auto p-0`}>
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <caption className="sr-only">Clientes cadastrados, com contato e reservas</caption>
        <thead className="text-[11px] tracking-[0.12em] text-muted uppercase">
          <tr className="border-b border-line">
            <th scope="col" className="px-6 py-4 font-normal">
              Cliente
            </th>
            <th scope="col" className="px-4 py-4 font-normal">
              Contato
            </th>
            <th scope="col" className="px-4 py-4 font-normal">
              Reservas
            </th>
            <th scope="col" className="px-6 py-4 font-normal">
              Próxima visita
            </th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-line last:border-0">
              <th scope="row" className="px-6 py-4 align-top font-semibold">
                {c.name}
                <span className="block text-xs font-normal text-muted">
                  Cliente desde {c.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
              </th>
              <td className="px-4 py-4 align-top">
                <a href={`mailto:${c.email}`} className="-my-1 block py-2 text-gold hover:text-[#e2c27f]">
                  {c.email}
                </a>
                <span className="text-muted">{c.phone ?? "Sem telefone"}</span>
              </td>
              <td className="px-4 py-4 align-top tabular-nums">{c.total}</td>
              <td className="px-6 py-4 align-top">
                {c.next ? (
                  <>
                    {c.next.experience.name}
                    <span className="block text-muted">
                      {formatLongDate(c.next.startsAt)}, {formatRange(c.next.startsAt, c.next.endsAt)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">Nenhuma marcada</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
