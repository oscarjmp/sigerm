-- =====================================================================
-- SIGERM-SEC-DB-02 — 03 ROL MATRIMONIO: VÍNCULO Y POLÍTICAS PROPIAS
-- *** BORRADOR DE DISEÑO — NO EJECUTAR ***
--
-- Bloqueado hasta que se resuelva:
--   D-1 Crear el rol "Matrimonio" en public.roles (escritura de datos,
--       autorización aparte). Este script aborta si no existe.
--   D-2 Aprobar el vínculo cuenta ↔ matrimonio. matrimonios.usuario_id
--       registra QUIÉN CREÓ el registro, no al titular; por eso se
--       propone una tabla nueva en lugar de reutilizar esa columna.
--   D-3 Decidir qué encuentros ve un Matrimonio (aquí: solo aquellos en
--       los que participa).
--   D-4 equipos_servicio: no hay política propia hasta conocer qué
--       columna lo relaciona con un matrimonio (DATA-CONTRACT).
--   D-5 Aplicación: añadir "Matrimonio" a ROLES / TODOS_LOS_ROLES y a
--       PERMISOS_POR_ROL; sin eso requerirPermiso lo envía a /sin-acceso.
-- Requiere sec_db02_01 aplicado (políticas *_admin de los módulos).
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Abortado P-1: debe ejecutarse como postgres (actual: %)', current_user;
    END IF;
    IF (SELECT count(*) FROM public.roles WHERE nombre = 'Matrimonio') <> 1 THEN
        RAISE EXCEPTION 'Abortado P-2: el rol Matrimonio no existe o está duplicado (D-1)';
    END IF;
    IF (SELECT format_type(a.atttypid, NULL) FROM pg_attribute a
         WHERE a.attrelid = 'public.usuarios'::regclass AND a.attname = 'id') IS DISTINCT FROM 'uuid'
       OR (SELECT format_type(a.atttypid, NULL) FROM pg_attribute a
            WHERE a.attrelid = 'public.matrimonios'::regclass AND a.attname = 'id') IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION 'Abortado P-3: usuarios.id o matrimonios.id no son uuid';
    END IF;
    IF to_regclass('public.usuario_matrimonio') IS NOT NULL
       OR to_regprocedure('public.matrimonio_actual_id()') IS NOT NULL THEN
        RAISE EXCEPTION 'Abortado P-4: usuario_matrimonio o matrimonio_actual_id() ya existen';
    END IF;
    IF (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.encuentros'::regclass) <> 3 THEN
        RAISE EXCEPTION 'Abortado P-5: sec_db02_01 no está aplicado';
    END IF;
END
$pre$;

-- Vínculo 1:1 entre cuenta y matrimonio. Sin cascadas.
CREATE TABLE public.usuario_matrimonio (
    usuario_id    uuid        PRIMARY KEY REFERENCES public.usuarios (id)    ON DELETE RESTRICT,
    matrimonio_id uuid        NOT NULL UNIQUE REFERENCES public.matrimonios (id) ON DELETE RESTRICT,
    created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usuario_matrimonio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.usuario_matrimonio FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.usuario_matrimonio TO authenticated;

-- Matrimonio de la cuenta actual (solo cuentas activas con rol Matrimonio)
CREATE FUNCTION public.matrimonio_actual_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT um.matrimonio_id
      FROM public.usuario_matrimonio um
      JOIN public.usuarios u ON u.id = um.usuario_id
      JOIN public.roles    r ON r.id = u.rol_id
     WHERE u.auth_id = (SELECT auth.uid())
       AND u.activo IS TRUE
       AND r.nombre = 'Matrimonio'
$$;
REVOKE ALL ON FUNCTION public.matrimonio_actual_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matrimonio_actual_id() TO authenticated;

-- Vínculo: el Administrador gestiona; cada cuenta ve solo el suyo
CREATE POLICY usuario_matrimonio_select ON public.usuario_matrimonio
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (
        (SELECT public.rol_actual_en(ARRAY['Administrador']::text[]))
        OR usuario_id = (SELECT u.id FROM public.usuarios u
                          WHERE u.auth_id = (SELECT auth.uid()) AND u.activo IS TRUE)
    );
CREATE POLICY usuario_matrimonio_insert_admin ON public.usuario_matrimonio
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));
CREATE POLICY usuario_matrimonio_update_admin ON public.usuario_matrimonio
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING      ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])))
    WITH CHECK ((SELECT public.rol_actual_en(ARRAY['Administrador']::text[])));

-- Lectura propia (se suman a las políticas existentes; no amplían a terceros)
CREATE POLICY matrimonios_select_propio ON public.matrimonios
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (id = (SELECT public.matrimonio_actual_id()));

CREATE POLICY participantes_select_propio ON public.participantes
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (matrimonio_id = (SELECT public.matrimonio_actual_id()));

CREATE POLICY encuentros_select_propio ON public.encuentros
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.participantes pa
                    WHERE pa.encuentro_id = encuentros.id
                      AND pa.matrimonio_id = (SELECT public.matrimonio_actual_id())));

-- equipos_servicio: pendiente (D-4)

COMMIT;
