import type { ResumenKardex } from "@/components/kardex/types";

type TarjetaResumenProps = {
  titulo: string;
  valor: number;
  descripcion: string;
};

function TarjetaResumen({
  titulo,
  valor,
  descripcion,
}: TarjetaResumenProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-800">
        {new Intl.NumberFormat("es-MX").format(valor)}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {descripcion}
      </p>
    </article>
  );
}

type TarjetasResumenProps = {
  resumen: ResumenKardex;
};

export default function TarjetasResumen({
  resumen,
}: TarjetasResumenProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <TarjetaResumen
        titulo="Movimientos"
        valor={resumen.totalMovimientos}
        descripcion="Registros filtrados"
      />

      <TarjetaResumen
        titulo="Entradas"
        valor={resumen.totalEntradas}
        descripcion="Unidades incorporadas"
      />

      <TarjetaResumen
        titulo="Salidas"
        valor={resumen.totalSalidas}
        descripcion="Unidades retiradas"
      />

      <TarjetaResumen
        titulo="Préstamos"
        valor={resumen.prestamosRegistrados}
        descripcion="Movimientos de préstamo"
      />

      <TarjetaResumen
        titulo="Devoluciones"
        valor={resumen.devolucionesRegistradas}
        descripcion={`${resumen.articulosConMovimiento} artículos con historial`}
      />
    </section>
  );
}