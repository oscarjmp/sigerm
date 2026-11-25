-- =====================================================================
-- SIGERM-SEC-DB-05 — UNICIDAD DE INSCRIPCIONES (encuentro, matrimonio)
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
--
-- Garantiza en la base de datos que un matrimonio no quede inscrito dos
-- veces en el mismo encuentro, también ante altas simultáneas (la
-- comprobación previa de la aplicación no basta frente a concurrencia).
-- No borra ni modifica registros. Una única transacción.
--
-- Semántica de NULL: UNIQUE estándar (NULLS DISTINCT). Los registros
-- históricos con encuentro_id o matrimonio_id nulos se conservan y no
-- cuentan como duplicados.
-- Efecto en la aplicación: un alta duplicada devuelve el código 23505,
-- que el repositorio de Codex ya traduce a un mensaje comprensible.
-- Bloqueo: ALTER TABLE ... ADD CONSTRAINT toma ACCESS EXCLUSIVE sobre
-- participantes mientras construye el índice (tabla pequeña).
-- Independiente de los bloques sec_db02.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
DECLARE
    v_n    bigint;
    v_text text;
BEGIN
    -- P-1 Ejecutor
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

    -- P-2 Tabla y columnas esperadas
    IF to_regclass('public.participantes') IS NULL THEN
        RAISE EXCEPTION 'Abortado P-2: no existe public.participantes';
    END IF;
    SELECT count(*) INTO v_n
      FROM pg_attribute a
     WHERE a.attrelid = 'public.participantes'::regclass
       AND a.attname IN ('encuentro_id', 'matrimonio_id')
       AND NOT a.attisdropped
       AND format_type(a.atttypid, NULL) = 'uuid';
    IF v_n <> 2 THEN
        RAISE EXCEPTION 'Abortado P-2: faltan encuentro_id/matrimonio_id de tipo uuid';
    END IF;

    -- P-3 No existe ya una unicidad equivalente (restricción o índice)
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.participantes'::regclass
                  AND conname = 'participantes_encuentro_matrimonio_key') THEN
        RAISE EXCEPTION 'Abortado P-3: la restricción participantes_encuentro_matrimonio_key ya existe';
    END IF;
    SELECT string_agg(i.relname::text, ', ') INTO v_text
      FROM pg_index x
      JOIN pg_class i ON i.oid = x.indexrelid
     WHERE x.indrelid = 'public.participantes'::regclass
       AND x.indisunique
       AND (SELECT string_agg(a.attname::text, ',' ORDER BY a.attname::text COLLATE "C")
              FROM unnest(x.indkey::int2[]) AS k(attnum)
              JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = k.attnum)
           = 'encuentro_id,matrimonio_id';
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Abortado P-3: ya existe un índice único equivalente: %', v_text;
    END IF;

    -- P-4 Sin duplicados actuales (solo conteos; no se muestran registros)
    SELECT count(*) INTO v_n
      FROM (SELECT 1
              FROM public.participantes
             WHERE encuentro_id IS NOT NULL AND matrimonio_id IS NOT NULL
             GROUP BY encuentro_id, matrimonio_id
            HAVING count(*) > 1) d;
    IF v_n <> 0 THEN
        RAISE EXCEPTION 'Abortado P-4: hay % combinaciones (encuentro, matrimonio) duplicadas; requieren decisión humana', v_n;
    END IF;

    -- Conteo de control para Q-3
    SELECT count(*) INTO v_n FROM public.participantes;
    PERFORM set_config('sigerm.filas_participantes', v_n::text, true);
END
$pre$;

ALTER TABLE public.participantes
    ADD CONSTRAINT participantes_encuentro_matrimonio_key UNIQUE (encuentro_id, matrimonio_id);

DO $post$
DECLARE
    v_def text;
BEGIN
    -- Q-1 Restricción creada, validada y con la definición exacta
    SELECT pg_get_constraintdef(c.oid) INTO v_def
      FROM pg_constraint c
     WHERE c.conrelid = 'public.participantes'::regclass
       AND c.conname = 'participantes_encuentro_matrimonio_key'
       AND c.contype = 'u'
       AND c.convalidated;
    IF v_def IS DISTINCT FROM 'UNIQUE (encuentro_id, matrimonio_id)' THEN
        RAISE EXCEPTION 'Revertido Q-1: definición inesperada: %', v_def;
    END IF;

    -- Q-2 Las claves foráneas de participantes no cambiaron de número
    IF (SELECT count(*) FROM pg_constraint
         WHERE conrelid = 'public.participantes'::regclass AND contype = 'f') <> 2 THEN
        RAISE EXCEPTION 'Revertido Q-2: cambió el número de claves foráneas de participantes';
    END IF;

    -- Q-3 Ningún registro afectado
    IF (SELECT count(*) FROM public.participantes)::text
       IS DISTINCT FROM current_setting('sigerm.filas_participantes', true) THEN
        RAISE EXCEPTION 'Revertido Q-3: cambió el número de filas de participantes';
    END IF;
END
$post$;

COMMIT;
