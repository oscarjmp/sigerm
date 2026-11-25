-- =====================================================================
-- SIGERM-SEC-DB-02 — 01 PRIVILEGIOS MÍNIMOS Y RLS DE MÓDULOS NUEVOS
-- Versión 2 (SEC-DB-04). VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
--
-- Requiere MACRO 1 aplicada (macro1_01_public.sql y
-- endurecimiento_186_30Y2.sql). Una única transacción: cualquier
-- RAISE EXCEPTION revierte todo. No borra ni modifica registros.
-- Antes de ejecutarlo: guardar la salida de sec_db02_00_instantanea.sql.
--
-- Alcance (solo objetos de postgres en public, sin miembros de extensiones):
--   B1 PUBLIC y anon: sin privilegios en tablas, vistas y secuencias.
--      authenticated: sin TRUNCATE, REFERENCES, TRIGGER ni MAINTAIN
--      (RLS no limita TRUNCATE ni REFERENCES).
--   B2 Módulos nuevos: sin DELETE desde clientes; auditoría solo lectura.
--   B3 Funciones: sin EXECUTE para PUBLIC ni anon. Ningún otro rol pierde
--      el acceso efectivo que tenía (C-1: roles internos de Supabase como
--      supabase_auth_admin conservan EXECUTE, p. ej. para Auth Hooks),
--      salvo tres funciones SECURITY DEFINER que la aplicación no invoca,
--      que dejan de ser ejecutables por anon/authenticated y sus miembros.
--   B4 Privilegios predeterminados de postgres en public: sin anon y sin
--      TRUNCATE/REFERENCES/TRIGGER/MAINTAIN para authenticated.
--   C1 RLS de encuentros, participantes, equipos_servicio, comisiones,
--      configuracion (Administrador: SELECT, INSERT, UPDATE) y auditoria
--      (Administrador: SELECT). Sin políticas DELETE.
--
-- Si P-7d informa funciones con SQL dinámico: revisarlas y, solo si
-- ninguna invoca las funciones restringidas, añadir justo después de
-- BEGIN:   SET LOCAL sigerm.revision_sql_dinamico = 'confirmada';
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path       = pg_catalog, public;

-- ---------------------------------------------------------------------
-- PRECONDICIONES
-- ---------------------------------------------------------------------
DO $pre$
DECLARE
    r      record;
    v_text text;
    v_n    integer;
BEGIN
    -- P-1 Ejecutor
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

    -- P-2 MACRO 1 aplicada (01 en ministerios, Y.2 en movimientos)
    SELECT string_agg(p.polname::text || ':' || p.polcmd::text, ',' ORDER BY p.polname::text COLLATE "C")
      INTO v_text
      FROM pg_policy p WHERE p.polrelid = 'public.ministerios'::regclass;
    IF v_text IS DISTINCT FROM
       'ministerios_insert_gestion:a,ministerios_select_perfil_activo:r,ministerios_update_gestion:w' THEN
        RAISE EXCEPTION 'Abortado P-2: macro1_01_public.sql no está aplicado (ministerios = "%")', v_text;
    END IF;
    SELECT string_agg(p.polname::text, ',') INTO v_text
      FROM pg_policy p WHERE p.polrelid = 'public.movimientos'::regclass;
    IF v_text IS DISTINCT FROM 'Administrador y Coordinador consultan movimientos' THEN
        RAISE EXCEPTION 'Abortado P-2: endurecimiento_186_30Y2.sql no está aplicado (movimientos = "%")', v_text;
    END IF;

    -- P-3 Tablas de los módulos nuevos: existen, RLS activa, sin políticas
    FOR r IN
        SELECT unnest(ARRAY['encuentros', 'participantes', 'equipos_servicio',
                            'comisiones', 'configuracion', 'auditoria']) AS tabla
    LOOP
        IF to_regclass('public.' || r.tabla) IS NULL THEN
            RAISE EXCEPTION 'Abortado P-3: no existe public.%', r.tabla;
        END IF;
        IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = to_regclass('public.' || r.tabla)) THEN
            RAISE EXCEPTION 'Abortado P-3: RLS desactivada en public.%', r.tabla;
        END IF;
        SELECT count(*) INTO v_n FROM pg_policy p WHERE p.polrelid = to_regclass('public.' || r.tabla);
        IF v_n <> 0 THEN
            RAISE EXCEPTION 'Abortado P-3: public.% ya tiene % políticas', r.tabla, v_n;
        END IF;
    END LOOP;

    -- P-4 Ninguna política de public se dirige a PUBLIC o anon
    SELECT string_agg(c.relname::text || '.' || p.polname::text, ', ') INTO v_text
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
     WHERE c.relnamespace = 'public'::regnamespace
       AND (0::oid = ANY (p.polroles) OR 'anon'::regrole::oid = ANY (p.polroles));
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Abortado P-4: existen políticas para PUBLIC/anon: %', v_text;
    END IF;

    -- P-5 Rol Administrador único; rol_actual_en ejecutable por authenticated
    SELECT count(*) INTO v_n FROM public.roles WHERE nombre = 'Administrador';
    IF v_n <> 1 THEN
        RAISE EXCEPTION 'Abortado P-5: el rol Administrador aparece % veces', v_n;
    END IF;
    IF to_regprocedure('public.rol_actual_en(text[])') IS NULL
       OR NOT has_function_privilege('authenticated', 'public.rol_actual_en(text[])', 'EXECUTE') THEN
        RAISE EXCEPTION 'Abortado P-5: rol_actual_en(text[]) no existe o authenticated no puede ejecutarla';
    END IF;

    -- P-6 Funciones que invoca la aplicación
    IF to_regprocedure('public.registrar_prestamo(jsonb)') IS NULL
       OR to_regprocedure('public.devolver_prestamo(uuid)') IS NULL
       OR to_regprocedure('public.es_administrador_actual()') IS NULL
       OR NOT EXISTS (SELECT 1 FROM pg_proc
                       WHERE pronamespace = 'public'::regnamespace AND proname = 'generar_codigo_articulo') THEN
        RAISE EXCEPTION 'Abortado P-6: falta alguna función usada por la aplicación';
    END IF;

    -- P-7a Las tres funciones a restringir existen y son SECURITY DEFINER
    SELECT count(DISTINCT proname) INTO v_n
      FROM pg_proc
     WHERE pronamespace = 'public'::regnamespace AND prosecdef
       AND proname IN ('registrar_alta_articulo', 'registrar_movimiento_inventario', 'registrar_movimiento_kardex');
    IF v_n <> 3 THEN
        RAISE EXCEPTION 'Abortado P-7a: se esperaban 3 funciones SECURITY DEFINER a restringir (hay %)', v_n;
    END IF;

    -- P-7b Ninguna función de ningún esquema las invoca en su cuerpo, salvo
    --      funciones SECURITY DEFINER de postgres (se ejecutan como postgres)
    SELECT string_agg(format('%s.%s (%s, propietario %s)', p.pronamespace::regnamespace, p.proname,
                             CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
                             pg_get_userbyid(p.proowner)), ', ')
      INTO v_text
      FROM pg_proc p
     WHERE p.pronamespace NOT IN ('pg_catalog'::regnamespace, 'information_schema'::regnamespace)
       AND p.prokind IN ('f', 'p')
       AND p.proname NOT IN ('registrar_alta_articulo', 'registrar_movimiento_inventario', 'registrar_movimiento_kardex')
       AND coalesce(p.prosrc, '') ~ '\m(registrar_alta_articulo|registrar_movimiento_inventario|registrar_movimiento_kardex)\M'
       AND NOT (p.prosecdef AND p.proowner = 'postgres'::regrole);
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Abortado P-7b: funciones que las invocan con privilegios ajenos a postgres: %', v_text;
    END IF;

    -- P-7c Dependencias registradas en el catálogo (DEFAULT, CHECK, políticas,
    --      triggers, vistas, cuerpos SQL estándar). Solo se admiten vistas de
    --      postgres sin security_invoker y funciones DEFINER de postgres.
    SELECT string_agg(pg_describe_object(d.classid, d.objid, d.objsubid), '; ') INTO v_text
      FROM pg_depend d
      JOIN pg_proc f ON f.oid = d.refobjid
     WHERE d.refclassid = 'pg_proc'::regclass
       AND f.pronamespace = 'public'::regnamespace
       AND f.proname IN ('registrar_alta_articulo', 'registrar_movimiento_inventario', 'registrar_movimiento_kardex')
       AND NOT (d.classid = 'pg_proc'::regclass
                AND EXISTS (SELECT 1 FROM pg_proc x
                             WHERE x.oid = d.objid AND x.prosecdef AND x.proowner = 'postgres'::regrole))
       AND NOT (d.classid = 'pg_rewrite'::regclass
                AND EXISTS (SELECT 1 FROM pg_rewrite w JOIN pg_class v ON v.oid = w.ev_class
                             WHERE w.oid = d.objid
                               AND v.relowner = 'postgres'::regrole
                               AND NOT coalesce(v.reloptions && ARRAY['security_invoker=true', 'security_invoker=on',
                                                                      'security_invoker=1'], false)));
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Abortado P-7c: objetos dependientes evaluados con privilegios del cliente: %', v_text;
    END IF;

    -- P-7d SQL dinámico (no analizable): funciones PL/pgSQL de public con
    --      EXECUTE que no se ejecutan como postgres requieren revisión manual
    --      (los esquemas gestionados por Supabase no invocan funciones de public)
    SELECT string_agg(format('%s.%s(%s)', p.pronamespace::regnamespace, p.proname,
                             pg_get_function_identity_arguments(p.oid)), ', ')
      INTO v_text
      FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
     WHERE p.pronamespace = 'public'::regnamespace
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
       AND l.lanname = 'plpgsql'
       AND p.prosrc ~* '\mEXECUTE\M'
       AND NOT (p.prosecdef AND p.proowner = 'postgres'::regrole);
    IF v_text IS NOT NULL
       AND current_setting('sigerm.revision_sql_dinamico', true) IS DISTINCT FROM 'confirmada' THEN
        RAISE EXCEPTION 'Abortado P-7d: revisar manualmente el SQL dinámico de: %. Si ninguna invoca las funciones restringidas, añadir tras BEGIN: SET LOCAL sigerm.revision_sql_dinamico = ''confirmada'';', v_text;
    END IF;

    -- P-7e Tareas programadas (pg_cron) que las invoquen con otro usuario
    IF to_regclass('cron.job') IS NOT NULL THEN
        BEGIN
            EXECUTE $q$SELECT string_agg(jobid::text, ', ') FROM cron.job
                        WHERE command ~ '\m(registrar_alta_articulo|registrar_movimiento_inventario|registrar_movimiento_kardex)\M'
                          AND username <> 'postgres'$q$
               INTO v_text;
        EXCEPTION WHEN insufficient_privilege THEN
            v_text := NULL;
            RAISE NOTICE 'P-7e: sin permiso para leer cron.job; revisar manualmente las tareas programadas';
        END;
        IF v_text IS NOT NULL THEN
            RAISE EXCEPTION 'Abortado P-7e: tareas de pg_cron (jobid %) invocan las funciones con otro usuario', v_text;
        END IF;
    END IF;

    -- Informativo: objetos de public que no pertenecen a postgres (no se tocan)
    SELECT string_agg(c.relname::text || ' (' || pg_get_userbyid(c.relowner) || ')', ', ') INTO v_text
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
       AND c.relowner <> 'postgres'::regrole;
    IF v_text IS NOT NULL THEN
        RAISE NOTICE 'Objetos de otro propietario, fuera de alcance: %', v_text;
    END IF;
END
$pre$;

-- ---------------------------------------------------------------------
-- B1 TABLAS, VISTAS Y SECUENCIAS
--    C-1: cualquier rol distinto de anon que solo obtenía un privilegio a
--    través de PUBLIC lo recibe de forma explícita (excepto los cuatro
--    privilegios administrativos de authenticated, que se retiran).
-- ---------------------------------------------------------------------
DO $tablas$
DECLARE
    r          record;
    p          record;
    v_roles    oid[];
    v_conserva text[];
    v_kw       text;
    v_tiene    boolean;
BEGIN
    v_roles := ARRAY(SELECT ro.oid FROM pg_roles ro
                      WHERE (ro.rolcanlogin OR ro.rolname IN ('authenticated', 'service_role'))
                        AND ro.rolname <> 'anon' AND NOT ro.rolsuper AND ro.rolname !~ '^pg_');

    FOR r IN
        SELECT c.oid, c.relname, c.relkind, c.relowner, c.relacl
          FROM pg_class c
         WHERE c.relnamespace = 'public'::regnamespace
           AND c.relowner = 'postgres'::regrole
           AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
           AND NOT EXISTS (SELECT 1 FROM pg_depend d
                            WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
    LOOP
        v_kw := CASE WHEN r.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END;

        v_conserva := ARRAY(
            SELECT ro::text || ':' || a.privilege_type
              FROM aclexplode(r.relacl) a
             CROSS JOIN unnest(v_roles) AS ro
             WHERE a.grantee = 0
               AND ro <> r.relowner
               AND CASE WHEN r.relkind = 'S' THEN has_sequence_privilege(ro, r.oid, a.privilege_type)
                        ELSE has_table_privilege(ro, r.oid, a.privilege_type) END);

        EXECUTE format('REVOKE ALL ON %s public.%I FROM PUBLIC, anon', v_kw, r.relname);

        FOR p IN SELECT split_part(x, ':', 1)::oid AS ro, split_part(x, ':', 2) AS priv
                   FROM unnest(v_conserva) AS x
        LOOP
            CONTINUE WHEN p.ro = 'authenticated'::regrole::oid
                      AND p.priv IN ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN');
            v_tiene := CASE WHEN r.relkind = 'S' THEN has_sequence_privilege(p.ro, r.oid, p.priv)
                            ELSE has_table_privilege(p.ro, r.oid, p.priv) END;
            IF NOT v_tiene THEN
                EXECUTE format('GRANT %s ON %s public.%I TO %I', p.priv, v_kw, r.relname, pg_get_userbyid(p.ro));
                RAISE NOTICE 'C-1 conservado: % sobre % para %', p.priv, r.relname, pg_get_userbyid(p.ro);
            END IF;
        END LOOP;

        IF r.relkind IN ('r', 'p', 'm') THEN
            EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.%I FROM authenticated',
                           r.relname);
        END IF;
    END LOOP;
END
$tablas$;

-- ---------------------------------------------------------------------
-- B2 MÓDULOS NUEVOS: sin borrado desde clientes; auditoría solo lectura
--    (hoy no tienen políticas, por lo que ningún cliente puede usarlas:
--     estos REVOKE no retiran ninguna operación que funcione actualmente)
-- ---------------------------------------------------------------------
REVOKE DELETE ON TABLE public.encuentros, public.participantes, public.equipos_servicio,
                       public.comisiones, public.configuracion, public.auditoria
    FROM authenticated;
REVOKE INSERT, UPDATE ON TABLE public.auditoria FROM authenticated;

-- ---------------------------------------------------------------------
-- B3 FUNCIONES (C-1)
-- ---------------------------------------------------------------------
DO $funciones$
DECLARE
    r             record;
    ro            oid;
    v_roles       oid[];
    v_antes       oid[];
    v_tipo        text;
    v_firma       text;
    v_restringida boolean;
BEGIN
    v_roles := ARRAY(SELECT x.oid FROM pg_roles x
                      WHERE (x.rolcanlogin OR x.rolname IN ('authenticated', 'service_role'))
                        AND x.rolname <> 'anon' AND NOT x.rolsuper AND x.rolname !~ '^pg_');

    FOR r IN
        SELECT p.oid, p.proname::text AS proname, p.prokind, p.proowner
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND p.proowner = 'postgres'::regrole
           AND p.prokind IN ('f', 'p')
           AND NOT EXISTS (SELECT 1 FROM pg_depend d
                            WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    LOOP
        v_tipo        := CASE WHEN r.prokind = 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END;
        v_firma       := format('public.%I(%s)', r.proname, pg_get_function_identity_arguments(r.oid));
        v_restringida := r.proname IN ('registrar_alta_articulo', 'registrar_movimiento_inventario',
                                       'registrar_movimiento_kardex');

        -- Acceso efectivo ANTES del cambio (incluye lo heredado de PUBLIC)
        v_antes := ARRAY(SELECT x FROM unnest(v_roles) AS x
                          WHERE x <> r.proowner AND has_function_privilege(x, r.oid, 'EXECUTE'));

        EXECUTE format('REVOKE EXECUTE ON %s %s FROM PUBLIC, anon', v_tipo, v_firma);
        IF v_restringida THEN
            EXECUTE format('REVOKE EXECUTE ON %s %s FROM authenticated', v_tipo, v_firma);
        END IF;

        FOREACH ro IN ARRAY v_antes LOOP
            CONTINUE WHEN v_restringida
                      AND (ro = 'authenticated'::regrole::oid
                           OR pg_has_role(ro, 'authenticated', 'MEMBER')
                           OR pg_has_role(ro, 'anon', 'MEMBER'));
            IF NOT has_function_privilege(ro, r.oid, 'EXECUTE') THEN
                EXECUTE format('GRANT EXECUTE ON %s %s TO %I', v_tipo, v_firma, pg_get_userbyid(ro));
                RAISE NOTICE 'C-1 conservado: EXECUTE sobre % para %', v_firma, pg_get_userbyid(ro);
            END IF;
            -- Q-B3 inmediata: el rol conserva el acceso
            IF NOT has_function_privilege(ro, r.oid, 'EXECUTE') THEN
                RAISE EXCEPTION 'Revertido Q-B3: % perdió EXECUTE sobre %', pg_get_userbyid(ro), v_firma;
            END IF;
        END LOOP;
    END LOOP;
END
$funciones$;

-- ---------------------------------------------------------------------
-- B4 PRIVILEGIOS PREDETERMINADOS (objetos futuros creados por postgres)
--    Límite documentado: per-schema solo añade privilegios; el EXECUTE
--    global de PUBLIC sobre funciones nuevas sigue vigente. Cada función
--    nueva debe crearse con REVOKE EXECUTE ... FROM PUBLIC, anon explícito.
--    (Supabase documenta además "ALTER DEFAULT PRIVILEGES FOR ROLE postgres
--    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC", que afecta a todas las
--    funciones que postgres cree en cualquier esquema; queda fuera de este
--    bloque hasta que se autorice expresamente.)
-- ---------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM authenticated;

-- ---------------------------------------------------------------------
-- C1 RLS DE LOS MÓDULOS NUEVOS — solo Administrador, sin DELETE.
--    UPDATE con USING y WITH CHECK explícitos. El acceso del rol
--    Matrimonio queda pendiente (sec_db02_03_matrimonio_BORRADOR.sql).
-- ---------------------------------------------------------------------
CREATE POLICY encuentros_select_admin ON public.encuentros
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY encuentros_insert_admin ON public.encuentros
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY encuentros_update_admin ON public.encuentros
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

CREATE POLICY participantes_select_admin ON public.participantes
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY participantes_insert_admin ON public.participantes
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY participantes_update_admin ON public.participantes
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

CREATE POLICY equipos_servicio_select_admin ON public.equipos_servicio
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY equipos_servicio_insert_admin ON public.equipos_servicio
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY equipos_servicio_update_admin ON public.equipos_servicio
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

CREATE POLICY comisiones_select_admin ON public.comisiones
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY comisiones_insert_admin ON public.comisiones
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY comisiones_update_admin ON public.comisiones
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

CREATE POLICY configuracion_select_admin ON public.configuracion
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY configuracion_insert_admin ON public.configuracion
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY configuracion_update_admin ON public.configuracion
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

CREATE POLICY auditoria_select_admin ON public.auditoria
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

-- ---------------------------------------------------------------------
-- COMPROBACIONES POSTERIORES
-- ---------------------------------------------------------------------
DO $post$
DECLARE
    r      record;
    v_text text;
BEGIN
    -- Q-1 PUBLIC y anon sin privilegios en objetos de postgres en public
    SELECT string_agg(c.relname::text, ', ') INTO v_text
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relowner = 'postgres'::regrole
       AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
       AND (EXISTS (SELECT 1 FROM aclexplode(c.relacl) a WHERE a.grantee IN (0::oid, 'anon'::regrole::oid))
            OR EXISTS (SELECT 1 FROM pg_attribute at, aclexplode(at.attacl) a
                        WHERE at.attrelid = c.oid AND a.grantee IN (0::oid, 'anon'::regrole::oid)));
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Revertido Q-1: PUBLIC/anon conservan privilegios en: %', v_text;
    END IF;

    -- Q-2 authenticated sin TRUNCATE, REFERENCES, TRIGGER ni MAINTAIN
    SELECT string_agg(DISTINCT c.relname::text, ', ') INTO v_text
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relowner = 'postgres'::regrole
       AND c.relkind IN ('r', 'p', 'm')
       AND a.grantee = 'authenticated'::regrole::oid
       AND a.privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN');
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Revertido Q-2: authenticated conserva privilegios administrativos en: %', v_text;
    END IF;

    -- Q-3 authenticated conserva lo que usan la aplicación y las políticas nuevas
    FOR r IN
        SELECT * FROM (VALUES
            ('articulos', 'SELECT'), ('matrimonios', 'SELECT'), ('usuarios', 'SELECT'),
            ('roles', 'SELECT'), ('prestamos', 'SELECT'), ('detalle_prestamo', 'SELECT'),
            ('movimientos', 'SELECT'), ('ministerios', 'SELECT'),
            ('encuentros', 'SELECT'), ('encuentros', 'INSERT'), ('encuentros', 'UPDATE'),
            ('participantes', 'SELECT'), ('participantes', 'INSERT'), ('participantes', 'UPDATE'),
            ('equipos_servicio', 'SELECT'), ('equipos_servicio', 'INSERT'), ('equipos_servicio', 'UPDATE'),
            ('comisiones', 'SELECT'), ('comisiones', 'INSERT'), ('comisiones', 'UPDATE'),
            ('configuracion', 'SELECT'), ('configuracion', 'INSERT'), ('configuracion', 'UPDATE'),
            ('auditoria', 'SELECT')
        ) AS t(tabla, priv)
    LOOP
        IF NOT has_table_privilege('authenticated', ('public.' || r.tabla)::regclass, r.priv) THEN
            RAISE EXCEPTION 'Revertido Q-3: authenticated perdió % sobre %', r.priv, r.tabla;
        END IF;
    END LOOP;
    FOR r IN
        SELECT * FROM (VALUES
            ('encuentros', 'DELETE'), ('participantes', 'DELETE'), ('equipos_servicio', 'DELETE'),
            ('comisiones', 'DELETE'), ('configuracion', 'DELETE'), ('auditoria', 'DELETE'),
            ('auditoria', 'INSERT'), ('auditoria', 'UPDATE')
        ) AS t(tabla, priv)
    LOOP
        IF has_table_privilege('authenticated', ('public.' || r.tabla)::regclass, r.priv) THEN
            RAISE EXCEPTION 'Revertido Q-3: authenticated conserva % sobre %', r.priv, r.tabla;
        END IF;
    END LOOP;

    -- Q-4 Funciones de la aplicación y funciones restringidas
    IF NOT has_function_privilege('authenticated', 'public.registrar_prestamo(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.devolver_prestamo(uuid)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.es_administrador_actual()', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.rol_actual_en(text[])', 'EXECUTE')
       OR EXISTS (SELECT 1 FROM pg_proc
                   WHERE pronamespace = 'public'::regnamespace AND proname = 'generar_codigo_articulo'
                     AND NOT has_function_privilege('authenticated', oid, 'EXECUTE')) THEN
        RAISE EXCEPTION 'Revertido Q-4: authenticated perdió EXECUTE en una función de la aplicación';
    END IF;
    SELECT string_agg(p.proname::text, ', ') INTO v_text
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proowner = 'postgres'::regrole
       AND p.prokind IN ('f', 'p')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR (p.proname IN ('registrar_alta_articulo', 'registrar_movimiento_inventario', 'registrar_movimiento_kardex')
                AND has_function_privilege('authenticated', p.oid, 'EXECUTE')));
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Revertido Q-4: EXECUTE indebido en: %', v_text;
    END IF;

    -- Q-5 Políticas exactas de los módulos nuevos
    FOR r IN
        SELECT * FROM (VALUES
            ('encuentros',       'encuentros_insert_admin:a,encuentros_select_admin:r,encuentros_update_admin:w'),
            ('participantes',    'participantes_insert_admin:a,participantes_select_admin:r,participantes_update_admin:w'),
            ('equipos_servicio', 'equipos_servicio_insert_admin:a,equipos_servicio_select_admin:r,equipos_servicio_update_admin:w'),
            ('comisiones',       'comisiones_insert_admin:a,comisiones_select_admin:r,comisiones_update_admin:w'),
            ('configuracion',    'configuracion_insert_admin:a,configuracion_select_admin:r,configuracion_update_admin:w'),
            ('auditoria',        'auditoria_select_admin:r')
        ) AS t(tabla, esperado)
    LOOP
        SELECT string_agg(p.polname::text || ':' || p.polcmd::text, ',' ORDER BY p.polname::text COLLATE "C")
          INTO v_text
          FROM pg_policy p
         WHERE p.polrelid = ('public.' || r.tabla)::regclass
           AND p.polpermissive
           AND p.polroles = ARRAY['authenticated'::regrole]::oid[];
        IF v_text IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Revertido Q-5: políticas de % = "%" (se esperaba "%")', r.tabla, v_text, r.esperado;
        END IF;
        IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = ('public.' || r.tabla)::regclass) THEN
            RAISE EXCEPTION 'Revertido Q-5: RLS desactivada en %', r.tabla;
        END IF;
    END LOOP;
    SELECT string_agg(c.relname::text || '.' || p.polname::text, ', ') INTO v_text
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
     WHERE c.relnamespace = 'public'::regnamespace
       AND p.polcmd = 'w'
       AND (p.polqual IS NULL OR p.polwithcheck IS NULL)
       AND c.relname IN ('encuentros', 'participantes', 'equipos_servicio', 'comisiones', 'configuracion');
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Revertido Q-5: políticas UPDATE sin USING o WITH CHECK: %', v_text;
    END IF;

    -- Q-6 Privilegios predeterminados de postgres en public sin anon
    SELECT string_agg(d.defaclobjtype::text, ',') INTO v_text
      FROM pg_default_acl d, aclexplode(d.defaclacl) a
     WHERE d.defaclrole = 'postgres'::regrole
       AND d.defaclnamespace = 'public'::regnamespace
       AND (a.grantee = 'anon'::regrole::oid
            OR (a.grantee = 'authenticated'::regrole::oid
                AND a.privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')));
    IF v_text IS NOT NULL THEN
        RAISE EXCEPTION 'Revertido Q-6: privilegios predeterminados indebidos (tipos %)', v_text;
    END IF;
END
$post$;

COMMIT;
