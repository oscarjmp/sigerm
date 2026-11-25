-- =====================================================================
-- SIGERM-SEC-DB-02 — REVERSIÓN DE 02: RESTRICT → ON DELETE CASCADE
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- ADVERTENCIA: restablece el borrado en cascada del historial.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path       = pg_catalog, public;

DO $fk$
DECLARE
    r        record;
    v_n      integer;
    v_nombre text;
    v_def    text;
    v_upd    "char";
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado R-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

    FOR r IN
        SELECT * FROM (VALUES ('encuentro_id',  'public.encuentros'),
                              ('matrimonio_id', 'public.matrimonios')) AS t(columna, destino)
    LOOP
        SELECT con.conname::text, pg_get_constraintdef(con.oid), con.confupdtype
          INTO v_nombre, v_def, v_upd
          FROM pg_constraint con
         WHERE con.conrelid = 'public.participantes'::regclass
           AND con.contype = 'f'
           AND con.confrelid = to_regclass(r.destino)
           AND con.confdeltype = 'r'
           AND con.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
                                    WHERE a.attrelid = 'public.participantes'::regclass
                                      AND a.attname = r.columna)];
        IF v_nombre IS NULL OR v_def !~ 'ON DELETE RESTRICT' THEN
            RAISE EXCEPTION 'Abortado R-2: participantes.% no está en el estado del bloque 02', r.columna;
        END IF;

        EXECUTE format('ALTER TABLE public.participantes DROP CONSTRAINT %I', v_nombre);
        EXECUTE format('ALTER TABLE public.participantes ADD CONSTRAINT %I %s',
                       v_nombre, replace(v_def, 'ON DELETE RESTRICT', 'ON DELETE CASCADE'));

        SELECT count(*) INTO v_n
          FROM pg_constraint con
         WHERE con.conrelid = 'public.participantes'::regclass
           AND con.conname = v_nombre
           AND con.confdeltype = 'c'
           AND con.confupdtype = v_upd
           AND con.convalidated;
        IF v_n <> 1 THEN
            RAISE EXCEPTION 'Revertido: % no quedó como ON DELETE CASCADE', v_nombre;
        END IF;

        v_nombre := NULL;
        v_def    := NULL;
    END LOOP;
END
$fk$;

COMMIT;
