import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Checagem otimista (só a presença do cookie). A validação de verdade é getCurrentUser() perto dos dados.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
}

export const config = {
  matcher: ["/agenda/:path*", "/reservas/:path*"],
};
