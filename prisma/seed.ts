import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const experiences = [
  {
    slug: "mesa-de-cha",
    name: "Mesa de chá",
    description: "Uma mesa reservada com carta de chás para até 4 pessoas.",
    maxGuests: 4,
  },
  {
    slug: "cerimonia-gongfu",
    name: "Cerimônia gongfu",
    description: "Preparo tradicional guiado por um mestre de chá.",
    maxGuests: 6,
  },
  {
    slug: "cha-e-dim-sum",
    name: "Chá & dim sum",
    description: "Menu degustação de dim sum harmonizado com chás.",
    maxGuests: 6,
  },
];

async function main() {
  for (const e of experiences) {
    await db.experience.upsert({ where: { slug: e.slug }, update: e, create: e });
  }

  // Mesmas 4 salas que a migração cria; o upsert só garante bancos antigos ou editados à mão
  for (const number of [1, 2, 3, 4]) {
    const room = { number, name: `Sala ${number}` };
    await db.room.upsert({ where: { id: `sala-${number}` }, update: room, create: { id: `sala-${number}`, ...room } });
  }

  // Terça (2) a domingo (0), 11:00–22:00; segunda sem linha = fechado
  for (const weekday of [0, 2, 3, 4, 5, 6]) {
    const hours = { opensAt: 11 * 60, closesAt: 22 * 60 };
    await db.openingHours.upsert({ where: { weekday }, update: hours, create: { weekday, ...hours } });
  }

  // Conta demo pública, documentada no README; só existe em bancos semeados
  const demo = { name: "Marina Souza", email: "demo@salaojade.dev" };
  const passwordHash = await hash("chaverde123");
  await db.user.upsert({ where: { email: demo.email }, update: { passwordHash }, create: { ...demo, passwordHash } });

  // Conta do salão (painel /admin), também pública para a demo: em produção, troque a senha ou não rode o seed
  const admin = { name: "Equipe Salão Jade", email: "admin@salaojade.dev", role: "ADMIN" as const };
  const adminHash = await hash("jade-admin-2026");
  await db.user.upsert({
    where: { email: admin.email },
    update: { passwordHash: adminHash, role: "ADMIN" },
    create: { ...admin, passwordHash: adminHash },
  });

  console.log(`Seed ok: ${experiences.length} experiências, 4 salas, 6 dias de funcionamento, contas ${demo.email} e ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
