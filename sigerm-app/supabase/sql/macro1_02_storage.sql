-- =====================================================================
-- SIGERM MACRO 1 — 02 STORAGE: S1 (bucket matrimonios), S2 (bucket articulos)
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Una única transacción. No borra ni mueve archivos: solo políticas.
--
-- PROPIETARIO: storage.objects pertenece a supabase_storage_admin y
-- postgres NO es miembro de ese rol (verificado 18-nov-2026). Si P-1
-- aborta por falta de privilegios, no se aplica ningún cambio y S1/S2
-- deben configurarse desde Dashboard > Storage > Policies con las
-- mismas reglas descritas abajo.
--
-- Cargas legítimas verificadas en el código:
--   lib/storage/imagenes.ts y ArticuloForm.tsx usan upload() simple
--   (sin upsert) con nombre único → basta la política INSERT.
--   Las URL públicas (getPublicUrl) no dependen de políticas SELECT
--   porque ambos buckets son públicos; las SELECT existentes se conservan.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
DECLARE
    v_text text;
BEGIN
    -- P-1 Capacidad para administrar políticas de storage.objects
    IF NOT pg_has_role(current_user,
                       (SELECT c.relowner FROM pg_class c WHERE c.oid = 'storage.objects'::regclass),
                       'USAGE') THEN
        RAISE EXCEPTION 'Abortado P-1: % no puede administrar políticas de storage.objects (propietario %). Aplicar S1/S2 desde Dashboard > Storage > Policies.',
            current_user,
            (SELECT pg_get_userbyid(c.relowner) FROM pg_class c WHERE c.oid = 'storage.objects'::regclass);
    END IF;

    -- P-2 Políticas exactas auditadas
    SELECT string_agg(p.polname || ':' || p.polcmd::text, ' | ' ORDER BY p.polname)
      INTO v_text
      FROM pg_policy p
     WHERE p.polrelid = 'storage.objects'::regclass;
    IF v_text IS DISTINCT FROM
       'Permitir actualizar imágenes:w | Permitir borrar imágenes:d | Permitir subir fotografías 1o9u66w_0:a | Permitir subir imágenes:a | Permitir ver fotografías 1o9u66w_0:r | Permitir ver imágenes:r' THEN
        RAISE EXCEPTION 'Abortado P-2: políticas de storage.objects = "%"', v_text;
    END IF;

    -- P-3 Buckets esperados
    SELECT string_agg(b.id || ':' || b.public::text, ',' ORDER BY b.id) INTO v_text FROM storage.buckets b;
    IF v_text IS DISTINCT FROM 'articulos:true,matrimonios:true' THEN
        RAISE EXCEPTION 'Abortado P-3: buckets = "%"', v_text;
    END IF;

    -- P-4 authenticated puede ejecutar rol_actual_en
    IF has_function_privilege('authenticated', 'public.rol_actual_en(text[])', 'EXECUTE') IS NOT TRUE THEN
        RAISE EXCEPTION 'Abortado P-4: authenticated no puede ejecutar rol_actual_en(text[])';
    END IF;
END
$pre$;

-- ---------------------------------------------------------------------
-- S1 — Fotografías de matrimonios: retirar la subida pública (anónima).
--      Subida solo para Administrador, Coordinador y Secretaría
--      (los roles con CREAR/EDITAR_MATRIMONIO). La lectura pública se
--      conserva (riesgo pendiente documentado).
-- ---------------------------------------------------------------------
DROP POLICY "Permitir subir fotografías 1o9u66w_0" ON storage.objects;

CREATE POLICY matrimonios_fotos_insert_gestion
    ON storage.objects
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'matrimonios'
        AND (SELECT public.rol_actual_en(ARRAY['Administrador', 'Coordinador', 'Secretaría']::text[]))
    );

-- ---------------------------------------------------------------------
-- S2 — Imágenes de artículos: subir, reemplazar y borrar solo
--      Administrador (mismo criterio que la RLS de public.articulos).
-- ---------------------------------------------------------------------
DROP POLICY "Permitir subir imágenes"      ON storage.objects;
DROP POLICY "Permitir actualizar imágenes" ON storage.objects;
DROP POLICY "Permitir borrar imágenes"     ON storage.objects;

CREATE POLICY articulos_imagenes_insert_admin
    ON storage.objects
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'articulos'
        AND (SELECT public.rol_actual_en(ARRAY['Administrador']::text[]))
    );

CREATE POLICY articulos_imagenes_update_admin
    ON storage.objects
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (
        bucket_id = 'articulos'
        AND (SELECT public.rol_actual_en(ARRAY['Administrador']::text[]))
    )
    WITH CHECK (
        bucket_id = 'articulos'
        AND (SELECT public.rol_actual_en(ARRAY['Administrador']::text[]))
    );

CREATE POLICY articulos_imagenes_delete_admin
    ON storage.objects
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (
        bucket_id = 'articulos'
        AND (SELECT public.rol_actual_en(ARRAY['Administrador']::text[]))
    );

-- ---------------------------------------------------------------------
-- COMPROBACIONES POSTERIORES
-- ---------------------------------------------------------------------
DO $post$
DECLARE
    v_text text;
BEGIN
    SELECT string_agg(p.polname || ':' || p.polcmd::text || ':' ||
                      array_to_string(ARRAY(SELECT r::regrole::text FROM unnest(p.polroles) r), '+'),
                      ' | ' ORDER BY p.polname)
      INTO v_text
      FROM pg_policy p
     WHERE p.polrelid = 'storage.objects'::regclass;

    IF v_text IS DISTINCT FROM
       'Permitir ver fotografías 1o9u66w_0:r:- | Permitir ver imágenes:r:- | articulos_imagenes_delete_admin:d:authenticated | articulos_imagenes_insert_admin:a:authenticated | articulos_imagenes_update_admin:w:authenticated | matrimonios_fotos_insert_gestion:a:authenticated' THEN
        RAISE EXCEPTION 'Revertido Q-1: políticas resultantes = "%"', v_text;
    END IF;

    -- Q-2 Ninguna política de escritura para PUBLIC/anon
    PERFORM 1 FROM pg_policy p
     WHERE p.polrelid = 'storage.objects'::regclass
       AND p.polcmd <> 'r'
       AND (0::oid = ANY (p.polroles) OR 'anon'::regrole::oid = ANY (p.polroles));
    IF FOUND THEN
        RAISE EXCEPTION 'Revertido Q-2: persiste una política de escritura pública';
    END IF;
END
$post$;

COMMIT;
