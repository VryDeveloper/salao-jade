# Salão Jade

Sistema de reservas para uma casa de chá: cadastro, login e agendamento com horários disponíveis em tempo real.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · PostgreSQL · Prisma · Zod · Vitest

## Rodando localmente

Requisitos: Node 22+ e Docker.

```bash
npm install
cp .env.example .env
npm run db:up        # Postgres na porta 5434
npm run db:migrate   # cria as tabelas
npm run db:seed      # experiências e horário de funcionamento
npm run dev
```

Conta demo criada pelo seed: `demo@salaojade.dev` / `chaverde123`.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | build de produção |

## Como a disponibilidade funciona

Os horários não ficam salvos no banco: são calculados na hora em [`src/lib/availability.ts`](src/lib/availability.ts).
A cada 30 minutos dentro do expediente, um horário fica livre se ainda não passou e se as reservas que se
sobrepõem a ele não atingiram a `capacity` da experiência (mesas ou salas simultâneas).

## Sem reserva dupla

Dois clientes podem clicar no mesmo horário ao mesmo tempo. [`createBooking`](src/lib/bookings.ts) roda numa
transação que trava a linha da experiência (`SELECT … FOR UPDATE`): as reservas dela são checadas e gravadas uma
de cada vez, e o horário é validado pela mesma função que monta a grade. Quem chega depois recebe
"esse horário acabou de ficar indisponível" e a grade é atualizada.

[`bookings.db.test.ts`](src/lib/bookings.db.test.ts) prova isso contra o Postgres real: 10 pedidos simultâneos
geram exatamente 1 reserva quando a capacidade é 1, e exatamente 6 quando é 6. Esse teste precisa do banco no ar
(`npm run db:up` e `npm run db:seed`).
