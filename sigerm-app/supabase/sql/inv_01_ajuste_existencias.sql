-- =====================================================================
-- SIGERM-INV-01 — AJUSTE Y CONCILIACIÓN DE INVENTARIO (ADMINISTRADOR)
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
--
-- Problemas reales (26-nov-2026, solo lectura):
--   DEC-0010  cantidad 11, disponibles 11, físico 0: el formulario cambia
--             cantidad sin poder tocar disponibles y la restricción
--             articulos_disponibles_check (disponibles <= cantidad) lo impide.
--   A008      cantidad 36, disponibles 10: 26 unidades "comprometidas" sin
--             ningún préstamo (ni actual ni histórico) ni movimiento de Kardex.
--   A009      cantidad 400, disponibles 1: 399 en la misma situación.
--   Además, las altas por INSERT directo dejaban disponibles = 0.
--
-- Solución (dos funciones SECURITY DEFINER, solo Administrador):
--   ajustar_inventario_articulo: fija la existencia física y recalcula
--     disponibles = existencia - unidades en préstamos REALES vigentes
--     (detalle de préstamos en estado PRESTADO), no la resta registrada.
--     Bloquea el artículo (FOR UPDATE, igual que registrar_prestamo y
--     devolver_prestamo), exige que existencia y disponibles sigan siendo
--     los que vio el Administrador (concurrencia), evita duplicados por
--     reintento con una clave de operación y registra el movimiento AJUSTE
--     en Kardex en la misma transacción.
--   alta_articulo_admin: delega en registrar_alta_articulo (disponibles =
--     cantidad y movimiento ALTA), sin modificarla.
--
-- No modifica registros, tablas, RLS, políticas ni funciones existentes, y
-- no concede privilegios sobre tablas. Una única transacción.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

    IF md5(pg_get_functiondef('public.registrar_alta_articulo(character varying, character varying, character varying, integer, character varying, character varying, character varying, text, text, boolean, text, text, text, jsonb)'::regprocedure))
       IS DISTINCT FROM '142fdcee6ead4bfc4c779532eeb3e875' THEN
        RAISE EXCEPTION 'Abortado P-2: registrar_alta_articulo cambió desde la auditoría';
    END IF;
    IF md5(pg_get_functiondef('public.rol_actual_en(text[])'::regprocedure))
       IS DISTINCT FROM '6844a678ff1bbe4962dbba652524ffb7' THEN
        RAISE EXCEPTION 'Abortado P-2: rol_actual_en cambió desde la auditoría';
    END IF;

    IF to_regprocedure('public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid)') IS NOT NULL
       OR EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace
                     AND proname IN ('ajustar_inventario_articulo', 'alta_articulo_admin')) THEN
        RAISE EXCEPTION 'Abortado P-3: las funciones nuevas ya existen';
    END IF;

    -- P-4 Estructura de la que dependen las funciones nuevas
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.movimientos'::regclass
                     AND conname = 'movimientos_tipo_check' AND pg_get_constraintdef(oid) LIKE '%AJUSTE%')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.prestamos'::regclass
                     AND conname = 'prestamos_estado_check' AND pg_get_constraintdef(oid) LIKE '%PRESTADO%') THEN
        RAISE EXCEPTION 'Abortado P-4: tipos de movimiento o estados de préstamo distintos de los auditados';
    END IF;
END
$pre$;

-- ---------------------------------------------------------------------
-- 1. Ajuste y conciliación de inventario
-- ---------------------------------------------------------------------
CREATE FUNCTION public.ajustar_inventario_articulo(
    p_articulo_id          uuid,
    p_existencia_esperada  integer,
    p_disponibles_esperados integer,
    p_existencia_nueva     integer,
    p_motivo_tipo          text,
    p_observaciones        text,
    p_clave_operacion      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $f$
DECLARE
    v_usuario_id     uuid;
    v_usuario_nombre text;
    v_articulo       public.articulos%ROWTYPE;
    v_nuevo          public.articulos%ROWTYPE;
    v_movimiento     public.movimientos%ROWTYPE;
    v_previo         public.movimientos%ROWTYPE;
    v_reales         integer;
    v_registradas    integer;
    v_disp_nuevos    integer;
    v_motivo         text;
    v_obs            text;
BEGIN
    -- Autorización: solo Administrador activo
    IF NOT public.rol_actual_en(ARRAY['Administrador']::text[]) THEN
        RAISE EXCEPTION USING ERRCODE = '42501',
            MESSAGE = 'Solo un Administrador activo puede ajustar el inventario.';
    END IF;

    SELECT u.id, nullif(btrim(concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno)), '')
      INTO v_usuario_id, v_usuario_nombre
      FROM public.usuarios u
     WHERE u.auth_id = auth.uid() AND u.activo IS TRUE;

    -- Validaciones de entrada
    IF p_articulo_id IS NULL OR p_existencia_esperada IS NULL OR p_disponibles_esperados IS NULL
       OR p_existencia_nueva IS NULL OR p_clave_operacion IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'Faltan datos del ajuste de inventario.';
    END IF;

    IF p_existencia_nueva < 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La existencia no puede ser negativa.';
    END IF;

    v_motivo := CASE upper(btrim(coalesce(p_motivo_tipo, '')))
        WHEN 'CONTEO_FISICO'      THEN 'Conciliación por conteo físico'
        WHEN 'CORRECCION_REGISTRO' THEN 'Corrección de registro'
        WHEN 'NUEVA_ADQUISICION'  THEN 'Nueva adquisición'
        WHEN 'CONSUMO_ENTREGA'    THEN 'Consumo o entrega definitiva'
        WHEN 'BAJA_DANO'          THEN 'Baja por daño'
        WHEN 'BAJA_PERDIDA'       THEN 'Baja por pérdida'
        WHEN 'OTRO'               THEN 'Otro motivo justificado'
    END;
    IF v_motivo IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Seleccione un motivo de ajuste válido.';
    END IF;

    v_obs := nullif(btrim(p_observaciones), '');
    IF upper(btrim(p_motivo_tipo)) = 'OTRO' AND (v_obs IS NULL OR char_length(v_obs) < 5) THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Para «Otro motivo» describa la justificación (al menos 5 caracteres).';
    END IF;
    IF char_length(coalesce(v_obs, '')) > 500 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Las observaciones no pueden superar 500 caracteres.';
    END IF;

    -- Bloqueo del artículo (serializa con registrar_prestamo y devolver_prestamo)
    SELECT a.* INTO v_articulo FROM public.articulos a WHERE a.id = p_articulo_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'No se encontró el artículo indicado.';
    END IF;

    -- Reintento de la misma operación: devolver el resultado ya registrado
    SELECT m.* INTO v_previo
      FROM public.movimientos m
     WHERE m.articulo_id = p_articulo_id
       AND m.metadata ->> 'clave_operacion' = p_clave_operacion::text
     LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'ya_aplicado', true,
            'articulo', to_jsonb(v_articulo), 'movimiento', to_jsonb(v_previo));
    END IF;

    -- Concurrencia: solo si existencia y disponibles siguen como se mostraron
    IF v_articulo.cantidad IS DISTINCT FROM p_existencia_esperada
       OR v_articulo.disponibles IS DISTINCT FROM p_disponibles_esperados THEN
        RAISE EXCEPTION USING ERRCODE = '40001',
            MESSAGE = 'El inventario de este artículo cambió mientras se preparaba el ajuste. Recargue para ver los valores actuales.',
            DETAIL  = format('existencia=%s disponibles=%s', v_articulo.cantidad, v_articulo.disponibles);
    END IF;

    -- Unidades en préstamos reales pendientes de devolución
    SELECT coalesce(sum(d.cantidad), 0)::integer INTO v_reales
      FROM public.detalle_prestamo d
      JOIN public.prestamos p ON p.id = d.prestamo_id
     WHERE d.articulo_id = p_articulo_id AND p.estado = 'PRESTADO';

    IF p_existencia_nueva < v_reales THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = format('La existencia no puede ser menor que las %s unidades en préstamos vigentes. Registre primero su devolución.', v_reales);
    END IF;

    v_registradas := v_articulo.cantidad - v_articulo.disponibles;
    v_disp_nuevos := p_existencia_nueva - v_reales;

    IF p_existencia_nueva = v_articulo.cantidad AND v_disp_nuevos = v_articulo.disponibles THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'El inventario ya coincide con los valores indicados; no hay nada que ajustar.';
    END IF;

    UPDATE public.articulos
       SET cantidad = p_existencia_nueva, disponibles = v_disp_nuevos
     WHERE id = p_articulo_id
    RETURNING * INTO v_nuevo;

    INSERT INTO public.movimientos (
        articulo_id, prestamo_id, tipo, cantidad, usuario_id, usuario,
        existencia_anterior, existencia_nueva, motivo, observaciones, metadata
    ) VALUES (
        p_articulo_id, NULL, 'AJUSTE', abs(p_existencia_nueva - v_articulo.cantidad),
        v_usuario_id, left(v_usuario_nombre, 150),
        v_articulo.cantidad, p_existencia_nueva, v_motivo, v_obs,
        jsonb_build_object(
            'origen', 'INVENTARIO',
            'operacion', 'AJUSTE',
            'origen_aplicacion', 'ajuste_inventario',
            'motivo_tipo', upper(btrim(p_motivo_tipo)),
            'clave_operacion', p_clave_operacion::text,
            'codigo_articulo', v_nuevo.codigo,
            'nombre_articulo', v_nuevo.nombre,
            'existencia_anterior', v_articulo.cantidad,
            'existencia_nueva', p_existencia_nueva,
            'disponibles_anteriores', v_articulo.disponibles,
            'disponibles_nuevos', v_disp_nuevos,
            'comprometidas_registradas', v_registradas,
            'prestamos_reales_vigentes', v_reales,
            'diferencia_conciliada', v_registradas - v_reales,
            'activo', v_nuevo.activo
        )
    )
    RETURNING * INTO v_movimiento;

    RETURN jsonb_build_object('success', true, 'ya_aplicado', false,
        'articulo', to_jsonb(v_nuevo), 'movimiento', to_jsonb(v_movimiento));
END
$f$;

-- ---------------------------------------------------------------------
-- 2. Alta de artículo consistente (disponibles = cantidad y Kardex ALTA)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.alta_articulo_admin(
    p_codigo    character varying,
    p_nombre    character varying,
    p_categoria character varying,
    p_cantidad  integer,
    p_estado    character varying DEFAULT 'Bueno',
    p_imagen    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $f$
DECLARE
    v_resultado jsonb;
    v_nombre    text;
BEGIN
    IF NOT public.rol_actual_en(ARRAY['Administrador']::text[]) THEN
        RAISE EXCEPTION USING ERRCODE = '42501',
            MESSAGE = 'Solo un Administrador activo puede dar de alta artículos.';
    END IF;

    v_resultado := public.registrar_alta_articulo(
        p_codigo, p_nombre, p_categoria, p_cantidad,
        NULL, coalesce(p_estado, 'Bueno'), NULL, p_imagen,
        NULL, false, 'Alta de artículo', NULL, NULL,
        jsonb_build_object('origen_aplicacion', 'alta_articulo')
    );

    SELECT nullif(btrim(concat_ws(' ', u.nombre, u.apellido_paterno, u.apellido_materno)), '')
      INTO v_nombre
      FROM public.usuarios u
     WHERE u.auth_id = auth.uid() AND u.activo IS TRUE;

    UPDATE public.movimientos m
       SET usuario = left(v_nombre, 150)
     WHERE m.id = (v_resultado -> 'movimiento' ->> 'id')::uuid
       AND m.usuario IS NULL
       AND v_nombre IS NOT NULL;

    RETURN v_resultado;
END
$f$;

-- ---------------------------------------------------------------------
-- 3. Privilegios: solo authenticated (cada función valida Administrador)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.alta_articulo_admin(character varying, character varying, character varying, integer, character varying, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alta_articulo_admin(character varying, character varying, character varying, integer, character varying, text) TO authenticated;

-- ---------------------------------------------------------------------
-- COMPROBACIONES POSTERIORES
-- ---------------------------------------------------------------------
DO $post$
BEGIN
    IF has_function_privilege('anon', 'public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.alta_articulo_admin(character varying, character varying, character varying, integer, character varying, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Revertido Q-1: anon puede ejecutar las funciones nuevas';
    END IF;
    IF NOT has_function_privilege('authenticated', 'public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.alta_articulo_admin(character varying, character varying, character varying, integer, character varying, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Revertido Q-2: authenticated no puede ejecutar las funciones nuevas';
    END IF;
    IF has_function_privilege('authenticated', 'public.registrar_alta_articulo(character varying, character varying, character varying, integer, character varying, character varying, character varying, text, text, boolean, text, text, text, jsonb)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.registrar_movimiento_inventario(uuid, character varying, jsonb, text, text, text, jsonb)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Revertido Q-3: cambió el EXECUTE de las funciones restringidas';
    END IF;
END
$post$;

COMMIT;
