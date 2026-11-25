-- =====================================================================
-- SIGERM-SEC-DB-02 — 02 PARTICIPANTES: ON DELETE CASCADE → RESTRICT
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Evita que borrar un encuentro o un matrimonio elimine en cascada su
-- historial de participación. No borra ni modifica registros: recrea
-- las dos claves foráneas con el mismo nombre, columnas, destino y
-- ON UPDATE; solo cambia ON DELETE. Una única transacción.
-- Efecto: borrar un encuentro o matrimonio con participantes FALLARÁ
-- (comportamiento buscado). Independiente del bloque 01.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path       = pg_catalog, public;

DO $fk$
DECLARE
    r        record;
    o        record;
    v_n      integer;
    v_nombre text;
    v_def    text;
    v_upd    "char";
    v_filas  bigint;
BEGIN
    -- P-1 Ejecutor y tabla
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;
    IF to_regclass('public.participantes') IS NULL THEN
        RAISE EXCEPTION 'Abortado P-1: no existe public.participantes';
    END IF;

    SELECT count(*) INTO v_filas FROM public.participantes;

    -- Informativo: otras claves foráneas con CASCADE hacia encuentros,
    -- matrimonios o participantes (no se modifican en este bloque)
    FOR o IN
        SELECT con.conname::text AS conname, con.conrelid::regclass::text AS origen,
               con.confrelid::regclass::text AS destino
          FROM pg_constraint con
         WHERE con.contype = 'f' AND con.confdeltype = 'c'
           AND con.confrelid IN ('public.encuentros'::regclass, 'public.matrimonios'::regclass,
                                 'public.participantes'::regclass)
           AND con.conrelid <> 'public.participantes'::regclass
    LOOP
        RAISE NOTICE 'Otra FK con CASCADE (sin cambios): % en % → %', o.conname, o.origen, o.destino;
    END LOOP;

    FOR r IN
        SELECT * FROM (VALUES ('encuentro_id',  'public.encuentros'),
                              ('matrimonio_id', 'public.matrimonios')) AS t(columna, destino)
    LOOP
        -- P-2 Exactamente una FK de una sola columna hacia el destino
        SELECT count(*) INTO v_n
          FROM pg_constraint con
         WHERE con.conrelid = 'public.participantes'::regclass
           AND con.contype = 'f'
           AND con.confrelid = to_regclass(r.destino)
           AND con.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
                                    WHERE a.attrelid = 'public.participantes'::regclass
                                      AND a.attname = r.columna)];
        IF v_n <> 1 THEN
            RAISE EXCEPTION 'Abortado P-2: se esperaba 1 FK participantes.% → % (hay %)', r.columna, r.destino, v_n;
        END IF;

        -- P-3 Sigue siendo ON DELETE CASCADE
        SELECT con.conname::text, pg_get_constraintdef(con.oid), con.confupdtype
          INTO v_nombre, v_def, v_upd
          FROM pg_constraint con
         WHERE con.conrelid = 'public.participantes'::regclass
           AND con.contype = 'f'
           AND con.confrelid = to_regclass(r.destino)
           AND con.confdeltype = 'c'
           AND con.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
                                    WHERE a.attrelid = 'public.participantes'::regclass
                                      AND a.attname = r.columna)];
        IF v_nombre IS NULL OR v_def !~ 'ON DELETE CASCADE' THEN
            RAISE EXCEPTION 'Abortado P-3: participantes.% ya no es ON DELETE CASCADE', r.columna;
        END IF;

        EXECUTE format('ALTER TABLE public.participantes DROP CONSTRAINT %I', v_nombre);
        EXECUTE format('ALTER TABLE public.participantes ADD CONSTRAINT %I %s',
                       v_nombre, replace(v_def, 'ON DELETE CASCADE', 'ON DELETE RESTRICT'));

        -- Q-1 Recreada, validada, RESTRICT y con el mismo ON UPDATE
        SELECT count(*) INTO v_n
          FROM pg_constraint con
         WHERE con.conrelid = 'public.participantes'::regclass
           AND con.conname = v_nombre
           AND con.contype = 'f'
           AND con.confrelid = to_regclass(r.destino)
           AND con.confdeltype = 'r'
           AND con.confupdtype = v_upd
           AND con.convalidated;
        IF v_n <> 1 THEN
            RAISE EXCEPTION 'Revertido Q-1: % no quedó como ON DELETE RESTRICT validada', v_nombre;
        END IF;
        RAISE NOTICE '%: ON DELETE CASCADE → ON DELETE RESTRICT', v_nombre;

        v_nombre := NULL;
        v_def    := NULL;
    END LOOP;

    -- Q-2 Ningún registro afectado
    IF (SELECT count(*) FROM public.participantes) <> v_filas THEN
        RAISE EXCEPTION 'Revertido Q-2: cambió el número de filas de participantes';
    END IF;
END
$fk$;

COMMIT;
