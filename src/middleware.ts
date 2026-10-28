import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Filtro rápido: sin cookie de sesión, a la pantalla de entrar.
// La comprobación real (sesión válida, rol) se hace en el servidor.
export function middleware(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/cursos/:path*", "/cuenta/:path*", "/panel/:path*"],
};
