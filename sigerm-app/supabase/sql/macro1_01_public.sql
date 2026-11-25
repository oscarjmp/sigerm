-- =====================================================================
-- SIGERM MACRO 1 — 01 PUBLIC: S4, S5, S6, S7
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Ejecutar como postgres (SQL Editor de Supabase), en una única transacción.
-- No modifica ni borra registros: solo políticas RLS y privilegios.
-- No toca public.movimientos (lo endurece 186.30Y.2 sin cambios) ni la
-- definición de ninguna función (las huellas MD5 de Y.2 se conservan).
-- Cualquier RAISE EXCEPTION aborta la transacción completa.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

LOCK TABLE public.prestamos, public.detalle_prestamo, public.ministerios
    IN ACCESS EXCLUSIVE MODE;

-- ---------------------------------------------------------------------
-- COMPROBACIONES PREVIAS: estado auditado el 18-nov-2026
-- ---------------------------------------------------------------------
DO $pre$
DECLARE
    r       record;
    v_text  text;
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

    IF to_regprocedure('public.rol_actual_en(text[])') IS NULL
       OR has_function_privilege('authenticated', 'public.rol_actual_en(text[])', 'EXECUTE') IS NOT TRUE THEN
        RAISE EXCEPTION 'Abortado P-2: falta rol_actual_en(text[]) o authenticated no puede ejecutarla';
    END IF;

    -- P-3 Políticas exactas por tabla (nombre:comando)
    FOR r IN
        SELECT * FROM (VALUES
            ('prestamos',        'prestamos_delete:d,prestamos_insert:a,prestamos_select:r,prestamos_update:w'),
            ('detalle_prestamo', 'detalle_delete:d,detalle_insert:a,detalle_select:r,detalle_update:w'),
            ('ministerios',      'Permitir actualizar ministerios:w,Permitir eliminar ministerios:d,Permitir insertar ministerios:a,Permitir lectura ministerios:r')
        ) AS t(tabla, esperado)
    LOOP
        SELECT string_agg(p.polname || ':' || p.polcmd::text, ',' ORDER BY p.polname COLLATE "C")
          INTO v_text
          FROM pg_policy p
         WHERE p.polrelid = ('public.' || r.tabla)::regclass;
        IF v_text IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Abortado P-3: políticas de % = "%" (se esperaba "%")', r.tabla, v_text, r.esperado;
        END IF;
    END LOOP;

    -- P-4 ACL exactas auditadas
    FOR r IN
        SELECT * FROM (VALUES
            ('auditoria',             '{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('comisiones',            '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('configuracion',         '{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('detalle_prestamo',      '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('encuentros',            '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('encuentros_numero_seq', '{postgres=rwU/postgres,anon=rwU/postgres,authenticated=rwU/postgres,service_role=rwU/postgres}'),
            ('equipos_servicio',      '{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('matrimonios',           '{postgres=arwdDxtm/postgres,authenticated=arwxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('ministerios',           '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('participantes',         '{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('permisos',              '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('prestamos',             '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
            ('prestamos_folio_seq',   '{postgres=rwU/postgres,anon=rwU/postgres,authenticated=rwU/postgres,service_role=rwU/postgres}'),
            ('rol_permisos',          '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}')
        ) AS t(objeto, acl)
    LOOP
        SELECT c.relacl::text INTO v_text FROM pg_class c WHERE c.oid = ('public.' || r.objeto)::regclass;
        IF v_text IS DISTINCT FROM r.acl THEN
            RAISE EXCEPTION 'Abortado P-4: ACL de % = % (se esperaba %)', r.objeto, v_text, r.acl;
        END IF;
    END LOOP;

    -- P-5 Funciones con EXECUTE para PUBLIC y anon
    FOR r IN
        SELECT * FROM (VALUES
            ('public.asignar_usuario_movimiento()'),
            ('public.es_administrador_actual()')
        ) AS t(firma)
    LOOP
        SELECT p.proacl::text INTO v_text FROM pg_proc p WHERE p.oid = to_regprocedure(r.firma);
        IF v_text IS DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN
            RAISE EXCEPTION 'Abortado P-5: ACL de % = %', r.firma, v_text;
        END IF;
    END LOOP;

    -- P-6 Las RPC de préstamos siguen siendo SECURITY DEFINER de postgres
    PERFORM 1 FROM pg_proc p
     WHERE p.oid IN (to_regprocedure('public.registrar_prestamo(jsonb)'),
                     to_regprocedure('public.devolver_prestamo(uuid)'))
       AND p.prosecdef AND pg_get_userbyid(p.proowner) = 'postgres'
    HAVING count(*) = 2;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Abortado P-6: registrar_prestamo/devolver_prestamo no son SECURITY DEFINER de postgres';
    END IF;
END
$pre$;

-- ---------------------------------------------------------------------
-- S5 — PRÉSTAMOS: escritura solo mediante RPC; lectura Administrador,
--      Inventario (todos los préstamos, aprobado) y el propio registrante.
-- ---------------------------------------------------------------------
DROP POLICY prestamos_insert ON public.prestamos;
DROP POLICY prestamos_update ON public.prestamos;
DROP POLICY prestamos_delete ON public.prestamos;
DROP POLICY prestamos_select ON public.prestamos;

CREATE POLICY prestamos_select_autorizados
    ON public.prestamos
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (
        (SELECT public.rol_actual_en(ARRAY['Administrador', 'Inventario']::text[]))
        OR usuario_id = (
            SELECT u.id
              FROM public.usuarios u
             WHERE u.auth_id = (SELECT auth.uid())
               AND u.activo IS TRUE
        )
    );

REVOKE ALL ON TABLE public.prestamos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.prestamos FROM authenticated;

REVOKE ALL ON SEQUENCE public.prestamos_folio_seq FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- S4 — DETALLE DE PRÉSTAMOS: solo lectura, con la misma visibilidad que
--      el préstamo (la subconsulta aplica la RLS de public.prestamos).
-- ---------------------------------------------------------------------
DROP POLICY detalle_insert ON public.detalle_prestamo;
DROP POLICY detalle_update ON public.detalle_prestamo;
DROP POLICY detalle_delete ON public.detalle_prestamo;
DROP POLICY detalle_select ON public.detalle_prestamo;

CREATE POLICY detalle_prestamo_select_autorizados
    ON public.detalle_prestamo
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.prestamos p
             WHERE p.id = detalle_prestamo.prestamo_id
        )
    );

REVOKE ALL ON TABLE public.detalle_prestamo FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.detalle_prestamo FROM authenticated;

-- ---------------------------------------------------------------------
-- S6 — MINISTERIOS: lectura para perfiles activos; alta y edición para
--      Administrador, Coordinador y Secretaría; sin borrado.
-- ---------------------------------------------------------------------
DROP POLICY "Permitir lectura ministerios"    ON public.ministerios;
DROP POLICY "Permitir insertar ministerios"   ON public.ministerios;
DROP POLICY "Permitir actualizar ministerios" ON public.ministerios;
DROP POLICY "Permitir eliminar ministerios"   ON public.ministerios;

CREATE POLICY ministerios_select_perfil_activo
    ON public.ministerios
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.usuarios u
             WHERE u.auth_id = (SELECT auth.uid())
               AND u.activo IS TRUE
        )
    );

CREATE POLICY ministerios_insert_gestion
    ON public.ministerios
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador', 'Coordinador', 'Secretaría']::text[])));

CREATE POLICY ministerios_update_gestion
    ON public.ministerios
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador', 'Coordinador', 'Secretaría']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador', 'Coordinador', 'Secretaría']::text[])));

REVOKE ALL ON TABLE public.ministerios FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.ministerios FROM authenticated;

-- ---------------------------------------------------------------------
-- S7 — HIGIENE DE PRIVILEGIOS (excluye public.movimientos: lo trata Y.2)
-- ---------------------------------------------------------------------
REVOKE ALL ON TABLE public.comisiones, public.encuentros,
                    public.permisos,   public.rol_permisos
    FROM anon;
REVOKE ALL ON SEQUENCE public.encuentros_numero_seq FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.auditoria,  public.comisiones,       public.configuracion,
             public.encuentros, public.equipos_servicio, public.matrimonios,
             public.participantes, public.permisos,      public.rol_permisos
    FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.asignar_usuario_movimiento() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.es_administrador_actual()    FROM PUBLIC, anon;

-- ---------------------------------------------------------------------
-- COMPROBACIONES POSTERIORES (cualquier fallo revierte todo)
-- ---------------------------------------------------------------------
DO $post$
DECLARE
    r        record;
    v_actual boolean;
    v_text   text;
BEGIN
    -- Q-1 Matriz de privilegios efectivos
    FOR r IN
        SELECT t.tabla, ro.rol, pv.priv,
               CASE
                   WHEN ro.rol = 'anon' THEN false
                   WHEN t.tabla IN ('prestamos', 'detalle_prestamo') THEN pv.priv = 'SELECT'
                   WHEN t.tabla IN ('ministerios', 'matrimonios')   THEN pv.priv IN ('SELECT', 'INSERT', 'UPDATE')
                   ELSE pv.priv IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
               END AS esperado
          FROM (VALUES ('prestamos'), ('detalle_prestamo'), ('ministerios'), ('matrimonios'),
                       ('auditoria'), ('comisiones'), ('configuracion'), ('encuentros'),
                       ('equipos_servicio'), ('participantes'), ('permisos'), ('rol_permisos')) AS t(tabla)
         CROSS JOIN (VALUES ('anon'), ('authenticated')) AS ro(rol)
         CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                            ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) AS pv(priv)
    LOOP
        v_actual := has_table_privilege(r.rol, ('public.' || r.tabla)::regclass, r.priv);
        IF v_actual IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Revertido Q-1: % sobre % tiene %=% (se esperaba %)',
                            r.rol, r.tabla, r.priv, v_actual, r.esperado;
        END IF;
    END LOOP;

    -- Q-2 service_role y postgres conservan todos los privilegios
    --     (has_table_privilege con lista devuelve true si tiene CUALQUIERA;
    --      por eso se comprueba cada privilegio por separado)
    PERFORM 1
       FROM (VALUES ('public.prestamos'), ('public.detalle_prestamo'), ('public.ministerios')) AS t(tabla)
      CROSS JOIN (VALUES ('service_role'), ('postgres')) AS ro(rol)
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS pv(priv)
     WHERE NOT has_table_privilege(ro.rol, t.tabla::regclass, pv.priv);
    IF FOUND THEN
        RAISE EXCEPTION 'Revertido Q-2: service_role perdió privilegios';
    END IF;

    -- Q-3 Secuencia de folios: solo postgres y service_role
    IF has_sequence_privilege('authenticated', 'public.prestamos_folio_seq', 'USAGE,SELECT,UPDATE')
       OR has_sequence_privilege('anon', 'public.prestamos_folio_seq', 'USAGE,SELECT,UPDATE') THEN
        RAISE EXCEPTION 'Revertido Q-3: la secuencia de folios conserva privilegios de cliente';
    END IF;

    -- Q-4 Políticas resultantes exactas
    FOR r IN
        SELECT * FROM (VALUES
            ('prestamos',        'prestamos_select_autorizados:r'),
            ('detalle_prestamo', 'detalle_prestamo_select_autorizados:r'),
            ('ministerios',      'ministerios_insert_gestion:a,ministerios_select_perfil_activo:r,ministerios_update_gestion:w')
        ) AS t(tabla, esperado)
    LOOP
        SELECT string_agg(p.polname || ':' || p.polcmd::text, ',' ORDER BY p.polname COLLATE "C")
          INTO v_text
          FROM pg_policy p
         WHERE p.polrelid = ('public.' || r.tabla)::regclass
           AND p.polpermissive
           AND p.polroles = ARRAY['authenticated'::regrole]::oid[];
        IF v_text IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Revertido Q-4: políticas de % = "%" (se esperaba "%")', r.tabla, v_text, r.esperado;
        END IF;
    END LOOP;

    -- Q-5 Funciones: authenticated conserva EXECUTE; anon y PUBLIC no
    IF has_function_privilege('anon', 'public.es_administrador_actual()', 'EXECUTE')
       OR has_function_privilege('anon', 'public.asignar_usuario_movimiento()', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.es_administrador_actual()', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.registrar_prestamo(jsonb)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.devolver_prestamo(uuid)', 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.rol_actual_en(text[])', 'EXECUTE') THEN
        RAISE EXCEPTION 'Revertido Q-5: privilegios de funciones inesperados';
    END IF;

    -- Q-6 RLS sigue activa en las tablas tratadas
    PERFORM 1 FROM pg_class c
     WHERE c.oid IN ('public.prestamos'::regclass, 'public.detalle_prestamo'::regclass, 'public.ministerios'::regclass)
       AND NOT c.relrowsecurity;
    IF FOUND THEN
        RAISE EXCEPTION 'Revertido Q-6: RLS desactivada en alguna tabla';
    END IF;

    -- Q-7 public.movimientos intacto (precondición P-7 de Y.2: 32 concesiones)
    IF (SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a WHERE c.oid = 'public.movimientos'::regclass) <> 32 THEN
        RAISE EXCEPTION 'Revertido Q-7: se alteraron las concesiones de public.movimientos';
    END IF;
END
$post$;

COMMIT;
