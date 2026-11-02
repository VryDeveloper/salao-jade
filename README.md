# Salão Jade

Sistema de reservas para uma casa de chá: cadastro, login e agendamento com horários disponíveis em tempo real.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · PostgreSQL · Prisma · Zod · Vitest

## Rodando localmente

Requisitos: Node 22+ e Docker.

```bash
npm install
cp .env.example .env
npm run db:up        # Postgres na porta 5433
npm run db:migrate   # cria as tabelas
npm run db:seed      # experiências e horário de funcionamento
npm run dev
```

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
