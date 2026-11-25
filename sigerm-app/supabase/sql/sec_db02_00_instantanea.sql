-- =====================================================================
-- SIGERM-SEC-DB-02 — 00 INSTANTÁNEA DE PRIVILEGIOS (SOLO LECTURA)
-- Versión 2 (SEC-DB-04).
--
-- Ejecutar INMEDIATAMENTE ANTES de sec_db02_01_privilegios_modulos.sql.
-- Devuelve una columna "linea". Copiar TODAS las líneas, en orden y sin
-- modificarlas, en el marcador de sec_db02_01_reversion.sql.
--
-- Captura, para los objetos que el bloque 01 puede modificar (objetos de
-- postgres en public que no pertenecen a extensiones):
--   rel  ACL completa de tablas, vistas y secuencias (todos los roles,
--        incluido WITH GRANT OPTION).
--   col  ACL de cada columna con permisos propios (REVOKE ALL ON TABLE
--        también los elimina).
--   fun  ACL completa de funciones y procedimientos.
--   def  Privilegios predeterminados de postgres en public (tablas,
--        secuencias, funciones, tipos); NULL = sin entrada.
--   defg Privilegios predeterminados globales de postgres (funciones).
--   fin  Número de entradas, para detectar una copia incompleta.
-- Un ACL NULL significa "privilegios por defecto del sistema".
-- No escribe nada.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;

WITH
rel AS (
    SELECT c.oid, c.relname, c.relkind
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relowner = 'postgres'::regrole
       AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
),
entradas (orden, tipo, objeto, columna, acl) AS (
    SELECT 1, 'rel', format('public.%I', r.relname), NULL::text, c.relacl::text
      FROM rel r JOIN pg_class c ON c.oid = r.oid
    UNION ALL
    SELECT 2, 'col', format('public.%I', r.relname), a.attname::text, a.attacl::text
      FROM rel r
      JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped
     WHERE a.attacl IS NOT NULL
    UNION ALL
    SELECT 3, 'fun', format('public.%I(%s)', p.proname, oidvectortypes(p.proargtypes)),
           CASE WHEN p.prokind = 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END, p.proacl::text
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proowner = 'postgres'::regrole
       AND p.prokind IN ('f', 'p')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    UNION ALL
    SELECT 4, 'def', t.objtipo, NULL, d.defaclacl::text
      FROM (VALUES ('r'), ('S'), ('f'), ('T')) AS t(objtipo)
      LEFT JOIN pg_default_acl d
             ON d.defaclrole = 'postgres'::regrole
            AND d.defaclnamespace = 'public'::regnamespace
            AND d.defaclobjtype::text = t.objtipo
    UNION ALL
    SELECT 5, 'defg', 'f', NULL, d.defaclacl::text
      FROM (VALUES (1)) AS uno(x)
      LEFT JOIN pg_default_acl d
             ON d.defaclrole = 'postgres'::regrole
            AND d.defaclnamespace = 0
            AND d.defaclobjtype = 'f'
)
SELECT linea
  FROM (
        SELECT 1 AS grupo, e.orden, e.objeto, e.columna,
               format('    (%L, %L, %L, %L),', e.tipo, e.objeto, e.columna, e.acl) AS linea
          FROM entradas e
        UNION ALL
        SELECT 2, 0, '', '',
               format('    (%L, NULL, NULL, %L)', 'fin', (SELECT count(*) FROM entradas)::text)
       ) x
 ORDER BY grupo, orden, objeto COLLATE "C", columna COLLATE "C";

ROLLBACK;
