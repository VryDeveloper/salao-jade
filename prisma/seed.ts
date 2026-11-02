import "dotenv/config";
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
    durationMin: 60,
    capacity: 6,
    maxGuests: 4,
  },
  {
    slug: "cerimonia-gongfu",
    name: "Cerimônia gongfu",
    description: "Preparo tradicional guiado por um mestre de chá.",
    durationMin: 90,
    capacity: 1,
    maxGuests: 6,
  },
  {
    slug: "cha-e-dim-sum",
    name: "Chá & dim sum",
    description: "Menu degustação de dim sum harmonizado com chás.",
    durationMin: 75,
    capacity: 4,
    maxGuests: 6,
  },
];

async function main() {
  for (const e of experiences) {
    await db.experience.upsert({ where: { slug: e.slug }, update: e, create: e });
  }

  // Terça (2) a domingo (0), 11:00–22:00; segunda sem linha = fechado
  for (const weekday of [0, 2, 3, 4, 5, 6]) {
    const hours = { opensAt: 11 * 60, closesAt: 22 * 60 };
    await db.openingHours.upsert({ where: { weekday }, update: hours, create: { weekday, ...hours } });
  }

  console.log(`Seed ok: ${experiences.length} experiências, 6 dias de funcionamento`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
