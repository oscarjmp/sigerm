-- =====================================================================
-- SIGERM-SEC-DB-01 — DIAGNÓSTICO DE SEGURIDAD DE SUPABASE (SOLO LECTURA)
-- Versión 2 (SEC-DB-03): añade las secciones 19 a 21.
-- Versión 2.1 (SEC-DB-05): añade las secciones 22 a 25 (duplicados,
-- valores nulos, unicidad y capacidad de inscripciones; solo conteos).
-- Versión 2.2 (MACRO-SECURITY-FINAL): mensajes de las secciones 09 y 21
-- alineados con la instantánea v2 y con macro1_01 (sin cambios de consulta).
-- Versión 2.3 (MACRO-INTEGRATION-PUBLISH-01): la sección 18, fila 05,
-- espera los nombres reales de Storage con los sufijos que añadió el
-- Dashboard de Supabase al aplicar S1/S2 en producción (26-nov-2026).
-- Transacción READ ONLY terminada en ROLLBACK. Una sola consulta SELECT
-- sobre catálogos del sistema; los conteos usan SELECT count(*) generados
-- con identificadores entrecomillados (query_to_xml). No devuelve nombres
-- de archivos, datos personales, definiciones de funciones ni secretos.
-- Resultado: una tabla  seccion | objeto | detalle | alerta
-- =====================================================================
BEGIN TRANSACTION READ ONLY;

WITH
rc AS (
    SELECT 0::oid AS oid, 'PUBLIC'::text AS nombre
    UNION ALL SELECT 'anon'::regrole::oid, 'anon'
    UNION ALL SELECT 'authenticated'::regrole::oid, 'authenticated'
),
objetivo (tabla, esperado_18nov) AS (
    VALUES ('usuarios', '3'), ('roles', NULL), ('matrimonios', '31'),
           ('articulos', '115'), ('prestamos', '11'), ('detalle_prestamo', '13'),
           ('movimientos', '10'), ('ministerios', '14'), ('encuentros', NULL),
           ('participantes', NULL), ('equipos_servicio', NULL), ('comisiones', NULL),
           ('configuracion', NULL), ('auditoria', NULL), ('permisos', NULL),
           ('rol_permisos', NULL)
),
restringibles (proname) AS (
    VALUES ('registrar_alta_articulo'), ('registrar_movimiento_inventario'), ('registrar_movimiento_kardex')
),
pol AS (
    SELECT n.nspname::text AS esquema, c.relname::text AS tabla, p.polname::text AS polname,
           CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
                         WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS cmd,
           p.polpermissive AS permisiva,
           array_to_string(ARRAY(SELECT CASE WHEN x = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x)::text END
                                   FROM unnest(p.polroles) AS x ORDER BY 1), '+') AS destinatarios,
           (0::oid = ANY (p.polroles)) AS a_public,
           ('anon'::regrole::oid = ANY (p.polroles)) AS a_anon,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname IN ('public', 'storage')
),
acl_rel AS (
    SELECT n.nspname::text AS esquema, c.relname::text AS relname, c.relkind, rc.nombre AS rol,
           (SELECT string_agg(a.privilege_type, ',' ORDER BY a.privilege_type)
              FROM aclexplode(coalesce(c.relacl,
                     acldefault(CASE WHEN c.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END,
                                c.relowner))) a
             WHERE a.grantee = rc.oid) AS privs
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     CROSS JOIN rc
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
),
fn AS (
    SELECT p.oid, p.proname::text AS proname, pg_get_function_identity_arguments(p.oid) AS args,
           p.prosecdef, pg_get_userbyid(p.proowner)::text AS propietario, p.provolatile,
           coalesce((SELECT string_agg(cfg, ',') FROM unnest(p.proconfig) cfg
                      WHERE cfg LIKE 'search_path=%'), '') AS search_path,
           (SELECT string_agg(rc.nombre, '+' ORDER BY rc.nombre) FROM rc
             WHERE EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                            WHERE a.grantee = rc.oid AND a.privilege_type = 'EXECUTE')) AS execute_explicito
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
),
huella (firma, md5_esperado) AS (
    VALUES ('public.registrar_prestamo(jsonb)', 'f7556fef91f9cecd64cf7b43efb0de41'),
           ('public.devolver_prestamo(uuid)',   '17f43cf494767268d94cb07f9ba2cd9b'),
           ('public.registrar_movimiento_kardex(uuid,character varying,integer,integer,integer,uuid,uuid,character varying,text,text,text,jsonb)',
                                                '3244bea23b57ef0cb9cffffd97aaaef0'),
           ('public.rol_actual_en(text[])',     '6844a678ff1bbe4962dbba652524ffb7')
),
fk AS (
    SELECT con.conname::text AS conname, con.conrelid, con.confrelid,
           con.conrelid::regclass::text AS origen, con.confrelid::regclass::text AS destino,
           array_to_string(ARRAY(SELECT a.attname::text
                                   FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
                                   JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
                                  ORDER BY k.ord), ',') AS columnas,
           cardinality(con.conkey) AS ncols,
           CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
                                WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete,
           CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
                                WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_update
      FROM pg_constraint con
     WHERE con.contype = 'f'
),
firma AS (
    SELECT n.nspname || '.' || c.relname AS objeto,
           (SELECT string_agg(p.polname || ':' || p.polcmd::text, ',' ORDER BY p.polname::text COLLATE "C")
              FROM pg_policy p WHERE p.polrelid = c.oid) AS sig
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE (n.nspname = 'public' AND c.relname IN ('prestamos', 'detalle_prestamo', 'ministerios', 'movimientos'))
        OR (n.nspname = 'storage' AND c.relname = 'objects')
),
esperado_m1 (orden, correccion, objeto, pre, post) AS (
    VALUES
    (1, '01-S5 prestamos: políticas', 'public.prestamos',
        'prestamos_delete:d,prestamos_insert:a,prestamos_select:r,prestamos_update:w',
        'prestamos_select_autorizados:r'),
    (2, '01-S4 detalle_prestamo: políticas', 'public.detalle_prestamo',
        'detalle_delete:d,detalle_insert:a,detalle_select:r,detalle_update:w',
        'detalle_prestamo_select_autorizados:r'),
    (3, '01-S6 ministerios: políticas', 'public.ministerios',
        'Permitir actualizar ministerios:w,Permitir eliminar ministerios:d,Permitir insertar ministerios:a,Permitir lectura ministerios:r',
        'ministerios_insert_gestion:a,ministerios_select_perfil_activo:r,ministerios_update_gestion:w'),
    (4, 'Y.2 movimientos: políticas', 'public.movimientos',
        'Usuarios activos pueden consultar movimientos:r,Usuarios activos pueden registrar movimientos:a',
        'Administrador y Coordinador consultan movimientos:r'),
    (5, '02-S1/S2 storage.objects: políticas', 'storage.objects',
        'Permitir actualizar imágenes:w,Permitir borrar imágenes:d,Permitir subir fotografías 1o9u66w_0:a,Permitir subir imágenes:a,Permitir ver fotografías 1o9u66w_0:r,Permitir ver imágenes:r',
        'Permitir ver fotografías 1o9u66w_0:r,Permitir ver imágenes:r,articulos_imagenes_delete_admin 99a5fc_0:d,articulos_imagenes_insert_admin 99a5fc_0:a,articulos_imagenes_update_admin 99a5fc_0:w,matrimonios_fotos_insert_gestion 1o9u66w_0:a')
),
priv_m1 (orden, correccion, actual, pre, post) AS (
    SELECT 6, '01-S4/S5/S6 anon sin privilegios en prestamos, detalle_prestamo y ministerios',
           (SELECT count(*) FROM acl_rel a WHERE a.rol = 'anon' AND a.privs IS NOT NULL
               AND a.relname IN ('prestamos', 'detalle_prestamo', 'ministerios')), 3, 0
    UNION ALL
    SELECT 7, '01-S4/S5 authenticated sin INSERT/UPDATE/DELETE en prestamos y detalle_prestamo',
           (SELECT count(*) FROM (VALUES ('public.prestamos'), ('public.detalle_prestamo')) t(x)
             CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE')) v(y)
             WHERE to_regclass(t.x) IS NOT NULL
               AND has_table_privilege('authenticated', to_regclass(t.x), v.y)), 6, 0
    UNION ALL
    SELECT 8, '01-S5 prestamos_folio_seq sin privilegios de anon y authenticated',
           (SELECT count(*) FROM acl_rel a WHERE a.relname = 'prestamos_folio_seq'
               AND a.rol IN ('anon', 'authenticated') AND a.privs IS NOT NULL), 2, 0
    UNION ALL
    SELECT 9, '01-S6 authenticated sin DELETE en ministerios',
           (SELECT count(*) FROM (SELECT to_regclass('public.ministerios') AS r) s
             WHERE s.r IS NOT NULL AND has_table_privilege('authenticated', s.r, 'DELETE')), 1, 0
    UNION ALL
    SELECT 10, '01-S7 anon sin privilegios en comisiones, encuentros, permisos, rol_permisos y encuentros_numero_seq',
           (SELECT count(*) FROM acl_rel a WHERE a.rol = 'anon' AND a.privs IS NOT NULL
               AND a.relname IN ('comisiones', 'encuentros', 'permisos', 'rol_permisos', 'encuentros_numero_seq')), 5, 0
    UNION ALL
    SELECT 11, '01-S7 authenticated sin TRUNCATE en las 9 tablas de higiene',
           (SELECT count(*) FROM (VALUES ('auditoria'), ('comisiones'), ('configuracion'), ('encuentros'),
                                         ('equipos_servicio'), ('matrimonios'), ('participantes'),
                                         ('permisos'), ('rol_permisos')) t(x)
             WHERE to_regclass('public.' || t.x) IS NOT NULL
               AND has_table_privilege('authenticated', to_regclass('public.' || t.x), 'TRUNCATE')), 8, 0
    UNION ALL
    SELECT 12, '01-S7 anon sin EXECUTE en es_administrador_actual() y asignar_usuario_movimiento()',
           (SELECT count(*) FROM (VALUES ('public.es_administrador_actual()'),
                                         ('public.asignar_usuario_movimiento()')) t(x)
             WHERE to_regprocedure(t.x) IS NOT NULL
               AND has_function_privilege('anon', to_regprocedure(t.x), 'EXECUTE')), 2, 0
    UNION ALL
    SELECT 13, 'Y.2 movimientos: número de concesiones',
           (SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a
             WHERE c.oid = to_regclass('public.movimientos')), 32, 17
),
conteo AS (
    SELECT o.tabla, o.esperado_18nov,
           CASE WHEN to_regclass('public.' || o.tabla) IS NOT NULL THEN
               (xpath('/row/c/text()', query_to_xml(
                    format('SELECT count(*) AS c FROM %s', to_regclass('public.' || o.tabla)),
                    false, true, '')))[1]::text
           END AS filas
      FROM objetivo o
),
resultado (orden, seccion, objeto, detalle, alerta) AS (
    -- 00 CONTEXTO --------------------------------------------------------
    SELECT 0, '00 CONTEXTO', 'sesión',
           format('usuario=%s | solo_lectura=%s | PostgreSQL=%s | colación=%s | fecha=%s',
                  current_user, current_setting('transaction_read_only'),
                  current_setting('server_version'),
                  (SELECT datcollate FROM pg_database WHERE datname = current_database()),
                  to_char(now(), 'YYYY-MM-DD HH24:MI TZ')),
           CASE WHEN current_setting('transaction_read_only') <> 'on'
                THEN 'AVISO: fuera de transacción READ ONLY (la consulta solo contiene SELECT)' END
    UNION ALL
    SELECT 0, '00 CONTEXTO', 'roles con BYPASSRLS',
           (SELECT string_agg(rolname || '=' || rolbypassrls, ', ' ORDER BY rolname)
              FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role')),
           CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon', 'authenticated') AND rolbypassrls)
                THEN 'CRÍTICO: anon/authenticated omiten RLS' END
    UNION ALL
    SELECT 0, '00 CONTEXTO', 'orden de texto de la colación',
           format('texto: ''articulos'' < ''Permitir'' = %s | tipo name (polname): %s',
                  'articulos' < 'Permitir', 'articulos'::name < 'Permitir'::name),
           CASE WHEN 'articulos'::name < 'Permitir'::name
                THEN 'VERIFICAR: el tipo name no ordena en binario; los scripts usan COLLATE "C" explícito' END

    -- 01 STORAGE: BUCKETS ------------------------------------------------
    UNION ALL
    SELECT 1, '01 STORAGE BUCKETS', b.id::text,
           format('público=%s | límite_bytes=%s | tipos=%s', b.public,
                  coalesce(b.file_size_limit::text, 'sin límite'),
                  coalesce(array_to_string(b.allowed_mime_types, ','), 'todos')),
           CASE WHEN b.public THEN 'Bucket público: descarga por URL sin sesión' END
      FROM storage.buckets b
    UNION ALL
    SELECT 1, '01 STORAGE BUCKETS', 'matrimonios', 'NO EXISTE', 'Bucket esperado ausente'
     WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'matrimonios')

    -- 02 STORAGE: TABLA storage.objects ----------------------------------
    UNION ALL
    SELECT 2, '02 STORAGE TABLA', 'storage.objects',
           format('RLS=%s | forzada=%s | propietario=%s | anon: SELECT=%s INSERT=%s UPDATE=%s DELETE=%s | authenticated: SELECT=%s INSERT=%s UPDATE=%s DELETE=%s',
                  c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner),
                  has_table_privilege('anon', c.oid, 'SELECT'), has_table_privilege('anon', c.oid, 'INSERT'),
                  has_table_privilege('anon', c.oid, 'UPDATE'), has_table_privilege('anon', c.oid, 'DELETE'),
                  has_table_privilege('authenticated', c.oid, 'SELECT'), has_table_privilege('authenticated', c.oid, 'INSERT'),
                  has_table_privilege('authenticated', c.oid, 'UPDATE'), has_table_privilege('authenticated', c.oid, 'DELETE')),
           CASE WHEN NOT c.relrowsecurity THEN 'CRÍTICO: RLS desactivada en storage.objects' END
      FROM pg_class c WHERE c.oid = 'storage.objects'::regclass

    -- 03 STORAGE: POLÍTICAS ----------------------------------------------
    UNION ALL
    SELECT 3, '03 STORAGE POLÍTICAS', p.tabla || ': ' || p.polname,
           format('%s | %s | para=%s | USING=%s | WITH CHECK=%s', p.cmd,
                  CASE WHEN p.permisiva THEN 'PERMISIVA' ELSE 'RESTRICTIVA' END, p.destinatarios,
                  coalesce(p.using_expr, '-'), coalesce(p.check_expr, '-')),
           nullif(concat_ws(' | ',
               CASE WHEN (p.a_public OR p.a_anon) AND p.cmd IN ('INSERT', 'ALL')
                         AND (coalesce(p.check_expr, p.using_expr) IS NULL
                              OR coalesce(p.check_expr, p.using_expr) ILIKE '%matrimonios%')
                    THEN 'SEC-01: carga anónima posible (matrimonios)' END,
               CASE WHEN (p.a_public OR p.a_anon) AND p.cmd IN ('SELECT', 'ALL')
                         AND (p.using_expr IS NULL OR p.using_expr ILIKE '%matrimonios%')
                    THEN 'SEC-02: listado anónimo posible (matrimonios)' END,
               CASE WHEN (p.a_public OR p.a_anon) AND p.cmd IN ('UPDATE', 'DELETE')
                    THEN 'Modificación o borrado anónimo posible' END,
               CASE WHEN p.using_expr = 'true' THEN 'USING (true)' END,
               CASE WHEN p.check_expr = 'true' THEN 'WITH CHECK (true)' END), '')
      FROM pol p WHERE p.esquema = 'storage'

    -- 04 STORAGE: CONTEO DE OBJETOS (sin nombres ni rutas) ---------------
    UNION ALL
    SELECT 4, '04 STORAGE OBJETOS', o.bucket_id::text, format('%s objetos', count(*)), NULL
      FROM storage.objects o GROUP BY o.bucket_id

    -- 05 DICTAMEN SEC-01 / SEC-02 ----------------------------------------
    UNION ALL
    SELECT 5, '05 DICTAMEN STORAGE', 'SEC-01 carga anónima en matrimonios',
           format('políticas INSERT/ALL para PUBLIC/anon que admiten matrimonios=%s | privilegio INSERT de anon=%s',
                  s.n, has_table_privilege('anon', 'storage.objects', 'INSERT')),
           CASE WHEN s.n > 0 AND has_table_privilege('anon', 'storage.objects', 'INSERT') THEN 'CONFIRMADO'
                WHEN s.n > 0 THEN 'POLÍTICA PRESENTE SIN PRIVILEGIO (no explotable)'
                ELSE 'NO CONFIRMADO' END
      FROM (SELECT count(*) AS n FROM pol p
             WHERE p.esquema = 'storage' AND p.tabla = 'objects' AND (p.a_public OR p.a_anon)
               AND p.cmd IN ('INSERT', 'ALL')
               AND (coalesce(p.check_expr, p.using_expr) IS NULL
                    OR coalesce(p.check_expr, p.using_expr) ILIKE '%matrimonios%')) s
    UNION ALL
    SELECT 5, '05 DICTAMEN STORAGE', 'SEC-02 listado anónimo en matrimonios',
           format('políticas SELECT/ALL para PUBLIC/anon que admiten matrimonios=%s | privilegio SELECT de anon=%s',
                  s.n, has_table_privilege('anon', 'storage.objects', 'SELECT')),
           CASE WHEN s.n > 0 AND has_table_privilege('anon', 'storage.objects', 'SELECT') THEN 'CONFIRMADO'
                WHEN s.n > 0 THEN 'POLÍTICA PRESENTE SIN PRIVILEGIO (no explotable)'
                ELSE 'NO CONFIRMADO' END
      FROM (SELECT count(*) AS n FROM pol p
             WHERE p.esquema = 'storage' AND p.tabla = 'objects' AND (p.a_public OR p.a_anon)
               AND p.cmd IN ('SELECT', 'ALL')
               AND (p.using_expr IS NULL OR p.using_expr ILIKE '%matrimonios%')) s

    -- 06 RLS: TABLAS -----------------------------------------------------
    UNION ALL
    SELECT 6, '06 RLS TABLAS', o.tabla,
           CASE WHEN c.oid IS NULL THEN 'NO EXISTE'
                ELSE format('tipo=%s | RLS=%s | forzada=%s | propietario=%s | políticas=%s',
                            c.relkind, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner),
                            (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)) END,
           CASE WHEN c.oid IS NULL THEN 'Tabla no existe'
                WHEN NOT c.relrowsecurity THEN 'CRÍTICO: RLS desactivada'
                WHEN NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
                     THEN 'RLS sin políticas: clientes sin acceso (confirmar si es intencional)' END
      FROM objetivo o LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || o.tabla)
    UNION ALL
    SELECT 6, '06 RLS TABLAS', c.relname || ' (fuera de la lista)',
           format('RLS=%s | políticas=%s', c.relrowsecurity,
                  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)),
           CASE WHEN NOT c.relrowsecurity THEN 'CRÍTICO: RLS desactivada' END
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
       AND c.relname::text NOT IN (SELECT tabla FROM objetivo)

    -- 07 RLS: POLÍTICAS DE public ----------------------------------------
    UNION ALL
    SELECT 7, '07 RLS POLÍTICAS', p.tabla || ': ' || p.polname,
           format('%s | %s | para=%s | USING=%s | WITH CHECK=%s', p.cmd,
                  CASE WHEN p.permisiva THEN 'PERMISIVA' ELSE 'RESTRICTIVA' END, p.destinatarios,
                  coalesce(p.using_expr, '-'), coalesce(p.check_expr, '-')),
           nullif(concat_ws(' | ',
               CASE WHEN NOT p.permisiva THEN 'RESTRICTIVA' END,
               CASE WHEN p.a_public THEN 'destino PUBLIC' END,
               CASE WHEN p.a_anon THEN 'destino anon' END,
               CASE WHEN p.using_expr = 'true' THEN 'USING (true)' END,
               CASE WHEN p.check_expr = 'true' THEN 'WITH CHECK (true)' END,
               CASE WHEN p.cmd IN ('UPDATE', 'ALL') AND (p.using_expr IS NULL OR p.check_expr IS NULL)
                    THEN 'UPDATE sin USING o sin WITH CHECK explícito' END,
               CASE WHEN p.tabla IN ('detalle_prestamo', 'ministerios')
                         AND (p.using_expr = 'true' OR p.check_expr = 'true') THEN 'SEC-03' END), '')
      FROM pol p WHERE p.esquema = 'public'

    -- 08 PRIVILEGIOS: TABLAS, VISTAS Y SECUENCIAS ------------------------
    UNION ALL
    SELECT 8, '08 PRIVILEGIOS',
           a.relname || ' [' || CASE a.relkind WHEN 'r' THEN 'tabla' WHEN 'p' THEN 'tabla'
                                               WHEN 'v' THEN 'vista' WHEN 'm' THEN 'vista mat.'
                                               WHEN 'S' THEN 'secuencia' ELSE 'foránea' END || ']',
           string_agg(a.rol || '=' || coalesce(a.privs, '-'), ' | ' ORDER BY a.rol),
           nullif(concat_ws(' | ',
               CASE WHEN bool_or(a.rol = 'PUBLIC' AND a.privs IS NOT NULL) THEN 'concesión a PUBLIC' END,
               CASE WHEN bool_or(a.rol = 'anon' AND a.privs IS NOT NULL) THEN 'anon con privilegios' END,
               CASE WHEN bool_or(a.rol = 'authenticated' AND a.privs LIKE '%TRUNCATE%')
                    THEN 'authenticated con TRUNCATE (RLS no lo limita)' END), '')
      FROM acl_rel a GROUP BY a.relname, a.relkind

    -- 09 PRIVILEGIOS POR COLUMNA -----------------------------------------
    UNION ALL
    SELECT 9, '09 PRIVILEGIOS POR COLUMNA', c.relname || '.' || at.attname, at.attacl::text,
           'Permiso por columna: incluido en la instantánea v2 (tipo col)'
      FROM pg_attribute at
      JOIN pg_class c ON c.oid = at.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND at.attacl IS NOT NULL AND NOT at.attisdropped

    -- 10 PRIVILEGIOS POR DEFECTO (objetos futuros) -----------------------
    UNION ALL
    SELECT 10, '10 PRIVILEGIOS POR DEFECTO',
           format('creador=%s | ámbito=%s | tipo=%s', pg_get_userbyid(d.defaclrole),
                  CASE WHEN d.defaclnamespace = 0 THEN 'global' ELSE d.defaclnamespace::regnamespace::text END,
                  CASE d.defaclobjtype WHEN 'r' THEN 'tablas' WHEN 'S' THEN 'secuencias'
                                       WHEN 'f' THEN 'funciones' WHEN 'T' THEN 'tipos' ELSE 'esquemas' END),
           d.defaclacl::text,
           CASE WHEN d.defaclacl::text ~ '(^|[{,])anon='
                THEN 'Objetos nuevos heredan privilegios para anon: REVOKE explícito al crearlos' END
      FROM pg_default_acl d
     WHERE d.defaclnamespace IN (0, 'public'::regnamespace)

    -- 11 FUNCIONES Y RPC --------------------------------------------------
    UNION ALL
    SELECT 11, '11 FUNCIONES', f.proname || '(' || f.args || ')',
           format('%s | propietario=%s | %s | search_path=%s | EXECUTE explícito=%s | efectivo: anon=%s authenticated=%s | huella=%s',
                  CASE WHEN f.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END, f.propietario,
                  CASE f.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' ELSE 'VOLATILE' END,
                  coalesce(nullif(f.search_path, ''), '(no fijado)'), coalesce(f.execute_explicito, '-'),
                  has_function_privilege('anon', f.oid, 'EXECUTE'),
                  has_function_privilege('authenticated', f.oid, 'EXECUTE'),
                  CASE WHEN h.md5_esperado IS NULL THEN 'n/a'
                       WHEN md5(pg_get_functiondef(f.oid)) = h.md5_esperado THEN 'igual a la auditada'
                       ELSE 'DISTINTA' END),
           nullif(concat_ws(' | ',
               CASE WHEN f.prosecdef AND f.search_path = '' THEN 'DEFINER sin search_path fijo' END,
               CASE WHEN f.prosecdef AND has_function_privilege('anon', f.oid, 'EXECUTE')
                    THEN 'DEFINER ejecutable por anon' END,
               CASE WHEN f.proname IN ('es_administrador_actual', 'asignar_usuario_movimiento')
                         AND has_function_privilege('anon', f.oid, 'EXECUTE') THEN 'S7 pendiente' END,
               CASE WHEN f.proname IN (SELECT proname FROM restringibles)
                         AND has_function_privilege('authenticated', f.oid, 'EXECUTE')
                    THEN 'DEFINER no usada por la app y ejecutable por authenticated' END,
               CASE WHEN h.md5_esperado IS NOT NULL AND md5(pg_get_functiondef(f.oid)) <> h.md5_esperado
                    THEN 'HUELLA DISTINTA: MACRO 1/Y.2 abortarán' END), '')
      FROM fn f LEFT JOIN huella h ON to_regprocedure(h.firma)::oid = f.oid

    -- 12 VISTAS -----------------------------------------------------------
    UNION ALL
    SELECT 12, '12 VISTAS', c.relname::text,
           format('tipo=%s | propietario=%s | security_invoker=%s | SELECT anon=%s authenticated=%s',
                  c.relkind, pg_get_userbyid(c.relowner),
                  coalesce((SELECT split_part(o, '=', 2) FROM unnest(c.reloptions) o
                             WHERE o LIKE 'security_invoker=%'), 'false'),
                  has_table_privilege('anon', c.oid, 'SELECT'),
                  has_table_privilege('authenticated', c.oid, 'SELECT')),
           CASE WHEN coalesce((SELECT split_part(o, '=', 2) FROM unnest(c.reloptions) o
                                WHERE o LIKE 'security_invoker=%'), 'false') NOT IN ('true', 'on', '1')
                     AND (has_table_privilege('anon', c.oid, 'SELECT')
                          OR has_table_privilege('authenticated', c.oid, 'SELECT'))
                THEN 'Vista accesible por clientes que omite la RLS de sus tablas base' END
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')

    -- 13 INTEGRIDAD: FK QUE REFERENCIAN public.usuarios (SEC-07) ---------
    UNION ALL
    SELECT 13, '13 FK → public.usuarios', fk.origen || '.' || fk.columnas,
           format('restricción=%s | ON DELETE %s | ON UPDATE %s | filas con referencia=%s',
                  fk.conname, fk.on_delete, fk.on_update,
                  CASE WHEN fk.ncols = 1 THEN
                      (xpath('/row/c/text()', query_to_xml(
                           format('SELECT count(*) AS c FROM %s WHERE %I IS NOT NULL', fk.origen, fk.columnas),
                           false, true, '')))[1]::text
                  ELSE 'n/d' END),
           CASE fk.on_delete
                WHEN 'CASCADE'     THEN 'SEC-07 ALTO: borrar el perfil ELIMINA estas filas'
                WHEN 'SET NULL'    THEN 'SEC-07 MEDIO: borrar el perfil deja estas filas sin autor'
                WHEN 'SET DEFAULT' THEN 'SEC-07 MEDIO: borrar el perfil reasigna el autor'
                ELSE 'SEC-07: con referencias, el borrado del perfil FALLA después de borrar la cuenta Auth' END
      FROM fk WHERE fk.confrelid = to_regclass('public.usuarios')
    UNION ALL
    SELECT 13, '13 FK → public.usuarios', '(ninguna)', 'No hay claves foráneas hacia public.usuarios', NULL
     WHERE NOT EXISTS (SELECT 1 FROM fk WHERE fk.confrelid = to_regclass('public.usuarios'))

    -- 14 INTEGRIDAD: FK DE public HACIA auth.users -----------------------
    UNION ALL
    SELECT 14, '14 FK → auth.users', fk.origen || '.' || fk.columnas,
           format('restricción=%s | ON DELETE %s', fk.conname, fk.on_delete),
           CASE WHEN fk.on_delete = 'CASCADE'
                THEN 'Borrar la cuenta Auth borra el perfil y activa las FK de la sección 13' END
      FROM fk
     WHERE fk.confrelid = to_regclass('auth.users')
       AND fk.conrelid IN (SELECT c.oid FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace)

    -- 15 INTEGRIDAD: TODAS LAS FK CON CASCADE EN public -------------------
    UNION ALL
    SELECT 15, '15 FK CON CASCADE', fk.origen || '.' || fk.columnas || ' → ' || fk.destino,
           format('restricción=%s | ON DELETE CASCADE', fk.conname),
           'Borrar en el destino elimina filas del origen'
      FROM fk
     WHERE fk.on_delete = 'CASCADE'
       AND fk.conrelid IN (SELECT c.oid FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace)

    -- 16 CONTEOS DE CONTROL (agregados) ----------------------------------
    UNION ALL
    SELECT 16, '16 CONTEOS', k.tabla,
           CASE WHEN k.filas IS NULL THEN 'NO EXISTE'
                ELSE format('filas=%s | referencia 18-nov=%s', k.filas, coalesce(k.esperado_18nov, 'n/d')) END,
           CASE WHEN k.esperado_18nov IS NOT NULL AND k.filas IS DISTINCT FROM k.esperado_18nov
                THEN 'Cambió desde el 18-nov: actualizar V-5 antes de MACRO 1' END
      FROM conteo k

    -- 17 ROLES Y USUARIOS (solo agregados) -------------------------------
    UNION ALL
    SELECT 17, '17 USUARIOS POR ROL', coalesce(r.nombre::text, '(sin rol)'),
           format('activos=%s | inactivos=%s',
                  count(*) FILTER (WHERE u.activo IS TRUE), count(*) FILTER (WHERE u.activo IS NOT TRUE)),
           NULL
      FROM public.usuarios u LEFT JOIN public.roles r ON r.id = u.rol_id
     GROUP BY r.nombre
    UNION ALL
    SELECT 17, '17 ROLES DEFINIDOS', 'catálogo de roles',
           (SELECT string_agg(r.nombre::text, ', ' ORDER BY r.nombre::text) FROM public.roles r),
           CASE WHEN NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.nombre = 'Matrimonio')
                THEN 'El rol Matrimonio NO existe' END

    -- 18 COMPARACIÓN CON MACRO 1 ------------------------------------------
    UNION ALL
    SELECT 18, '18 MACRO 1', lpad(e.orden::text, 2, '0') || ' ' || e.correccion,
           'actual: ' || coalesce(f.sig, CASE WHEN f.objeto IS NULL THEN '(objeto no existe)' ELSE '(sin políticas)' END),
           CASE WHEN f.objeto IS NULL THEN 'NO APLICABLE (objeto no existe)'
                WHEN f.sig = e.post THEN 'YA APLICADA'
                WHEN f.sig = e.pre  THEN 'PENDIENTE DE APLICAR'
                ELSE 'REQUIERE VERIFICACIÓN (distinto del auditado y del previsto)' END
      FROM esperado_m1 e LEFT JOIN firma f ON f.objeto = e.objeto
    UNION ALL
    SELECT 18, '18 MACRO 1', lpad(p.orden::text, 2, '0') || ' ' || p.correccion,
           format('actual=%s | auditado 18-nov=%s | tras MACRO 1=%s', p.actual, p.pre, p.post),
           CASE WHEN p.actual = p.post THEN 'YA APLICADA'
                WHEN p.actual = p.pre  THEN 'PENDIENTE DE APLICAR'
                ELSE 'PARCIALMENTE APLICADA / REQUIERE VERIFICACIÓN' END
      FROM priv_m1 p

    -- 19 ESQUEMAS: USAGE y CREATE de clientes (nuevo) --------------------
    UNION ALL
    SELECT 19, '19 ESQUEMAS', s.nspname::text,
           format('anon: USAGE=%s CREATE=%s | authenticated: USAGE=%s CREATE=%s',
                  has_schema_privilege('anon', s.oid, 'USAGE'), has_schema_privilege('anon', s.oid, 'CREATE'),
                  has_schema_privilege('authenticated', s.oid, 'USAGE'),
                  has_schema_privilege('authenticated', s.oid, 'CREATE')),
           CASE WHEN has_schema_privilege('anon', s.oid, 'CREATE')
                  OR has_schema_privilege('authenticated', s.oid, 'CREATE')
                THEN 'Clientes pueden crear objetos en el esquema' END
      FROM pg_namespace s
     WHERE s.nspname IN ('public', 'storage', 'auth', 'extensions')

    -- 20 DEPENDENCIAS DE LAS 3 FUNCIONES DEFINER A RESTRINGIR (nuevo) ----
    --    a) objetos que dependen de ellas en el catálogo (DEFAULT, CHECK,
    --       vistas, triggers, políticas)
    UNION ALL
    SELECT 20, '20 DEPENDENCIAS', f.proname || ' ← ' || pg_describe_object(d.classid, d.objid, d.objsubid),
           format('tipo de dependencia=%s', d.deptype),
           'BLOQUEA sec_db02_01 si el objeto se evalúa con privilegios del cliente'
      FROM pg_proc f
      JOIN pg_depend d ON d.refclassid = 'pg_proc'::regclass AND d.refobjid = f.oid
     WHERE f.pronamespace = 'public'::regnamespace
       AND f.proname IN (SELECT proname FROM restringibles)
    --    b) funciones de cualquier esquema cuyo cuerpo las menciona
    UNION ALL
    SELECT 20, '20 DEPENDENCIAS',
           p.pronamespace::regnamespace::text || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') las invoca',
           format('%s | propietario=%s', CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
                  pg_get_userbyid(p.proowner)),
           CASE WHEN NOT p.prosecdef THEN 'BLOQUEA: se ejecuta con privilegios del cliente'
                WHEN p.proowner <> 'postgres'::regrole THEN 'BLOQUEA: propietario distinto de postgres'
                ELSE 'OK: se ejecuta como postgres' END
      FROM pg_proc p
     WHERE p.pronamespace NOT IN ('pg_catalog'::regnamespace, 'information_schema'::regnamespace)
       AND p.prokind IN ('f', 'p')
       AND p.prosrc ~ '\m(registrar_alta_articulo|registrar_movimiento_inventario|registrar_movimiento_kardex)\M'
       AND p.proname NOT IN (SELECT proname FROM restringibles)
    --    c) funciones con SQL dinámico (no analizable estáticamente)
    UNION ALL
    SELECT 20, '20 DEPENDENCIAS',
           p.pronamespace::regnamespace::text || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
           'contiene EXECUTE con SQL dinámico',
           'Revisión manual: una llamada dinámica a las funciones restringidas no se detecta'
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prokind IN ('f', 'p')
       AND p.prosrc ~* '\mEXECUTE\M\s+(format|''|\$|[a-z_]+\s*(\|\||;))'

    -- 21 EXECUTE QUE SOLO SE OBTIENE VÍA PUBLIC (nuevo) -------------------
    --    Roles que perderían EXECUTE si se revoca PUBLIC y no se les
    --    concede explícitamente. sec_db02_01 (C-1) conserva el acceso de
    --    todos los roles salvo anon; macro1_01 revoca PUBLIC antes en
    --    es_administrador_actual() y asignar_usuario_movimiento().
    UNION ALL
    SELECT 21, '21 EXECUTE VÍA PUBLIC', ro.rolname::text,
           format('%s funciones: %s', count(*),
                  string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', '
                             ORDER BY p.proname::text)),
           CASE WHEN ro.rolname IN ('authenticated', 'service_role')
                THEN 'Conservado por sec_db02_01'
                WHEN ro.rolname = 'supabase_auth_admin'
                THEN 'VERIFICAR: si alguna es un Auth Hook (firma (event jsonb)), revocar PUBLIC rompería el inicio de sesión'
                ELSE 'VERIFICAR: perdería EXECUTE al revocar PUBLIC (sec_db02_01 lo conserva; macro1_01 no)' END
      FROM pg_roles ro
      JOIN pg_proc p ON p.pronamespace = 'public'::regnamespace AND p.prokind IN ('f', 'p')
     WHERE ro.rolname IN ('authenticated', 'service_role', 'supabase_auth_admin', 'supabase_storage_admin',
                          'supabase_realtime_admin', 'authenticator', 'dashboard_user', 'pgbouncer')
       AND NOT ro.rolsuper
       AND p.proowner = 'postgres'::regrole
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
       AND EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                    WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
       AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                        WHERE a.grantee <> 0 AND a.privilege_type = 'EXECUTE'
                          AND pg_has_role(ro.oid, a.grantee, 'USAGE'))
     GROUP BY ro.rolname

    -- 22 CALIDAD DE DATOS: DUPLICADOS (solo conteos) ---------------------
    UNION ALL
    SELECT 22, '22 DUPLICADOS', 'participantes (encuentro_id, matrimonio_id)',
           format('combinaciones repetidas=%s | filas implicadas=%s', count(*), coalesce(sum(d.n), 0)),
           CASE WHEN count(*) > 0 THEN 'BLOQUEA sec_db05_participantes_unicidad.sql' END
      FROM (SELECT count(*) AS n
              FROM public.participantes
             WHERE encuentro_id IS NOT NULL AND matrimonio_id IS NOT NULL
             GROUP BY encuentro_id, matrimonio_id
            HAVING count(*) > 1) d
    UNION ALL
    SELECT 22, '22 DUPLICADOS', 'equipos_servicio (encuentro_id, usuario_id)',
           format('combinaciones repetidas=%s | filas implicadas=%s', count(*), coalesce(sum(d.n), 0)),
           CASE WHEN count(*) > 0 THEN 'Informativo: un usuario con varias asignaciones en el mismo encuentro' END
      FROM (SELECT count(*) AS n
              FROM public.equipos_servicio
             WHERE encuentro_id IS NOT NULL AND usuario_id IS NOT NULL
             GROUP BY encuentro_id, usuario_id
            HAVING count(*) > 1) d

    -- 23 CALIDAD DE DATOS: VALORES NULOS (solo conteos) -----------------
    UNION ALL
    SELECT 23, '23 NULOS', 'participantes',
           format('total=%s | encuentro_id nulo=%s | matrimonio_id nulo=%s', count(*),
                  count(*) FILTER (WHERE encuentro_id IS NULL), count(*) FILTER (WHERE matrimonio_id IS NULL)),
           CASE WHEN count(*) FILTER (WHERE encuentro_id IS NULL OR matrimonio_id IS NULL) > 0
                THEN 'Registros históricos con nulos: el contrato de Codex debe aceptarlos al leer (K-2)' END
      FROM public.participantes
    UNION ALL
    SELECT 23, '23 NULOS', 'equipos_servicio',
           format('total=%s | encuentro_id nulo=%s | usuario_id nulo=%s', count(*),
                  count(*) FILTER (WHERE encuentro_id IS NULL), count(*) FILTER (WHERE usuario_id IS NULL)),
           CASE WHEN count(*) FILTER (WHERE encuentro_id IS NULL OR usuario_id IS NULL) > 0
                THEN 'Registros históricos con nulos: el contrato de Codex debe aceptarlos al leer (K-2)' END
      FROM public.equipos_servicio
    UNION ALL
    SELECT 23, '23 NULOS', 'encuentros',
           format('total=%s | numero nulo=%s | estado nulo=%s', count(*),
                  count(*) FILTER (WHERE numero IS NULL), count(*) FILTER (WHERE estado IS NULL)),
           NULL
      FROM public.encuentros

    -- 24 UNICIDAD EXISTENTE EN participantes ------------------------------
    UNION ALL
    SELECT 24, '24 UNICIDAD', con.conname::text, pg_get_constraintdef(con.oid),
           CASE WHEN con.contype = 'u' THEN 'Ya existe una restricción UNIQUE: revisar antes de sec_db05' END
      FROM pg_constraint con
     WHERE con.conrelid = 'public.participantes'::regclass AND con.contype IN ('p', 'u')
    UNION ALL
    SELECT 24, '24 UNICIDAD', i.relname::text, pg_get_indexdef(i.oid),
           'Índice único sin restricción asociada: revisar antes de sec_db05'
      FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
     WHERE x.indrelid = 'public.participantes'::regclass AND x.indisunique
       AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)

    -- 25 CAPACIDAD DE INSCRIPCIONES ---------------------------------------
    UNION ALL
    SELECT 25, '25 CAPACIDAD', 'encuentros: columnas de capacidad',
           coalesce((SELECT string_agg(a.attname::text, ', ')
                       FROM pg_attribute a
                      WHERE a.attrelid = 'public.encuentros'::regclass AND a.attnum > 0 AND NOT a.attisdropped
                        AND a.attname ~* '(cupo|capacidad|limite|maximo)'), '(ninguna)'),
           CASE WHEN NOT EXISTS (SELECT 1 FROM pg_attribute a
                                  WHERE a.attrelid = 'public.encuentros'::regclass AND a.attnum > 0
                                    AND NOT a.attisdropped AND a.attname ~* '(cupo|capacidad|limite|maximo)')
                THEN 'Sin columna de capacidad: no existe límite de inscripciones que proteger' END
    UNION ALL
    SELECT 25, '25 CAPACIDAD', 'trigger en participantes: ' || tg.tgname,
           format('función=%s | habilitado=%s', tg.tgfoid::regproc, tg.tgenabled), NULL
      FROM pg_trigger tg
     WHERE tg.tgrelid = 'public.participantes'::regclass AND NOT tg.tgisinternal
)
SELECT seccion, objeto, detalle, alerta
  FROM resultado
 ORDER BY orden, seccion, objeto COLLATE "C";

ROLLBACK;
