import { toast } from "sonner";

export const notificar = {
  exito: (mensaje: string) =>
    toast.success(mensaje),

  error: (mensaje: string) =>
    toast.error(mensaje),

  advertencia: (mensaje: string) =>
    toast.warning(mensaje),

  info: (mensaje: string) =>
    toast.info(mensaje),
};