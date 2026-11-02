import type { ComponentProps } from "react";

type FieldProps = { label: string; name: string; error?: string[] } & ComponentProps<"input">;

export function Field({ label, name, error, ...props }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-[13px] font-semibold text-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-12 rounded-md border border-line-strong bg-field px-3.5 text-base text-cream placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold aria-invalid:border-danger"
        {...props}
      />
      {error && (
        <p id={errorId} className="text-[13px] text-danger">
          {error[0]}
        </p>
      )}
    </div>
  );
}

export const primaryButton =
  "flex h-[52px] w-full cursor-pointer items-center justify-center rounded-md bg-cinnabar text-[15px] font-bold tracking-wider text-paper hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-wait disabled:opacity-70";

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}
