-- =====================================================================
-- SIGERM-SEC-DB-02 — REVERSIÓN DE 01 (PRIVILEGIOS Y RLS DE MÓDULOS)
-- Versión 2 (SEC-DB-04). VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
--
-- Uso: pegar en el marcador la salida COMPLETA de
-- sec_db02_00_instantanea.sql obtenida ANTES de aplicar el bloque 01.
-- Revertir este bloque ANTES que cualquier script de MACRO 1.
--
-- Qué hace (una única transacción):
--   R-1 Comprueba que la instantánea está completa (fila "fin").
--   R-2 Comprueba que el bloque 01 está aplicado (16 políticas).
--   1. Retira las 16 políticas del bloque 01.
--   2. Para cada tabla, vista, secuencia, columna con permisos propios y
--      función de la instantánea: retira TODAS las concesiones actuales a
--      roles distintos del propietario y vuelve a conceder exactamente las
--      guardadas, incluido WITH GRANT OPTION.
--   3. Restaura los privilegios predeterminados de postgres en public.
--   4. Verifica, objeto por objeto, que el conjunto (rol, privilegio,
--      opción de concesión) coincide con la instantánea.
--
-- Límites documentados (equivalencia, no identidad byte a byte):
--   - El concedente registrado será postgres. Si una concesión original la
--     hizo otro rol con GRANT OPTION, su REVOKE no la alcanza y la
--     verificación lo detecta y revierte todo.
--   - Un ACL que era NULL (privilegios por defecto) queda escrito de forma
--     explícita con el mismo contenido efectivo.
--   - Los objetos creados después de la instantánea no se tocan; los
--     eliminados hacen abortar la reversión.
--   - Los privilegios predeterminados globales (defg) no los modifica el
--     bloque 01; aquí solo se comparan e informan.
--   - Usa objetos temporales de sesión (tabla y dos funciones en pg_temp)
--     que desaparecen al terminar; no guarda datos de la base.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path       = pg_catalog, public;

CREATE TEMP TABLE sigerm_instantanea (
    tipo    text NOT NULL,
    objeto  text,
    columna text,
    acl     text
) ON COMMIT DROP;

INSERT INTO sigerm_instantanea (tipo, objeto, columna, acl) VALUES
-- >>> PEGAR AQUÍ, SIN MODIFICAR, TODAS LAS LÍNEAS DE sec_db02_00_instantanea.sql <<<
;

CREATE FUNCTION pg_temp.sigerm_acl_set(p_acl aclitem[], p_owner oid)
RETURNS text
LANGUAGE sql
STABLE
AS $f$
    SELECT coalesce(string_agg(x, ',' ORDER BY x COLLATE "C"), '')
      FROM (SELECT DISTINCT a.grantee::text || '=' || a.privilege_type
                            || CASE WHEN a.is_grantable THEN '*' ELSE '' END AS x
              FROM aclexplode(p_acl) a
             WHERE a.grantee <> p_owner) s
$f$;

CREATE FUNCTION pg_temp.sigerm_rol(p_rol oid)
RETURNS text
LANGUAGE sql
STABLE
AS $f$
    SELECT CASE WHEN p_rol = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(p_rol)) END
$f$;

DO $pre$
DECLARE
    v_esperado integer;
    v_n        integer;
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado R-0: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

    SELECT acl::integer INTO v_esperado FROM sigerm_instantanea WHERE tipo = 'fin';
    SELECT count(*) INTO v_n FROM sigerm_instantanea WHERE tipo <> 'fin';
    IF v_esperado IS NULL OR v_n <> v_esperado THEN
        RAISE EXCEPTION 'Abortado R-1: instantánea incompleta (% entradas, se esperaban %)', v_n, v_esperado;
    END IF;

    SELECT count(*) INTO v_n
      FROM pg_policy p
     WHERE p.polrelid IN ('public.encuentros'::regclass, 'public.participantes'::regclass,
                          'public.equipos_servicio'::regclass, 'public.comisiones'::regclass,
                          'public.configuracion'::regclass, 'public.auditoria'::regclass);
    IF v_n <> 16 THEN
        RAISE EXCEPTION 'Abortado R-2: se esperaban las 16 políticas del bloque 01 (hay %)', v_n;
    END IF;
END
$pre$;

-- 1. Políticas del bloque 01
DROP POLICY encuentros_select_admin       ON public.encuentros;
DROP POLICY encuentros_insert_admin       ON public.encuentros;
DROP POLICY encuentros_update_admin       ON public.encuentros;
DROP POLICY participantes_select_admin    ON public.participantes;
DROP POLICY participantes_insert_admin    ON public.participantes;
DROP POLICY participantes_update_admin    ON public.participantes;
DROP POLICY equipos_servicio_select_admin ON public.equipos_servicio;
DROP POLICY equipos_servicio_insert_admin ON public.equipos_servicio;
DROP POLICY equipos_servicio_update_admin ON public.equipos_servicio;
DROP POLICY comisiones_select_admin       ON public.comisiones;
DROP POLICY comisiones_insert_admin       ON public.comisiones;
DROP POLICY comisiones_update_admin       ON public.comisiones;
DROP POLICY configuracion_select_admin    ON public.configuracion;
DROP POLICY configuracion_insert_admin    ON public.configuracion;
DROP POLICY configuracion_update_admin    ON public.configuracion;
DROP POLICY auditoria_select_admin        ON public.auditoria;

-- 2 a 4. Privilegios
DO $restaurar$
DECLARE
    r          record;
    g          record;
    v_rel      regclass;
    v_fun      regprocedure;
    v_owner    oid;
    v_kw       text;
    v_def      "char";
    v_prefijo  text;
    v_kwdef    text;
    v_guardada aclitem[];
    v_actual   aclitem[];
BEGIN
    -- 2a. Tablas, vistas y secuencias
    FOR r IN SELECT * FROM sigerm_instantanea WHERE tipo = 'rel' ORDER BY objeto LOOP
        v_rel := to_regclass(r.objeto);
        IF v_rel IS NULL THEN
            RAISE EXCEPTION 'Abortado: ya no existe %', r.objeto;
        END IF;
        SELECT c.relowner,
               CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END,
               CASE WHEN c.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END
          INTO v_owner, v_kw, v_def
          FROM pg_class c WHERE c.oid = v_rel;
        v_guardada := coalesce(r.acl::aclitem[], acldefault(v_def, v_owner));

        FOR g IN SELECT DISTINCT a.grantee
                   FROM pg_class c, aclexplode(c.relacl) a
                  WHERE c.oid = v_rel AND a.grantee <> v_owner
        LOOP
            EXECUTE format('REVOKE ALL ON %s %s FROM %s CASCADE', v_kw, v_rel, pg_temp.sigerm_rol(g.grantee));
        END LOOP;
        FOR g IN SELECT DISTINCT a.grantee, a.privilege_type, a.is_grantable
                   FROM aclexplode(v_guardada) a
                  WHERE a.grantee <> v_owner
        LOOP
            EXECUTE format('GRANT %s ON %s %s TO %s%s', g.privilege_type, v_kw, v_rel,
                           pg_temp.sigerm_rol(g.grantee),
                           CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
        END LOOP;

        SELECT c.relacl INTO v_actual FROM pg_class c WHERE c.oid = v_rel;
        IF pg_temp.sigerm_acl_set(coalesce(v_actual, acldefault(v_def, v_owner)), v_owner)
           IS DISTINCT FROM pg_temp.sigerm_acl_set(v_guardada, v_owner) THEN
            RAISE EXCEPTION 'Revertido: la ACL de % no coincide con la instantánea', r.objeto;
        END IF;
    END LOOP;

    -- 2b. Columnas (las de la instantánea y las que hoy tienen permisos propios)
    FOR r IN
        SELECT DISTINCT u.objeto, u.columna
          FROM (SELECT objeto, columna FROM sigerm_instantanea WHERE tipo = 'col'
                UNION
                SELECT s.objeto, a.attname::text
                  FROM sigerm_instantanea s
                  JOIN pg_attribute a ON a.attrelid = to_regclass(s.objeto)
                                     AND a.attnum > 0 AND NOT a.attisdropped
                 WHERE s.tipo = 'rel' AND a.attacl IS NOT NULL) u
         ORDER BY u.objeto, u.columna
    LOOP
        v_rel := to_regclass(r.objeto);
        SELECT c.relowner INTO v_owner FROM pg_class c WHERE c.oid = v_rel;
        SELECT a.attacl INTO v_actual
          FROM pg_attribute a
         WHERE a.attrelid = v_rel AND a.attname = r.columna AND NOT a.attisdropped;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Abortado: ya no existe la columna %.%', r.objeto, r.columna;
        END IF;
        SELECT s.acl::aclitem[] INTO v_guardada
          FROM sigerm_instantanea s
         WHERE s.tipo = 'col' AND s.objeto = r.objeto AND s.columna = r.columna;

        FOR g IN SELECT DISTINCT a.grantee FROM aclexplode(v_actual) a WHERE a.grantee <> v_owner LOOP
            EXECUTE format('REVOKE ALL (%I) ON TABLE %s FROM %s CASCADE', r.columna, v_rel,
                           pg_temp.sigerm_rol(g.grantee));
        END LOOP;
        FOR g IN SELECT DISTINCT a.grantee, a.privilege_type, a.is_grantable
                   FROM aclexplode(v_guardada) a
                  WHERE a.grantee <> v_owner
        LOOP
            EXECUTE format('GRANT %s (%I) ON TABLE %s TO %s%s', g.privilege_type, r.columna, v_rel,
                           pg_temp.sigerm_rol(g.grantee),
                           CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
        END LOOP;

        SELECT a.attacl INTO v_actual
          FROM pg_attribute a WHERE a.attrelid = v_rel AND a.attname = r.columna;
        IF pg_temp.sigerm_acl_set(v_actual, v_owner) IS DISTINCT FROM pg_temp.sigerm_acl_set(v_guardada, v_owner) THEN
            RAISE EXCEPTION 'Revertido: la ACL de la columna %.% no coincide con la instantánea', r.objeto, r.columna;
        END IF;
    END LOOP;

    -- 2c. Funciones y procedimientos
    FOR r IN SELECT * FROM sigerm_instantanea WHERE tipo = 'fun' ORDER BY objeto LOOP
        v_fun := to_regprocedure(r.objeto);
        IF v_fun IS NULL THEN
            RAISE EXCEPTION 'Abortado: ya no existe %', r.objeto;
        END IF;
        SELECT p.proowner INTO v_owner FROM pg_proc p WHERE p.oid = v_fun;
        v_guardada := coalesce(r.acl::aclitem[], acldefault('f', v_owner));

        FOR g IN SELECT DISTINCT a.grantee
                   FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                  WHERE p.oid = v_fun AND a.grantee <> v_owner
        LOOP
            EXECUTE format('REVOKE ALL ON %s %s FROM %s CASCADE', r.columna, v_fun, pg_temp.sigerm_rol(g.grantee));
        END LOOP;
        FOR g IN SELECT DISTINCT a.grantee, a.is_grantable
                   FROM aclexplode(v_guardada) a
                  WHERE a.grantee <> v_owner AND a.privilege_type = 'EXECUTE'
        LOOP
            EXECUTE format('GRANT EXECUTE ON %s %s TO %s%s', r.columna, v_fun, pg_temp.sigerm_rol(g.grantee),
                           CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
        END LOOP;

        SELECT p.proacl INTO v_actual FROM pg_proc p WHERE p.oid = v_fun;
        IF pg_temp.sigerm_acl_set(coalesce(v_actual, acldefault('f', v_owner)), v_owner)
           IS DISTINCT FROM pg_temp.sigerm_acl_set(v_guardada, v_owner) THEN
            RAISE EXCEPTION 'Revertido: la ACL de % no coincide con la instantánea', r.objeto;
        END IF;
    END LOOP;

    -- 3. Privilegios predeterminados de postgres
    FOR r IN SELECT * FROM sigerm_instantanea WHERE tipo IN ('def', 'defg') ORDER BY tipo, objeto LOOP
        v_kwdef := CASE r.objeto WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES'
                                 WHEN 'f' THEN 'FUNCTIONS' WHEN 'T' THEN 'TYPES' END;
        v_guardada := r.acl::aclitem[];
        v_actual := NULL;
        SELECT d.defaclacl INTO v_actual
          FROM pg_default_acl d
         WHERE d.defaclrole = 'postgres'::regrole
           AND d.defaclnamespace = CASE WHEN r.tipo = 'def' THEN 'public'::regnamespace::oid ELSE 0::oid END
           AND d.defaclobjtype::text = r.objeto;

        IF r.tipo = 'defg' THEN
            IF v_actual IS DISTINCT FROM v_guardada THEN
                RAISE NOTICE 'Privilegios predeterminados globales de postgres (%) cambiaron fuera del bloque 01; no se modifican', v_kwdef;
            END IF;
            CONTINUE;
        END IF;

        v_prefijo := 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public';
        FOR g IN SELECT DISTINCT a.grantee FROM aclexplode(v_actual) a
                  WHERE a.grantee <> 'postgres'::regrole::oid
        LOOP
            EXECUTE format('%s REVOKE ALL ON %s FROM %s CASCADE', v_prefijo, v_kwdef, pg_temp.sigerm_rol(g.grantee));
        END LOOP;
        FOR g IN SELECT DISTINCT a.grantee, a.privilege_type, a.is_grantable FROM aclexplode(v_guardada) a
                  WHERE a.grantee <> 'postgres'::regrole::oid
        LOOP
            EXECUTE format('%s GRANT %s ON %s TO %s%s', v_prefijo, g.privilege_type, v_kwdef,
                           pg_temp.sigerm_rol(g.grantee),
                           CASE WHEN g.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
        END LOOP;

        v_actual := NULL;
        SELECT d.defaclacl INTO v_actual
          FROM pg_default_acl d
         WHERE d.defaclrole = 'postgres'::regrole
           AND d.defaclnamespace = 'public'::regnamespace
           AND d.defaclobjtype::text = r.objeto;
        IF pg_temp.sigerm_acl_set(v_actual, 'postgres'::regrole)
           IS DISTINCT FROM pg_temp.sigerm_acl_set(v_guardada, 'postgres'::regrole) THEN
            RAISE EXCEPTION 'Revertido: los privilegios predeterminados de % no coinciden con la instantánea', v_kwdef;
        END IF;
    END LOOP;
END
$restaurar$;

COMMIT;
