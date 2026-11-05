import { redirect } from "next/navigation";

/**
 * El registro público está deshabilitado: las cuentas las crea
 * el Administrador desde Administración de usuarios.
 *
 * Se conserva esta ruta solo para redirigir enlaces antiguos
 * hacia el inicio de sesión.
 */
export default function RegistroPage() {
  redirect("/login");
}
