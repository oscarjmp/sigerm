-- =====================================================================
-- SIGERM MACRO 1 — VERIFICACIÓN POSTERIOR (SOLO LECTURA)
-- No escribe datos. Las simulaciones por rol se ejecutan dentro de una
-- transacción que termina en ROLLBACK.
-- =====================================================================

-- V-1 Políticas resultantes por tabla (public y storage)
SELECT schemaname, tablename, policyname, cmd, roles::text, qual, with_check
  FROM pg_policies
 WHERE (schemaname = 'public'  AND tablename IN ('prestamos', 'detalle_prestamo', 'ministerios', 'movimientos'))
    OR (schemaname = 'storage' AND tablename = 'objects')
 ORDER BY schemaname, tablename, cmd, policyname;
-- Esperado:
--   prestamos:        prestamos_select_autorizados (SELECT)
--   detalle_prestamo: detalle_prestamo_select_autorizados (SELECT)
--   ministerios:      ministerios_select_perfil_activo, ministerios_insert_gestion, ministerios_update_gestion
--   movimientos:      "Administrador y Coordinador consultan movimientos" (SELECT)   ← Y.2
--   storage.objects:  2 SELECT públicas + matrimonios_fotos_insert_gestion
--                     + articulos_imagenes_{insert,update,delete}_admin
--                     En producción, creadas desde el Dashboard, llevan
--                     sufijo: "... 1o9u66w_0" (matrimonios) y "... 99a5fc_0"
--                     (articulos); validar por operación, rol y expresión.

-- V-2 Matriz de privilegios efectivos (anon / authenticated)
SELECT c.relname,
       has_table_privilege('anon',          c.oid, 'SELECT') AS anon_sel,
       has_table_privilege('anon',          c.oid, 'INSERT') AS anon_ins,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_sel,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS auth_ins,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS auth_upd,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS auth_del,
       has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS auth_trunc
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;
-- Esperado: anon_* = false en todas; auth_trunc = false en todas;
--   prestamos, detalle_prestamo, movimientos: solo auth_sel.

-- V-3 Funciones: EXECUTE por rol
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
 ORDER BY 1;
-- Esperado: anon_exec = false en todas; auth_exec = true en
--   registrar_prestamo, devolver_prestamo, rol_actual_en,
--   es_administrador_actual, generar_codigo_articulo, asignar_usuario_movimiento.

-- V-4 Kardex (Y.2): 17 concesiones y huellas de las RPC intactas
SELECT (SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a
         WHERE c.oid = 'public.movimientos'::regclass) AS concesiones_movimientos,   -- 17
       md5(pg_get_functiondef('public.registrar_prestamo(jsonb)'::regprocedure))  AS md5_registrar,  -- f7556fef91f9cecd64cf7b43efb0de41
       md5(pg_get_functiondef('public.devolver_prestamo(uuid)'::regprocedure))    AS md5_devolver;   -- 17f43cf494767268d94cb07f9ba2cd9b

-- V-5 Integridad de datos: conteos sin cambios respecto al 18-nov-2026
SELECT (SELECT count(*) FROM public.articulos)        AS articulos,        -- 115
       (SELECT count(*) FROM public.movimientos)      AS movimientos,      -- 10
       (SELECT count(*) FROM public.prestamos)        AS prestamos,        -- 11
       (SELECT count(*) FROM public.detalle_prestamo) AS detalle,          -- 13
       (SELECT count(*) FROM public.matrimonios)      AS matrimonios,      -- 31
       (SELECT count(*) FROM public.ministerios)      AS ministerios,      -- 14
       (SELECT count(*) FROM public.usuarios)         AS usuarios;         -- 3

-- V-6 Simulación de lectura por rol (sin escrituras; termina en ROLLBACK).
--     Repetir sustituyendo :auth_id por el auth_id de un usuario activo de
--     cada rol (Administrador, Inventario, Coordinador).
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
                  json_build_object('sub', ':auth_id', 'role', 'authenticated')::text,
                  true);
SELECT (SELECT count(*) FROM public.prestamos)        AS prestamos_visibles,
       (SELECT count(*) FROM public.detalle_prestamo) AS detalle_visible,
       (SELECT count(*) FROM public.movimientos)      AS kardex_visible,
       (SELECT count(*) FROM public.ministerios)      AS ministerios_visibles;
-- Esperado:
--   Administrador: 11 / 13 / 10 / 14
--   Inventario:    11 / 13 /  0 / 14   (todos los préstamos; sin Kardex)
--   Coordinador:   solo los propios / su detalle / 10 / 14
ROLLBACK;
