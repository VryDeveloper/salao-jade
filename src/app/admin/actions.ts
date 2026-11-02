"use server";

import { refresh } from "next/cache";
import {
  AdminError,
  addClosure,
  adminCancelBooking,
  removeClosure,
  setExperienceActive,
  setRoomActive,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

type Result = string | undefined;

/** Toda ação do painel confere o papel no servidor; recusas viram a mensagem do formulário. */
function adminAction(run: (formData: FormData) => Promise<unknown>) {
  return async (_prev: Result, formData: FormData): Promise<Result> => {
    await requireAdmin();
    try {
      await run(formData);
    } catch (err) {
      if (err instanceof AdminError) return err.message;
      throw err;
    }
    refresh();
  };
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export const cancelAsAdmin = adminAction((f) => adminCancelBooking(text(f, "bookingId")));
export const closeDay = adminAction((f) => addClosure(text(f, "date"), text(f, "reason")));
export const reopenDay = adminAction((f) => removeClosure(text(f, "date")));
export const toggleRoom = adminAction((f) => setRoomActive(text(f, "id"), text(f, "active") === "true"));
export const toggleExperience = adminAction((f) => setExperienceActive(text(f, "id"), text(f, "active") === "true"));
