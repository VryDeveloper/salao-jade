"use client";

import { useActionState, useState } from "react";
import { cancelBookingAction } from "./actions";

const outline =
  "h-11 cursor-pointer rounded-md px-4 text-sm transition-[border-color,background-color,filter,scale] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-wait";

/** Cancelar pede confirmação antes: é irreversível. */
export function CancelButton({ bookingId, label }: { bookingId: string; label: string }) {
  const [error, action, pending] = useActionState(cancelBookingAction, undefined);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Cancelar ${label}`}
        className={`${outline} border border-transparent text-danger hover:border-[#3a2f27]`}
      >
        Cancelar
      </button>
    );
  }

  return (
    <form action={action} className="flex animate-rise flex-wrap items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <span className="text-sm text-label">Cancelar mesmo?</span>
      <button type="submit" disabled={pending} className={`${outline} bg-cinnabar font-semibold text-paper`}>
        {pending ? "Cancelando…" : "Sim, cancelar"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={`${outline} border border-line-strong text-cream`}
      >
        Manter
      </button>
      {error && (
        <p role="alert" className="w-full text-[13px] text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
