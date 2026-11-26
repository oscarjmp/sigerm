/**
 * Devuelve la ruta interna indicada en redirectTo solo si es segura:
 * relativa al propio sitio, sin esquema ni host (evita redirecciones
 * abiertas como "//dominio" o "/\dominio") y distinta de /login (evita
 * ciclos). En cualquier otro caso devuelve null.
 */
export function rutaInternaSegura(
  valor: string | null | undefined,
): string | null {
  if (!valor || valor.length > 512) return null;
  if (!valor.startsWith("/")) return null;
  if (valor.startsWith("//") || valor.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(valor)) return null;
  if (valor.includes("://")) return null;

  const ruta = valor.split(/[?#]/)[0];

  if (ruta === "/login" || ruta.startsWith("/login/")) return null;

  return valor;
}
