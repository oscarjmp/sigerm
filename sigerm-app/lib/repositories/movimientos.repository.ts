import type {
  PostgrestError,
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  FiltrosMovimientos,
  Movimiento,
  MovimientoConRelaciones,
  ResultadoMovimientos,
} from "@/lib/types/movimientos";

/**
 * Columnas básicas de la tabla public.movimientos.
 */
const COLUMNAS_MOVIMIENTO = `
  id,
  articulo_id,
  prestamo_id,
  tipo,
  cantidad,
  fecha,
  usuario,
  observaciones,
  usuario_id,
  existencia_anterior,
  existencia_nueva,
  motivo,
  referencia,
  metadata,
  diferencia
`;

/**
 * Columnas del movimiento junto con sus relaciones.
 *
 * Los nombres posteriores a los dos puntos son alias utilizados
 * por la aplicación:
 *
 * articulo              -> public.articulos
 * prestamo              -> public.prestamos
 * usuario_responsable   -> public.usuarios
 */
const COLUMNAS_MOVIMIENTO_CON_RELACIONES = `
  ${COLUMNAS_MOVIMIENTO},

  articulo:articulos!movimientos_articulo_fk (
    id,
    codigo,
    nombre,
    categoria,
    cantidad,
    disponibles,
    unidad,
    estado,
    ubicacion,
    imagen,
    activo
  ),

  prestamo:prestamos!movimientos_prestamo_fk (
    id,
    folio,
    responsable,
    solicitante,
    fecha_prestamo,
    fecha_devolucion,
    estado
  ),

  usuario_responsable:usuarios!movimientos_usuario_fk (
    id,
    nombre,
    apellido_paterno,
    apellido_materno,
    email
  )
`;

/**
 * Límites utilizados en las consultas paginadas.
 */
const PAGINA_INICIAL = 1;
const LIMITE_PREDETERMINADO = 25;
const LIMITE_MAXIMO = 100;

/**
 * Error controlado del repositorio de movimientos.
 *
 * Permite conservar información de Supabase sin exponer
 * directamente PostgrestError al resto de la aplicación.
 */
export class MovimientosRepositoryError extends Error {
  readonly codigo: string | null;
  readonly detalles: string | null;
  readonly sugerencia: string | null;
  readonly errorOriginal: unknown;

  constructor(
    mensaje: string,
    opciones?: {
      codigo?: string | null;
      detalles?: string | null;
      sugerencia?: string | null;
      causa?: unknown;
    },
  ) {
    super(mensaje);

    this.name = "MovimientosRepositoryError";
    this.codigo = opciones?.codigo ?? null;
    this.detalles = opciones?.detalles ?? null;
    this.sugerencia = opciones?.sugerencia ?? null;
    this.errorOriginal = opciones?.causa;

    Object.setPrototypeOf(
      this,
      MovimientosRepositoryError.prototype,
    );
  }
}

/**
 * Convierte un error de Supabase en un error uniforme
 * del repositorio.
 */
function crearErrorRepositorio(
  contexto: string,
  error: PostgrestError | null,
): MovimientosRepositoryError {
  if (!error) {
    return new MovimientosRepositoryError(contexto);
  }

  return new MovimientosRepositoryError(
    `${contexto}: ${error.message}`,
    {
      codigo: error.code,
      detalles: error.details,
      sugerencia: error.hint,
      causa: error,
    },
  );
}

/**
 * Verifica que una cadena tenga contenido real.
 */
function tieneTexto(valor: string | null | undefined): boolean {
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * Normaliza y limita los parámetros de paginación.
 */
function obtenerPaginacion(
  filtros: FiltrosMovimientos,
): {
  pagina: number;
  limite: number;
  desde: number;
  hasta: number;
} {
  const paginaSolicitada =
    filtros.pagina ?? PAGINA_INICIAL;

  const limiteSolicitado =
    filtros.limite ?? LIMITE_PREDETERMINADO;

  const pagina =
    Number.isInteger(paginaSolicitada) &&
    paginaSolicitada > 0
      ? paginaSolicitada
      : PAGINA_INICIAL;

  const limiteValido =
    Number.isInteger(limiteSolicitado) &&
    limiteSolicitado > 0
      ? limiteSolicitado
      : LIMITE_PREDETERMINADO;

  const limite = Math.min(
    limiteValido,
    LIMITE_MAXIMO,
  );

  const desde = (pagina - 1) * limite;
  const hasta = desde + limite - 1;

  return {
    pagina,
    limite,
    desde,
    hasta,
  };
}

/**
 * Repositorio de CONSULTA del Kardex.
 *
 * No registra movimientos: la escritura en public.movimientos solo se
 * realiza mediante las funciones RPC SECURITY DEFINER del servidor
 * (registrar_prestamo, devolver_prestamo), que mantienen existencias y
 * Kardex en una misma transacción.
 *
 * No crea internamente un cliente Supabase. Recibe el cliente
 * correspondiente al contexto:
 *
 * Navegador:
 *   importar supabase desde lib/supabase/client
 *
 * Servidor:
 *   const supabase = await createClient()
 */
export class MovimientosRepository {
  constructor(
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Obtiene un movimiento por su identificador.
   */
  async obtenerPorId(
    movimientoId: string,
  ): Promise<MovimientoConRelaciones | null> {
    if (!tieneTexto(movimientoId)) {
      throw new MovimientosRepositoryError(
        "El identificador del movimiento es obligatorio.",
      );
    }

    const { data, error } = await this.supabase
      .from("movimientos")
      .select(COLUMNAS_MOVIMIENTO_CON_RELACIONES)
      .eq("id", movimientoId)
      .maybeSingle();

    if (error) {
      throw crearErrorRepositorio(
        "No fue posible consultar el movimiento",
        error,
      );
    }

    return data
      ? (data as unknown as MovimientoConRelaciones)
      : null;
  }

  /**
   * Consulta el Kardex con filtros y paginación.
   */
  async listar(
    filtros: FiltrosMovimientos = {},
  ): Promise<ResultadoMovimientos> {
    const {
      pagina,
      limite,
      desde,
      hasta,
    } = obtenerPaginacion(filtros);

    let consulta = this.supabase
      .from("movimientos")
      .select(
        COLUMNAS_MOVIMIENTO_CON_RELACIONES,
        {
          count: "exact",
        },
      );

    if (tieneTexto(filtros.articuloId)) {
      consulta = consulta.eq(
        "articulo_id",
        filtros.articuloId!,
      );
    }

    if (tieneTexto(filtros.prestamoId)) {
      consulta = consulta.eq(
        "prestamo_id",
        filtros.prestamoId!,
      );
    }

    if (tieneTexto(filtros.usuarioId)) {
      consulta = consulta.eq(
        "usuario_id",
        filtros.usuarioId!,
      );
    }

    if (filtros.tipo) {
      consulta = consulta.eq(
        "tipo",
        filtros.tipo,
      );
    }

    if (
      filtros.tipos &&
      filtros.tipos.length > 0
    ) {
      consulta = consulta.in(
        "tipo",
        filtros.tipos,
      );
    }

    if (tieneTexto(filtros.fechaDesde)) {
      consulta = consulta.gte(
        "fecha",
        filtros.fechaDesde!,
      );
    }

    if (tieneTexto(filtros.fechaHasta)) {
      consulta = consulta.lte(
        "fecha",
        filtros.fechaHasta!,
      );
    }

    if (tieneTexto(filtros.referencia)) {
      consulta = consulta.ilike(
        "referencia",
        `%${filtros.referencia!.trim()}%`,
      );
    }

    if (tieneTexto(filtros.motivo)) {
      consulta = consulta.ilike(
        "motivo",
        `%${filtros.motivo!.trim()}%`,
      );
    }

    const ordenAscendente =
      filtros.orden === "asc";

    const { data, error, count } =
      await consulta
        .order("fecha", {
          ascending: ordenAscendente,
        })
        .order("id", {
          ascending: ordenAscendente,
        })
        .range(desde, hasta);

    if (error) {
      throw crearErrorRepositorio(
        "No fue posible consultar el Kardex",
        error,
      );
    }

    const total = count ?? 0;
    const totalPaginas =
      total === 0
        ? 0
        : Math.ceil(total / limite);

    return {
      movimientos:
        (data ??
          []) as unknown as MovimientoConRelaciones[],
      total,
      pagina,
      limite,
      totalPaginas,
    };
  }

  /**
   * Devuelve todos los movimientos de un artículo,
   * respetando filtros y paginación.
   */
  async listarPorArticulo(
    articuloId: string,
    filtros: Omit<
      FiltrosMovimientos,
      "articuloId"
    > = {},
  ): Promise<ResultadoMovimientos> {
    if (!tieneTexto(articuloId)) {
      throw new MovimientosRepositoryError(
        "El identificador del artículo es obligatorio.",
      );
    }

    return this.listar({
      ...filtros,
      articuloId,
    });
  }

  /**
   * Devuelve los movimientos asociados a un préstamo.
   */
  async listarPorPrestamo(
    prestamoId: string,
    filtros: Omit<
      FiltrosMovimientos,
      "prestamoId"
    > = {},
  ): Promise<ResultadoMovimientos> {
    if (!tieneTexto(prestamoId)) {
      throw new MovimientosRepositoryError(
        "El identificador del préstamo es obligatorio.",
      );
    }

    return this.listar({
      ...filtros,
      prestamoId,
    });
  }

  /**
   * Obtiene el movimiento más reciente de un artículo.
   */
  async obtenerUltimoPorArticulo(
    articuloId: string,
  ): Promise<Movimiento | null> {
    if (!tieneTexto(articuloId)) {
      throw new MovimientosRepositoryError(
        "El identificador del artículo es obligatorio.",
      );
    }

    const { data, error } = await this.supabase
      .from("movimientos")
      .select(COLUMNAS_MOVIMIENTO)
      .eq("articulo_id", articuloId)
      .order("fecha", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw crearErrorRepositorio(
        "No fue posible consultar el último movimiento del artículo",
        error,
      );
    }

    return data ? (data as Movimiento) : null;
  }

  /**
   * Cuenta movimientos sin descargar sus filas.
   */
  async contar(
    filtros: Omit<
      FiltrosMovimientos,
      "pagina" | "limite" | "orden"
    > = {},
  ): Promise<number> {
    let consulta = this.supabase
      .from("movimientos")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (tieneTexto(filtros.articuloId)) {
      consulta = consulta.eq(
        "articulo_id",
        filtros.articuloId!,
      );
    }

    if (tieneTexto(filtros.prestamoId)) {
      consulta = consulta.eq(
        "prestamo_id",
        filtros.prestamoId!,
      );
    }

    if (tieneTexto(filtros.usuarioId)) {
      consulta = consulta.eq(
        "usuario_id",
        filtros.usuarioId!,
      );
    }

    if (filtros.tipo) {
      consulta = consulta.eq(
        "tipo",
        filtros.tipo,
      );
    }

    if (
      filtros.tipos &&
      filtros.tipos.length > 0
    ) {
      consulta = consulta.in(
        "tipo",
        filtros.tipos,
      );
    }

    if (tieneTexto(filtros.fechaDesde)) {
      consulta = consulta.gte(
        "fecha",
        filtros.fechaDesde!,
      );
    }

    if (tieneTexto(filtros.fechaHasta)) {
      consulta = consulta.lte(
        "fecha",
        filtros.fechaHasta!,
      );
    }

    if (tieneTexto(filtros.referencia)) {
      consulta = consulta.ilike(
        "referencia",
        `%${filtros.referencia!.trim()}%`,
      );
    }

    if (tieneTexto(filtros.motivo)) {
      consulta = consulta.ilike(
        "motivo",
        `%${filtros.motivo!.trim()}%`,
      );
    }

    const { error, count } = await consulta;

    if (error) {
      throw crearErrorRepositorio(
        "No fue posible contar los movimientos",
        error,
      );
    }

    return count ?? 0;
  }
}

/**
 * Crea una instancia del repositorio con el cliente Supabase
 * recibido.
 *
 * Ejemplo:
 *
 * const repositorio = crearMovimientosRepository(supabase);
 */
export function crearMovimientosRepository(
  supabase: SupabaseClient,
): MovimientosRepository {
  return new MovimientosRepository(supabase);
}