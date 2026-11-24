-- =====================================================================
-- SIGERM 186.30Y.1 — ENDURECIMIENTO DE public.movimientos
-- VERSIÓN DEFINITIVA PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Requisitos: ejecutar como postgres, en una única transacción.
-- Cualquier RAISE EXCEPTION aborta la transacción: el COMMIT final
-- se convierte en ROLLBACK y no se aplica ningún cambio.
-- Si el cliente SQL informa de un error, ejecutar ROLLBACK; antes de
-- reutilizar la sesión.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

-- Bloqueo desde el inicio: comprobaciones y cambios atómicos
LOCK TABLE public.movimientos IN ACCESS EXCLUSIVE MODE;

-- ---------------------------------------------------------------------
-- COMPROBACIONES PREVIAS
-- ---------------------------------------------------------------------
DO $pre$
DECLARE
    v_tbl   regclass := to_regclass('public.movimientos');
    v_usr   regclass := to_regclass('public.usuarios');
    v_uid   regprocedure := to_regprocedure('auth.uid()');
    v_count integer;
    v_ok    boolean;
    v_text  text;
    v_pol   oid;
    r       record;
    c_todos constant text := 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE';
BEGIN
    -- P-1 Rol y objetos base
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;
    IF v_tbl IS NULL OR v_usr IS NULL OR to_regclass('public.roles') IS NULL OR v_uid IS NULL THEN
        RAISE EXCEPTION 'Abortado P-1: falta public.movimientos, public.usuarios, public.roles o auth.uid()';
    END IF;

    -- P-2 Funciones: una versión, firma exacta, SECURITY DEFINER, propietario y MD5
    FOR r IN
        SELECT * FROM (VALUES
            ('registrar_prestamo',
             'public.registrar_prestamo(jsonb)',
             'f7556fef91f9cecd64cf7b43efb0de41'),
            ('devolver_prestamo',
             'public.devolver_prestamo(uuid)',
             '17f43cf494767268d94cb07f9ba2cd9b'),
            ('registrar_movimiento_kardex',
             'public.registrar_movimiento_kardex(uuid,character varying,integer,integer,integer,uuid,uuid,character varying,text,text,text,jsonb)',
             '3244bea23b57ef0cb9cffffd97aaaef0'),
            ('rol_actual_en',
             'public.rol_actual_en(text[])',
             '6844a678ff1bbe4962dbba652524ffb7')
        ) AS t(nombre, firma, md5_esperado)
    LOOP
        SELECT count(*) INTO v_count
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname = r.nombre;
        IF v_count <> 1 THEN
            RAISE EXCEPTION 'Abortado P-2: % tiene % versiones (se esperaba 1)', r.nombre, v_count;
        END IF;

        IF to_regprocedure(r.firma) IS NULL THEN
            RAISE EXCEPTION 'Abortado P-2: no existe la firma exacta %', r.firma;
        END IF;

        PERFORM 1 FROM pg_proc p
         WHERE p.oid = to_regprocedure(r.firma)
           AND p.prosecdef
           AND pg_get_userbyid(p.proowner) = 'postgres';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Abortado P-2: % no es SECURITY DEFINER de postgres', r.firma;
        END IF;

        v_text := md5(pg_get_functiondef(to_regprocedure(r.firma)));
        IF v_text IS DISTINCT FROM r.md5_esperado THEN
            RAISE EXCEPTION 'Abortado P-2: la huella de % cambió (actual %, esperada %)',
                            r.nombre, v_text, r.md5_esperado;
        END IF;
    END LOOP;

    -- P-3 authenticated puede ejecutar rol_actual_en
    IF has_function_privilege('authenticated',
                              'public.rol_actual_en(text[])'::regprocedure,
                              'EXECUTE') IS NOT TRUE THEN
        RAISE EXCEPTION 'Abortado P-3: authenticated no puede ejecutar rol_actual_en(text[])';
    END IF;

    -- P-4 Roles de negocio requeridos (solo conteo por nombre)
    SELECT count(*) INTO v_count FROM public.roles WHERE nombre = 'Administrador';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Abortado P-4: el rol Administrador aparece % veces', v_count;
    END IF;
    SELECT count(*) INTO v_count FROM public.roles WHERE nombre = 'Coordinador';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Abortado P-4: el rol Coordinador aparece % veces', v_count;
    END IF;

    -- P-5 UNIQUE de una sola columna sobre usuarios.auth_id (estructural)
    PERFORM 1
       FROM pg_constraint c
      WHERE c.conrelid = v_usr
        AND c.contype  = 'u'
        AND c.conkey   = ARRAY[(SELECT a.attnum
                                  FROM pg_attribute a
                                 WHERE a.attrelid = v_usr
                                   AND a.attname  = 'auth_id'
                                   AND NOT a.attisdropped)]::smallint[];
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Abortado P-5: no existe UNIQUE de una sola columna sobre usuarios.auth_id';
    END IF;

    -- P-6 RLS activado
    PERFORM 1 FROM pg_class
     WHERE oid = v_tbl
       AND relrowsecurity
       AND NOT relforcerowsecurity
       AND pg_get_userbyid(relowner) = 'postgres';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Abortado P-6: RLS no activado, RLS forzado o propietario distinto de postgres en public.movimientos';
    END IF;

    -- P-7 Concesiones explícitas: 32 en total, las 8 para cada uno de los 4 roles, todas de postgres
    SELECT count(*) INTO v_count
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid = v_tbl;
    IF v_count <> 32 THEN
        RAISE EXCEPTION 'Abortado P-7: la tabla tiene % concesiones (se esperaban 32)', v_count;
    END IF;

    PERFORM 1
       FROM pg_class c, aclexplode(c.relacl) a
      WHERE c.oid = v_tbl
        AND (a.grantee = 0 OR pg_get_userbyid(a.grantor) <> 'postgres');
    IF FOUND THEN
        RAISE EXCEPTION 'Abortado P-7: hay concesiones a PUBLIC o de un concedente distinto de postgres';
    END IF;

    FOR r IN SELECT * FROM (VALUES ('postgres'), ('anon'), ('authenticated'), ('service_role')) AS t(rol)
    LOOP
        SELECT COALESCE(string_agg(a.privilege_type, ',' ORDER BY a.privilege_type), '')
          INTO v_text
          FROM pg_class c, aclexplode(c.relacl) a
         WHERE c.oid = v_tbl
           AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = r.rol);
        IF v_text IS DISTINCT FROM c_todos THEN
            RAISE EXCEPTION 'Abortado P-7: concesiones de % = "%" (se esperaba "%")', r.rol, v_text, c_todos;
        END IF;
    END LOOP;

    -- P-8 anon y authenticated sin BYPASSRLS
    PERFORM 1 FROM pg_roles
     WHERE rolname IN ('anon', 'authenticated')
       AND rolbypassrls;
    IF FOUND THEN
        RAISE EXCEPTION 'Abortado P-8: anon o authenticated tienen BYPASSRLS';
    END IF;

    -- P-9 Sin permisos por columna
    PERFORM 1 FROM pg_attribute
     WHERE attrelid = v_tbl
       AND attnum > 0
       AND NOT attisdropped
       AND attacl IS NOT NULL;
    IF FOUND THEN
        RAISE EXCEPTION 'Abortado P-9: hay permisos por columna no auditados';
    END IF;

    -- P-10 Exactamente las dos políticas auditadas:
    --      estructura + expresión normalizada (sensible a mayúsculas) + dependencias
    SELECT count(*) INTO v_count FROM pg_policy WHERE polrelid = v_tbl;
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'Abortado P-10: hay % políticas (se esperaban 2)', v_count;
    END IF;

    FOR r IN
        SELECT * FROM (VALUES
            ('Usuarios activos pueden registrar movimientos', 'a', 'check',
             '(EXISTS ( SELECT 1 FROM usuarios u WHERE ((u.auth_id = auth.uid()) AND (u.activo = true) AND ((movimientos.usuario_id = u.id) OR (movimientos.usuario_id IS NULL)))))'),
            ('Usuarios activos pueden consultar movimientos', 'r', 'using',
             '(EXISTS ( SELECT 1 FROM usuarios u WHERE ((u.auth_id = auth.uid()) AND (u.activo = true))))')
        ) AS t(nombre, cmd, campo, expr)
    LOOP
        v_pol  := NULL;
        v_text := NULL;

        SELECT p.oid,
               CASE r.campo WHEN 'check' THEN pg_get_expr(p.polwithcheck, p.polrelid)
                            ELSE              pg_get_expr(p.polqual,      p.polrelid) END
          INTO v_pol, v_text
          FROM pg_policy p
         WHERE p.polrelid = v_tbl
           AND p.polname  = r.nombre
           AND p.polcmd   = r.cmd
           AND p.polpermissive
           AND p.polroles = ARRAY['authenticated'::regrole]::oid[]
           AND CASE r.campo WHEN 'check' THEN p.polqual IS NULL AND p.polwithcheck IS NOT NULL
                            ELSE              p.polwithcheck IS NULL AND p.polqual IS NOT NULL END;
        IF v_pol IS NULL THEN
            RAISE EXCEPTION 'Abortado P-10: la política "%" no tiene la estructura auditada', r.nombre;
        END IF;

        IF v_text IS NULL
           OR regexp_replace(regexp_replace(v_text,  '\mpublic\.', '', 'g'), '\s+', '', 'g')
              IS DISTINCT FROM
              regexp_replace(regexp_replace(r.expr,  '\mpublic\.', '', 'g'), '\s+', '', 'g') THEN
            RAISE EXCEPTION 'Abortado P-10: la expresión de "%" no coincide con lo auditado: %', r.nombre, v_text;
        END IF;

        PERFORM 1 FROM pg_depend d
         WHERE d.classid    = 'pg_policy'::regclass
           AND d.objid      = v_pol
           AND d.refclassid = 'pg_class'::regclass
           AND d.refobjid   = v_usr;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Abortado P-10: la política "%" no depende de public.usuarios', r.nombre;
        END IF;

        SELECT count(DISTINCT d.refobjid), bool_and(d.refobjid = v_uid)
          INTO v_count, v_ok
          FROM pg_depend d
         WHERE d.classid    = 'pg_policy'::regclass
           AND d.objid      = v_pol
           AND d.refclassid = 'pg_proc'::regclass;
        IF v_count <> 1 OR v_ok IS NOT TRUE THEN
            RAISE EXCEPTION 'Abortado P-10: la política "%" no depende exclusivamente de auth.uid()', r.nombre;
        END IF;
    END LOOP;

    PERFORM 1 FROM pg_policy
     WHERE polrelid = v_tbl
       AND polname  = 'Administrador y Coordinador consultan movimientos';
    IF FOUND THEN
        RAISE EXCEPTION 'Abortado P-10: la política nueva ya existe';
    END IF;
END
$pre$;

-- ---------------------------------------------------------------------
-- CAMBIOS
-- ---------------------------------------------------------------------
-- C-1 Retirar la inserción directa (R10)
DROP POLICY "Usuarios activos pueden registrar movimientos" ON public.movimientos;

-- C-2 Retirar permisos directos (R10, R13). service_role y postgres no se tocan.
REVOKE ALL ON TABLE public.movimientos FROM anon;
REVOKE ALL ON TABLE public.movimientos FROM authenticated;
GRANT SELECT ON TABLE public.movimientos TO authenticated;

-- C-3 Lectura solo para Administrador y Coordinador (R11, R14-datos)
DROP POLICY "Usuarios activos pueden consultar movimientos" ON public.movimientos;

CREATE POLICY "Administrador y Coordinador consultan movimientos"
    ON public.movimientos
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING ((SELECT public.rol_actual_en(ARRAY['Administrador', 'Coordinador']::text[])));

-- ---------------------------------------------------------------------
-- COMPROBACIONES POSTERIORES (cualquier fallo revierte toda la transacción)
-- ---------------------------------------------------------------------
DO $post$
DECLARE
    v_tbl     regclass := 'public.movimientos'::regclass;
    v_rol     regprocedure := 'public.rol_actual_en(text[])'::regprocedure;
    v_count   integer;
    v_ok      boolean;
    v_text    text;
    v_pol     oid;
    v_actual  boolean;
    r         record;
    c_todos   constant text := 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE';
BEGIN
    -- Q-1 17 concesiones explícitas, todas de postgres, ninguna a PUBLIC
    SELECT count(*) INTO v_count
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid = v_tbl;
    IF v_count <> 17 THEN
        RAISE EXCEPTION 'Revertido Q-1: hay % concesiones (se esperaban 17)', v_count;
    END IF;

    PERFORM 1
       FROM pg_class c, aclexplode(c.relacl) a
      WHERE c.oid = v_tbl
        AND (a.grantee = 0 OR pg_get_userbyid(a.grantor) <> 'postgres');
    IF FOUND THEN
        RAISE EXCEPTION 'Revertido Q-1: hay concesiones a PUBLIC o de un concedente distinto de postgres';
    END IF;

    -- Q-2 Concesiones explícitas por rol
    FOR r IN
        SELECT * FROM (VALUES
            ('postgres',      c_todos),
            ('service_role',  c_todos),
            ('authenticated', 'SELECT'),
            ('anon',          '')
        ) AS t(rol, esperado)
    LOOP
        SELECT COALESCE(string_agg(a.privilege_type, ',' ORDER BY a.privilege_type), '')
          INTO v_text
          FROM pg_class c, aclexplode(c.relacl) a
         WHERE c.oid = v_tbl
           AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = r.rol);
        IF v_text IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Revertido Q-2: concesiones de % = "%" (se esperaba "%")',
                            r.rol, v_text, r.esperado;
        END IF;
    END LOOP;

    -- Q-3 Permisos efectivos, uno por uno (incluye MAINTAIN, REFERENCES y TRIGGER)
    FOR r IN
        SELECT ro.rol, pv.priv,
               CASE ro.rol
                    WHEN 'anon'          THEN false
                    WHEN 'authenticated' THEN pv.priv = 'SELECT'
                    ELSE true
               END AS esperado
          FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS ro(rol)
         CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                            ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) AS pv(priv)
    LOOP
        v_actual := has_table_privilege(r.rol, v_tbl, r.priv);
        IF v_actual IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Revertido Q-3: % tiene %=% (se esperaba %)',
                            r.rol, r.priv, v_actual, r.esperado;
        END IF;
    END LOOP;

    -- Q-4 RLS sigue activo y sin permisos por columna
    PERFORM 1 FROM pg_class
     WHERE oid = v_tbl
       AND relrowsecurity
       AND NOT relforcerowsecurity
       AND pg_get_userbyid(relowner) = 'postgres';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Revertido Q-4: RLS no activado, RLS forzado o propietario distinto de postgres';
    END IF;
    PERFORM 1 FROM pg_attribute
     WHERE attrelid = v_tbl AND attnum > 0 AND NOT attisdropped AND attacl IS NOT NULL;
    IF FOUND THEN
        RAISE EXCEPTION 'Revertido Q-4: hay permisos por columna';
    END IF;

    -- Q-5 Una sola política: la nueva SELECT
    --     estructura + dependencia exclusiva de rol_actual_en + expresión exacta (sensible a mayúsculas)
    SELECT count(*) INTO v_count FROM pg_policy WHERE polrelid = v_tbl;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Revertido Q-5: hay % políticas (se esperaba 1)', v_count;
    END IF;

    SELECT p.oid, pg_get_expr(p.polqual, p.polrelid)
      INTO v_pol, v_text
      FROM pg_policy p
     WHERE p.polrelid = v_tbl
       AND p.polname  = 'Administrador y Coordinador consultan movimientos'
       AND p.polcmd   = 'r'
       AND p.polpermissive
       AND p.polroles = ARRAY['authenticated'::regrole]::oid[]
       AND p.polwithcheck IS NULL
       AND p.polqual IS NOT NULL;
    IF v_pol IS NULL THEN
        RAISE EXCEPTION 'Revertido Q-5: la política nueva no tiene la estructura esperada';
    END IF;

    SELECT count(DISTINCT d.refobjid), bool_and(d.refobjid = v_rol)
      INTO v_count, v_ok
      FROM pg_depend d
     WHERE d.classid    = 'pg_policy'::regclass
       AND d.objid      = v_pol
       AND d.refclassid = 'pg_proc'::regclass;
    IF v_count <> 1 OR v_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'Revertido Q-5: la política nueva no depende exclusivamente de rol_actual_en(text[])';
    END IF;

    IF v_text IS NULL
       OR regexp_replace(regexp_replace(v_text, '\mpublic\.', '', 'g'), '\s+', '', 'g')
          <> ALL (ARRAY[
              '(SELECTrol_actual_en(ARRAY[''Administrador''::text,''Coordinador''::text])ASrol_actual_en)',
              '(SELECTrol_actual_en(ARRAY[''Administrador''::text,''Coordinador''::text]))',
              '(SELECTrol_actual_en(ARRAY[''Administrador'',''Coordinador'']::text[])ASrol_actual_en)',
              '(SELECTrol_actual_en(ARRAY[''Administrador'',''Coordinador'']::text[]))'
          ]) THEN
        RAISE EXCEPTION 'Revertido Q-5: expresión inesperada en la política nueva: %', v_text;
    END IF;

    -- Q-6 Funciones RPC y rol_actual_en sin cambios
    FOR r IN
        SELECT * FROM (VALUES
            ('public.registrar_prestamo(jsonb)', 'f7556fef91f9cecd64cf7b43efb0de41'),
            ('public.devolver_prestamo(uuid)',   '17f43cf494767268d94cb07f9ba2cd9b'),
            ('public.registrar_movimiento_kardex(uuid,character varying,integer,integer,integer,uuid,uuid,character varying,text,text,text,jsonb)',
                                                 '3244bea23b57ef0cb9cffffd97aaaef0'),
            ('public.rol_actual_en(text[])',     '6844a678ff1bbe4962dbba652524ffb7')
        ) AS t(firma, md5_esperado)
    LOOP
        IF md5(pg_get_functiondef(to_regprocedure(r.firma))) IS DISTINCT FROM r.md5_esperado THEN
            RAISE EXCEPTION 'Revertido Q-6: cambió la huella de %', r.firma;
        END IF;
    END LOOP;
END
$post$;

COMMIT;
