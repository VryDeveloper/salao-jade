"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, cancelBooking } from "@/lib/bookings";

export async function cancelBookingAction(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const user = await getCurrentUser();
  try {
    await cancelBooking({ userId: user.id, bookingId: String(formData.get("bookingId") ?? "") });
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
    return err.message;
  }
  refresh();
}
