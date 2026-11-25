-- =====================================================================
-- SIGERM-SEC-DB-05 — REVERSIÓN DE LA UNICIDAD DE INSCRIPCIONES
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- ADVERTENCIA: vuelve a permitir inscripciones duplicadas simultáneas.
-- No borra ni modifica registros.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
DECLARE
    v_def text;
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado R-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;
    SELECT pg_get_constraintdef(c.oid) INTO v_def
      FROM pg_constraint c
     WHERE c.conrelid = 'public.participantes'::regclass
       AND c.conname = 'participantes_encuentro_matrimonio_key'
       AND c.contype = 'u';
    IF v_def IS DISTINCT FROM 'UNIQUE (encuentro_id, matrimonio_id)' THEN
        RAISE EXCEPTION 'Abortado R-2: la restricción no existe o no es la creada por sec_db05 (%)', v_def;
    END IF;
END
$pre$;

ALTER TABLE public.participantes DROP CONSTRAINT participantes_encuentro_matrimonio_key;

DO $post$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.participantes'::regclass
                  AND conname = 'participantes_encuentro_matrimonio_key') THEN
        RAISE EXCEPTION 'Revertido: la restricción sigue existiendo';
    END IF;
END
$post$;

COMMIT;
