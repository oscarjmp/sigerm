-- =====================================================================
-- SIGERM-INV-01 — REVERSIÓN
-- Elimina únicamente las dos funciones creadas por inv_01. No borra ni
-- modifica registros: los ajustes y movimientos de Kardex ya registrados
-- se conservan. Tras revertir, la aplicación no podrá ajustar inventario
-- ni dar de alta artículos hasta volver a la versión anterior del código.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado R-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;
    IF to_regprocedure('public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid)') IS NULL
       OR to_regprocedure('public.alta_articulo_admin(character varying, character varying, character varying, integer, character varying, text)') IS NULL THEN
        RAISE EXCEPTION 'Abortado R-2: alguna de las funciones de inv_01 no existe';
    END IF;
END
$pre$;

DROP FUNCTION public.ajustar_inventario_articulo(uuid, integer, integer, integer, text, text, uuid);
DROP FUNCTION public.alta_articulo_admin(character varying, character varying, character varying, integer, character varying, text);

COMMIT;
