-- =====================================================================
-- SIGERM MACRO 1 — REVERSIÓN DE 02 STORAGE (S1, S2)
-- VERSIÓN PARA SOLICITAR AUTORIZACIÓN. NO EJECUTADA.
-- Restaura las políticas auditadas el 18-nov-2026.
-- ADVERTENCIA: reabre R1 (subida anónima al bucket matrimonios) y R5.
--
-- Versión 2 (MACRO-INTEGRATION-PUBLISH-01, 26-nov-2026): S1/S2 se
-- aplicaron en producción desde Dashboard > Storage > Policies, que
-- añadió sufijos a los nombres. R-2 y los DROP usan los nombres reales:
--   "matrimonios_fotos_insert_gestion 1o9u66w_0"
--   "articulos_imagenes_insert_admin 99a5fc_0"
--   "articulos_imagenes_update_admin 99a5fc_0"
--   "articulos_imagenes_delete_admin 99a5fc_0"
--
-- LIMITACIÓN DEL EJECUTOR: storage.objects pertenece a
-- supabase_storage_admin y postgres (SQL Editor) NO es miembro de ese
-- rol, por lo que R-1 aborta sin aplicar nada. En ese caso la reversión
-- se realiza desde Dashboard > Storage > Policies, en este orden:
--   1. Crear en el bucket matrimonios, INSERT, rol public (por defecto),
--      expresión: bucket_id = 'matrimonios'
--   2. Crear en el bucket articulos, para authenticated:
--      INSERT  WITH CHECK bucket_id = 'articulos'
--      UPDATE  USING      bucket_id = 'articulos'
--      DELETE  USING      bucket_id = 'articulos'
--   3. Eliminar las cuatro políticas con sufijo listadas arriba y las
--      SELECT auxiliares que el Dashboard añada (sufijo _1).
--   4. Verificar con el bloque $post$ (solo lectura) o con la sección 03
--      de sec_db01_v2_diagnostico.sql. Los nombres de las políticas
--      recreadas también recibirán sufijos; validar por operación, rol
--      y expresión.
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

    SELECT string_agg(p.polname || ':' || p.polcmd::text, ' | ' ORDER BY p.polname COLLATE "C")
      INTO v_text
      FROM pg_policy p
     WHERE p.polrelid = 'storage.objects'::regclass;
    IF v_text IS DISTINCT FROM
       'Permitir ver fotografías 1o9u66w_0:r | Permitir ver imágenes:r | articulos_imagenes_delete_admin 99a5fc_0:d | articulos_imagenes_insert_admin 99a5fc_0:a | articulos_imagenes_update_admin 99a5fc_0:w | matrimonios_fotos_insert_gestion 1o9u66w_0:a' THEN
        RAISE EXCEPTION 'Abortado R-2: el estado no es el de MACRO 1 en producción: "%"', v_text;
    END IF;
END
$pre$;

DROP POLICY "matrimonios_fotos_insert_gestion 1o9u66w_0" ON storage.objects;
DROP POLICY "articulos_imagenes_insert_admin 99a5fc_0"   ON storage.objects;
DROP POLICY "articulos_imagenes_update_admin 99a5fc_0"   ON storage.objects;
DROP POLICY "articulos_imagenes_delete_admin 99a5fc_0"   ON storage.objects;

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
    SELECT string_agg(p.polname || ':' || p.polcmd::text, ' | ' ORDER BY p.polname COLLATE "C")
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
