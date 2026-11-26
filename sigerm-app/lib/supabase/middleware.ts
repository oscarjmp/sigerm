import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { rutaInternaSegura } from "@/lib/auth/redireccion";

const RUTAS_PROTEGIDAS = [
  "/administracion",
  "/catalogo",
  "/configuracion",
  "/dashboard",
  "/encuentros",
  "/equipos-servicio",
  "/inventario",
  "/kardex",
  "/matrimonios",
  "/participantes",
  "/prestamos",
  "/reportes",
];

function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
  data,
} = await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;
  const usuarioAutenticado = Boolean(data?.claims?.sub);

  // Usuario sin sesión intentando acceder a una ruta privada.
  if (!usuarioAutenticado && esRutaProtegida(pathname)) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);

    const redirectResponse = NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  // Usuario con JWT válido que llega al inicio de sesión.
  if (usuarioAutenticado && pathname === "/login") {
    /*
     * getClaims() verifica el JWT localmente (claves asimétricas) y no
     * detecta una sesión revocada: por ejemplo, un cierre de sesión
     * global desde otro dispositivo. Las páginas protegidas validan con
     * getUser() y, en ese caso, envían a /login; si aquí se devolviera
     * al dashboard sin más, se produciría ERR_TOO_MANY_REDIRECTS.
     * En /login se confirma la sesión con el servidor de Auth y, si ya
     * no existe, se borran solo las cookies locales de este navegador.
     */
    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
      await supabase.auth.signOut({ scope: "local" });

      return response;
    }

    const destinoUrl = request.nextUrl.clone();
    const destinoParseado = new URL(
      rutaInternaSegura(
        request.nextUrl.searchParams.get("redirectTo"),
      ) ?? "/dashboard",
      request.nextUrl.origin,
    );

    destinoUrl.pathname = destinoParseado.pathname;
    destinoUrl.search = destinoParseado.search;

    const redirectResponse = NextResponse.redirect(destinoUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}