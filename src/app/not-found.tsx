import Link from "next/link";
import { primaryButton } from "@/components/field";
import { Notice } from "@/components/notice";

export default function NotFound() {
  return (
    <Notice han="空" title="Página não encontrada">
      <p className="max-w-md text-muted">Esse endereço não existe ou mudou de lugar.</p>
      <Link href="/" className={`${primaryButton} max-w-60`}>
        Voltar ao início
      </Link>
    </Notice>
  );
}
