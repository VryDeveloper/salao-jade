"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, createBooking, rescheduleBooking } from "@/lib/bookings";

const bookingSchema = z.object({
  experienceId: z.string().min(1),
  startsAt: z.iso.datetime(),
  durationMin: z.coerce.number().int(),
  /** Presente quando é remarcação */
  bookingId: z.string().min(1).optional(),
});

export type BookingState =
  | {
      error?: string;
      booking?: {
        code: string;
        experience: string;
        room: string;
        startsAt: string;
        endsAt: string;
        participants: string[];
      };
    }
  | undefined;

export async function bookSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const user = await getCurrentUser();
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Escolha um horário, a duração e o número de pessoas." };
  const { experienceId, durationMin, bookingId } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);
  // Um campo "companion" por acompanhante; nomes são validados em createBooking/rescheduleBooking
  const companions = formData.getAll("companion").map(String);

  let rescheduledCode: string | undefined;
  try {
    if (bookingId) {
      rescheduledCode = (await rescheduleBooking({ userId: user.id, bookingId, startsAt, durationMin, companions }))
        .code;
    } else {
      const booking = await createBooking({ userId: user.id, experienceId, startsAt, durationMin, companions });
      refresh();
      return {
        booking: {
          code: booking.code,
          experience: booking.experience.name,
          room: booking.room.name,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
          participants: [booking.user.name, ...booking.companions],
        },
      };
    }
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
    refresh(); // a grade na tela estava desatualizada: mostra a ocupação real
    return { error: err.message };
  }
  // fora do try: redirect() funciona lançando uma exceção
  redirect(`/reservas?remarcada=${rescheduledCode}`);
}
