-- =====================================================================
-- SIGERM 186.30Y.1 — REVERSIÓN DEL ENDURECIMIENTO
-- VERSIÓN DEFINITIVA PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Solo se aplica si el estado actual es exactamente el endurecido.
-- Restaura el estado auditado en 186.30Q.1 / 186.30R.1 / 186.30W.3.
-- ADVERTENCIA: reabre temporalmente R10, R11 y R13.
-- Si el cliente SQL informa de un error, ejecutar ROLLBACK; antes de
-- reutilizar la sesión.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

LOCK TABLE public.movimientos IN ACCESS EXCLUSIVE MODE;

-- ---------------------------------------------------------------------
-- COMPROBACIONES PREVIAS: el estado debe ser exactamente el endurecido
-- ---------------------------------------------------------------------
DO $pre$
DECLARE
    v_tbl   regclass := to_regclass('public.movimientos');
    v_rol   regprocedure := to_regprocedure('public.rol_actual_en(text[])');
    v_count integer;
    v_ok    boolean;
    v_text  text;
    v_pol   oid;
    r       record;
    c_todos constant text := 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE';
BEGIN
    -- R-1 Rol y objetos base
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado R-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;
    IF v_tbl IS NULL OR to_regclass('public.usuarios') IS NULL
       OR v_rol IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
        RAISE EXCEPTION 'Abortado R-1: falta public.movimientos, public.usuarios, rol_actual_en(text[]) o auth.uid()';
    END IF;

    -- R-2 Concesiones exactas del estado endurecido (17)
    SELECT count(*) INTO v_count
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid = v_tbl;
    IF v_count <> 17 THEN
        RAISE EXCEPTION 'Abortado R-2: hay % concesiones (se esperaban 17)', v_count;
    END IF;

    PERFORM 1
       FROM pg_class c, aclexplode(c.relacl) a
      WHERE c.oid = v_tbl
        AND (a.grantee = 0 OR pg_get_userbyid(a.grantor) <> 'postgres');
    IF FOUND THEN
        RAISE EXCEPTION 'Abortado R-2: hay concesiones a PUBLIC o de un concedente distinto de postgres';
    END IF;

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
            RAISE EXCEPTION 'Abortado R-2: concesiones de % = "%" (se esperaba "%")',
                            r.rol, v_text, r.esperado;
        END IF;
    END LOOP;

    -- R-3 Una sola política: la del endurecimiento
    --     estructura + dependencia exclusiva de rol_actual_en + expresión exacta (sensible a mayúsculas)
    SELECT count(*) INTO v_count FROM pg_policy WHERE polrelid = v_tbl;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Abortado R-3: hay % políticas (se esperaba 1)', v_count;
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
        RAISE EXCEPTION 'Abortado R-3: la política actual no es la del endurecimiento';
    END IF;

    SELECT count(DISTINCT d.refobjid), bool_and(d.refobjid = v_rol)
      INTO v_count, v_ok
      FROM pg_depend d
     WHERE d.classid    = 'pg_policy'::regclass
       AND d.objid      = v_pol
       AND d.refclassid = 'pg_proc'::regclass;
    IF v_count <> 1 OR v_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'Abortado R-3: la política actual no depende exclusivamente de rol_actual_en(text[])';
    END IF;

    IF v_text IS NULL
       OR regexp_replace(regexp_replace(v_text, '\mpublic\.', '', 'g'), '\s+', '', 'g')
          <> ALL (ARRAY[
              '(SELECTrol_actual_en(ARRAY[''Administrador''::text,''Coordinador''::text])ASrol_actual_en)',
              '(SELECTrol_actual_en(ARRAY[''Administrador''::text,''Coordinador''::text]))',
              '(SELECTrol_actual_en(ARRAY[''Administrador'',''Coordinador'']::text[])ASrol_actual_en)',
              '(SELECTrol_actual_en(ARRAY[''Administrador'',''Coordinador'']::text[]))'
          ]) THEN
        RAISE EXCEPTION 'Abortado R-3: expresión inesperada en la política actual: %', v_text;
    END IF;

    -- R-4 RLS activo y sin permisos por columna
    PERFORM 1 FROM pg_class
     WHERE oid = v_tbl
       AND relrowsecurity
       AND NOT relforcerowsecurity
       AND pg_get_userbyid(relowner) = 'postgres';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Abortado R-4: RLS no activado, RLS forzado o propietario distinto de postgres';
    END IF;
    PERFORM 1 FROM pg_attribute
     WHERE attrelid = v_tbl AND attnum > 0 AND NOT attisdropped AND attacl IS NOT NULL;
    IF FOUND THEN
        RAISE EXCEPTION 'Abortado R-4: hay permisos por columna';
    END IF;
END
$pre$;

-- ---------------------------------------------------------------------
-- CAMBIOS DE REVERSIÓN
-- ---------------------------------------------------------------------
DROP POLICY "Administrador y Coordinador consultan movimientos" ON public.movimientos;

-- Restituye arwdDxtm (PostgreSQL 17: ALL incluye MAINTAIN)
GRANT ALL ON TABLE public.movimientos TO anon;
GRANT ALL ON TABLE public.movimientos TO authenticated;

CREATE POLICY "Usuarios activos pueden consultar movimientos"
    ON public.movimientos
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1
                     FROM public.usuarios u
                    WHERE u.auth_id = auth.uid()
                      AND u.activo = true));

CREATE POLICY "Usuarios activos pueden registrar movimientos"
    ON public.movimientos
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1
                          FROM public.usuarios u
                         WHERE u.auth_id = auth.uid()
                           AND u.activo = true
                           AND (movimientos.usuario_id = u.id
                                OR movimientos.usuario_id IS NULL)));

-- ---------------------------------------------------------------------
-- COMPROBACIONES POSTERIORES: el estado debe ser exactamente el auditado
-- ---------------------------------------------------------------------
DO $post$
DECLARE
    v_tbl    regclass := 'public.movimientos'::regclass;
    v_usr    regclass := 'public.usuarios'::regclass;
    v_uid    regprocedure := 'auth.uid()'::regprocedure;
    v_count  integer;
    v_ok     boolean;
    v_text   text;
    v_pol    oid;
    v_actual boolean;
    r        record;
    c_todos  constant text := 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE';
BEGIN
    -- S-1 32 concesiones explícitas: las 8 para cada rol, todas de postgres
    SELECT count(*) INTO v_count
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid = v_tbl;
    IF v_count <> 32 THEN
        RAISE EXCEPTION 'Revertido S-1: hay % concesiones (se esperaban 32)', v_count;
    END IF;

    PERFORM 1
       FROM pg_class c, aclexplode(c.relacl) a
      WHERE c.oid = v_tbl
        AND (a.grantee = 0 OR pg_get_userbyid(a.grantor) <> 'postgres');
    IF FOUND THEN
        RAISE EXCEPTION 'Revertido S-1: hay concesiones a PUBLIC o de un concedente distinto de postgres';
    END IF;

    FOR r IN SELECT * FROM (VALUES ('postgres'), ('anon'), ('authenticated'), ('service_role')) AS t(rol)
    LOOP
        SELECT COALESCE(string_agg(a.privilege_type, ',' ORDER BY a.privilege_type), '')
          INTO v_text
          FROM pg_class c, aclexplode(c.relacl) a
         WHERE c.oid = v_tbl
           AND a.grantee = (SELECT oid FROM pg_roles WHERE rolname = r.rol);
        IF v_text IS DISTINCT FROM c_todos THEN
            RAISE EXCEPTION 'Revertido S-1: concesiones de % = "%"', r.rol, v_text;
        END IF;
    END LOOP;

    -- S-2 Permisos efectivos, uno por uno
    FOR r IN
        SELECT ro.rol, pv.priv
          FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS ro(rol)
         CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                            ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) AS pv(priv)
    LOOP
        v_actual := has_table_privilege(r.rol, v_tbl, r.priv);
        IF v_actual IS NOT TRUE THEN
            RAISE EXCEPTION 'Revertido S-2: % no tiene %', r.rol, r.priv;
        END IF;
    END LOOP;

    -- S-3 Exactamente las dos políticas originales:
    --     estructura + expresión normalizada (sensible a mayúsculas) + dependencias
    SELECT count(*) INTO v_count FROM pg_policy WHERE polrelid = v_tbl;
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'Revertido S-3: hay % políticas (se esperaban 2)', v_count;
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
            RAISE EXCEPTION 'Revertido S-3: la política "%" restaurada no tiene la estructura esperada', r.nombre;
        END IF;

        IF v_text IS NULL
           OR regexp_replace(regexp_replace(v_text,  '\mpublic\.', '', 'g'), '\s+', '', 'g')
              IS DISTINCT FROM
              regexp_replace(regexp_replace(r.expr,  '\mpublic\.', '', 'g'), '\s+', '', 'g') THEN
            RAISE EXCEPTION 'Revertido S-3: la expresión restaurada de "%" no coincide: %', r.nombre, v_text;
        END IF;

        PERFORM 1 FROM pg_depend d
         WHERE d.classid    = 'pg_policy'::regclass
           AND d.objid      = v_pol
           AND d.refclassid = 'pg_class'::regclass
           AND d.refobjid   = v_usr;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Revertido S-3: la política "%" no depende de public.usuarios', r.nombre;
        END IF;

        SELECT count(DISTINCT d.refobjid), bool_and(d.refobjid = v_uid)
          INTO v_count, v_ok
          FROM pg_depend d
         WHERE d.classid    = 'pg_policy'::regclass
           AND d.objid      = v_pol
           AND d.refclassid = 'pg_proc'::regclass;
        IF v_count <> 1 OR v_ok IS NOT TRUE THEN
            RAISE EXCEPTION 'Revertido S-3: la política "%" no depende exclusivamente de auth.uid()', r.nombre;
        END IF;
    END LOOP;
END
$post$;

COMMIT;
