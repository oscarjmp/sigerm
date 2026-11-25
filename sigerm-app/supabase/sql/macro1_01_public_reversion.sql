-- =====================================================================
-- SIGERM MACRO 1 — REVERSIÓN DE 01 PUBLIC (S4, S5, S6, S7)
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Restaura exactamente el estado auditado el 18-nov-2026.
-- ADVERTENCIA: reabre R3, R4, R6 y R7.
-- Solo se aplica si el estado actual es exactamente el resultante de 01.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

LOCK TABLE public.prestamos, public.detalle_prestamo, public.ministerios
    IN ACCESS EXCLUSIVE MODE;

DO $pre$
DECLARE
    r      record;
    v_text text;
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado R-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;

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
         WHERE p.polrelid = ('public.' || r.tabla)::regclass;
        IF v_text IS DISTINCT FROM r.esperado THEN
            RAISE EXCEPTION 'Abortado R-2: políticas de % = "%" (se esperaba el estado de MACRO 1)', r.tabla, v_text;
        END IF;
    END LOOP;
END
$pre$;

-- Políticas de MACRO 1
DROP POLICY prestamos_select_autorizados        ON public.prestamos;
DROP POLICY detalle_prestamo_select_autorizados ON public.detalle_prestamo;
DROP POLICY ministerios_select_perfil_activo    ON public.ministerios;
DROP POLICY ministerios_insert_gestion          ON public.ministerios;
DROP POLICY ministerios_update_gestion          ON public.ministerios;

-- Políticas originales (expresiones tal como estaban auditadas)
CREATE POLICY prestamos_select ON public.prestamos
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (es_administrador_actual() OR (usuario_id = (SELECT u.id FROM usuarios u
           WHERE ((u.auth_id = auth.uid()) AND (u.activo = true)) LIMIT 1)));
CREATE POLICY prestamos_insert ON public.prestamos
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (usuario_id = (SELECT u.id FROM usuarios u
           WHERE ((u.auth_id = auth.uid()) AND (u.activo = true)) LIMIT 1));
CREATE POLICY prestamos_update ON public.prestamos
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (es_administrador_actual() OR (usuario_id = (SELECT u.id FROM usuarios u
           WHERE ((u.auth_id = auth.uid()) AND (u.activo = true)) LIMIT 1)))
    WITH CHECK (es_administrador_actual() OR (usuario_id = (SELECT u.id FROM usuarios u
           WHERE ((u.auth_id = auth.uid()) AND (u.activo = true)) LIMIT 1)));
CREATE POLICY prestamos_delete ON public.prestamos
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (es_administrador_actual());

CREATE POLICY detalle_select ON public.detalle_prestamo AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY detalle_insert ON public.detalle_prestamo AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY detalle_update ON public.detalle_prestamo AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY detalle_delete ON public.detalle_prestamo AS PERMISSIVE FOR DELETE TO authenticated USING (true);

CREATE POLICY "Permitir lectura ministerios"    ON public.ministerios AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insertar ministerios"   ON public.ministerios AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualizar ministerios" ON public.ministerios AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir eliminar ministerios"   ON public.ministerios AS PERMISSIVE FOR DELETE TO authenticated USING (true);

-- Privilegios originales
GRANT ALL ON TABLE public.prestamos, public.detalle_prestamo, public.ministerios,
                   public.comisiones, public.encuentros, public.permisos, public.rol_permisos
    TO anon;
GRANT ALL ON TABLE public.prestamos, public.detalle_prestamo, public.ministerios,
                   public.auditoria, public.comisiones, public.configuracion,
                   public.encuentros, public.equipos_servicio, public.participantes,
                   public.permisos, public.rol_permisos
    TO authenticated;
GRANT SELECT, INSERT, UPDATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.matrimonios TO authenticated;

GRANT ALL ON SEQUENCE public.prestamos_folio_seq   TO anon, authenticated;
GRANT ALL ON SEQUENCE public.encuentros_numero_seq TO anon;

GRANT EXECUTE ON FUNCTION public.asignar_usuario_movimiento() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_administrador_actual()    TO PUBLIC, anon;

-- Verificación: ACL idénticas a las auditadas
DO $post$
DECLARE
    r      record;
    v_text text;
BEGIN
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
        -- Comparación como conjunto (grantee=privilegio): tras GRANT el
        -- orden de los elementos del ACL puede variar.
        IF (SELECT string_agg(x, ',' ORDER BY x)
              FROM (SELECT a.grantee::regrole::text || '=' || a.privilege_type AS x
                      FROM pg_class c, aclexplode(c.relacl) a
                     WHERE c.oid = ('public.' || r.objeto)::regclass) s)
           IS DISTINCT FROM
           (SELECT string_agg(x, ',' ORDER BY x)
              FROM (SELECT a.grantee::regrole::text || '=' || a.privilege_type AS x
                      FROM aclexplode(r.acl::aclitem[]) a) s) THEN
            SELECT c.relacl::text INTO v_text FROM pg_class c WHERE c.oid = ('public.' || r.objeto)::regclass;
            RAISE EXCEPTION 'Revertido: ACL de % = % (se esperaba %)', r.objeto, v_text, r.acl;
        END IF;
    END LOOP;

    IF NOT has_function_privilege('anon', 'public.es_administrador_actual()', 'EXECUTE')
       OR NOT has_function_privilege('anon', 'public.asignar_usuario_movimiento()', 'EXECUTE') THEN
        RAISE EXCEPTION 'Revertido: no se restauró EXECUTE de funciones';
    END IF;

    SELECT string_agg(p.polname || ':' || p.polcmd::text, ',' ORDER BY p.polname COLLATE "C") INTO v_text
      FROM pg_policy p WHERE p.polrelid = 'public.prestamos'::regclass;
    IF v_text IS DISTINCT FROM 'prestamos_delete:d,prestamos_insert:a,prestamos_select:r,prestamos_update:w' THEN
        RAISE EXCEPTION 'Revertido: políticas de prestamos = %', v_text;
    END IF;
END
$post$;

COMMIT;
