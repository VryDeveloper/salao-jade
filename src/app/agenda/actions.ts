"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/bookings";

const bookingSchema = z.object({
  experienceId: z.string().min(1),
  startsAt: z.iso.datetime(),
  guests: z.coerce.number().int().min(1),
});

export type BookingState =
  | { error?: string; booking?: { code: string; experience: string; startsAt: string; guests: number } }
  | undefined;

export async function bookSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const user = await getCurrentUser();
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escolha um horário e o número de pessoas." };

  try {
    const booking = await createBooking({
      userId: user.id,
      experienceId: parsed.data.experienceId,
      startsAt: new Date(parsed.data.startsAt),
      guests: parsed.data.guests,
    });
    refresh();
    return {
      booking: {
        code: booking.code,
        experience: booking.experience.name,
        startsAt: booking.startsAt.toISOString(),
        guests: booking.guests,
      },
    };
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
    refresh(); // a grade na tela estava desatualizada: mostra a ocupação real
    return { error: err.message };
  }
}
