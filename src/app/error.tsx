"use client";

import { useEffect } from "react";
import { primaryButton } from "@/components/field";
import { Notice } from "@/components/notice";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <Notice han="歇" title="Algo deu errado">
      <p className="max-w-md text-muted">
        Não conseguimos carregar esta página agora. Tente de novo em instantes.
        {digest && <span className="mt-2 block text-xs">Código do erro: {digest}</span>}
      </p>
      <button type="button" onClick={() => retry()} className={`${primaryButton} max-w-60`}>
        Tentar de novo
      </button>
    </Notice>
  );
}
