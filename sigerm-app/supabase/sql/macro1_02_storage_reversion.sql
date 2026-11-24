-- =====================================================================
-- SIGERM MACRO 1 — REVERSIÓN DE 02 STORAGE (S1, S2)
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Restaura las políticas auditadas el 18-nov-2026.
-- ADVERTENCIA: reabre R1 (subida anónima al bucket matrimonios) y R5.
-- =====================================================================
BEGIN;

SET LOCAL lock_timeout      = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path       = pg_catalog, public;

DO $pre$
DECLARE
    v_text text;
BEGIN
    IF NOT pg_has_role(current_user,
                       (SELECT c.relowner FROM pg_class c WHERE c.oid = 'storage.objects'::regclass),
                       'USAGE') THEN
        RAISE EXCEPTION 'Abortado R-1: % no puede administrar políticas de storage.objects', current_user;
    END IF;

    SELECT string_agg(p.polname || ':' || p.polcmd::text, ' | ' ORDER BY p.polname)
      INTO v_text
      FROM pg_policy p
     WHERE p.polrelid = 'storage.objects'::regclass;
    IF v_text IS DISTINCT FROM
       'Permitir ver fotografías 1o9u66w_0:r | Permitir ver imágenes:r | articulos_imagenes_delete_admin:d | articulos_imagenes_insert_admin:a | articulos_imagenes_update_admin:w | matrimonios_fotos_insert_gestion:a' THEN
        RAISE EXCEPTION 'Abortado R-2: el estado no es el de MACRO 1: "%"', v_text;
    END IF;
END
$pre$;

DROP POLICY matrimonios_fotos_insert_gestion ON storage.objects;
DROP POLICY articulos_imagenes_insert_admin  ON storage.objects;
DROP POLICY articulos_imagenes_update_admin  ON storage.objects;
DROP POLICY articulos_imagenes_delete_admin  ON storage.objects;

CREATE POLICY "Permitir subir fotografías 1o9u66w_0" ON storage.objects
    AS PERMISSIVE FOR INSERT TO public
    WITH CHECK (bucket_id = 'matrimonios'::text);

CREATE POLICY "Permitir subir imágenes" ON storage.objects
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'articulos'::text);

CREATE POLICY "Permitir actualizar imágenes" ON storage.objects
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (bucket_id = 'articulos'::text)
    WITH CHECK (bucket_id = 'articulos'::text);

CREATE POLICY "Permitir borrar imágenes" ON storage.objects
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (bucket_id = 'articulos'::text);

DO $post$
DECLARE
    v_text text;
BEGIN
    SELECT string_agg(p.polname || ':' || p.polcmd::text, ' | ' ORDER BY p.polname)
      INTO v_text
      FROM pg_policy p
     WHERE p.polrelid = 'storage.objects'::regclass;
    IF v_text IS DISTINCT FROM
       'Permitir actualizar imágenes:w | Permitir borrar imágenes:d | Permitir subir fotografías 1o9u66w_0:a | Permitir subir imágenes:a | Permitir ver fotografías 1o9u66w_0:r | Permitir ver imágenes:r' THEN
        RAISE EXCEPTION 'Revertido: políticas resultantes = "%"', v_text;
    END IF;
END
$post$;

COMMIT;
