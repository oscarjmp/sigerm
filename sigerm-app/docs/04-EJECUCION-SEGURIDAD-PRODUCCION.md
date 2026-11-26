# 04 — Ejecución de seguridad en producción (MACRO 1, SEC-DB-02, SEC-DB-05)

Registro de la aplicación en la base de datos de producción de Supabase
(PostgreSQL 17.11) de los scripts aprobados del commit integrado
`40dd5559916f32326e7215b9436038a28670fb75`. Fechas: 25 y 26 de noviembre de 2026.

No contiene credenciales, cadenas de conexión ni datos personales. Los
conteos y huellas son agregados; las huellas son MD5 de identificadores y
estados, no de contenido personal.

## Método

- Cada script se copió al portapapeles leyendo los bytes del archivo y se
  comprobó que el SHA-256 del portapapeles coincidiera con el aprobado.
- El responsable del proyecto lo ejecutó una sola vez en el SQL Editor de
  Supabase (rol `postgres`).
- La verificación se hizo con el MCP de Supabase en modo `read_only=true`
  (rol `supabase_read_only_user`, transacción de solo lectura).
- No se usó la contraseña de la base de datos ni un MCP de escritura: el
  MCP de escritura rechazó automáticamente el SQL destructivo y se retiró
  sin aplicar nada.
- Las políticas de Storage se crearon y eliminaron desde
  Dashboard > Storage > Policies, porque `storage.objects` pertenece a
  `supabase_storage_admin` y `postgres` no es miembro de ese rol.

## Línea base (antes del paso 1)

| Tabla | Filas | Tabla | Filas |
|---|---|---|---|
| articulos | 115 | encuentros | 3 |
| matrimonios | 31 | participantes | 0 |
| prestamos | 11 | equipos_servicio | 0 |
| detalle_prestamo | 13 | comisiones | 26 |
| movimientos | 10 | configuracion | 2 |
| ministerios | 14 | auditoria | 0 |
| usuarios | 3 | roles | 6 |

- Existencias totales: 887. Objetos de Storage: 135 (articulos 127, matrimonios 8).
- Huellas: préstamos `f6f2cd7c2b2170f2851f0baf290b2e20`, matrimonios
  `f5ff7dd1aa034d575e0f82fe863648a4`, usuarios `d5742b67d9ff0ca337d4f247b1f94164`.
- Huellas de funciones (md5 de `pg_get_functiondef`): `registrar_prestamo`
  `f7556fef91f9cecd64cf7b43efb0de41`, `devolver_prestamo`
  `17f43cf494767268d94cb07f9ba2cd9b`, `registrar_movimiento_kardex`
  `3244bea23b57ef0cb9cffffd97aaaef0`, `rol_actual_en`
  `6844a678ff1bbe4962dbba652524ffb7`.

Estos valores se repitieron sin cambios después de cada paso.

## Pasos

| Paso | Script / acción | SHA-256 aplicado | Resultado | Verificación |
|---|---|---|---|---|
| 1 | `macro1_01_public.sql` | `255d4ce2…1b6e13` | Success | Políticas de prestamos, detalle_prestamo y ministerios; 0 discrepancias en 208 privilegios; `anon` sin EXECUTE |
| 2 | `endurecimiento_186_30Y2.sql` (Kardex Y.2) | `96b2b67d…2c8a61` | Success | movimientos: solo SELECT para Administrador y Coordinador; 17 concesiones |
| 3 | Storage S1/S2 desde el Dashboard | n/a (manual) | 6 políticas | Ver «Storage» abajo |
| 4 | `macro1_verificacion.sql` V-1 a V-5 | `d6850635…91ccef3` (v1) | Correcto | V-6 (simulación por rol) omitida |
| 5 | `sec_db02_00_instantanea.sql` | `44f01fff…220d1a` | 45 entradas | Instantánea y reversión rellenada guardadas fuera del repositorio |
| 6 | `sec_db02_01_privilegios_modulos.sql` | `517e6163…294707` | Success | Precondiciones P-2..P-7 verificadas antes; 17 políticas nuevas; DELETE retirado de módulos nuevos; auditoría solo lectura; valores predeterminados sin `anon` |
| 7 | `sec_db02_02_participantes_fk.sql` | `14487c79…76e255` | Success | Ambas FK en ON DELETE RESTRICT, ON UPDATE NO ACTION, validadas |
| 8 | `sec_db05_participantes_unicidad.sql` | `3ce13f6a…e2e854` | Success | `UNIQUE (encuentro_id, matrimonio_id)` validada; 0 duplicados |
| 9 | `sec_db01_v2_diagnostico.sql` | `93aae5f2…4b499b` (v2.2) | Sin alertas críticas | Ejecutado por el MCP como consulta única con salida filtrada a alertas y secciones de control (no byte a byte) |

## Storage

Políticas finales de `storage.objects` (todas permisivas):

| Nombre real | Operación | Rol | Expresión |
|---|---|---|---|
| `Permitir ver fotografías 1o9u66w_0` | SELECT | public | `bucket_id = 'matrimonios'` |
| `Permitir ver imágenes` | SELECT | public | `bucket_id = 'articulos'` |
| `matrimonios_fotos_insert_gestion 1o9u66w_0` | INSERT | authenticated | matrimonios y rol Administrador, Coordinador o Secretaría |
| `articulos_imagenes_insert_admin 99a5fc_0` | INSERT | authenticated | articulos y rol Administrador |
| `articulos_imagenes_update_admin 99a5fc_0` | UPDATE | authenticated | USING igual; WITH CHECK vacío, por lo que PostgreSQL aplica USING |
| `articulos_imagenes_delete_admin 99a5fc_0` | DELETE | authenticated | articulos y rol Administrador |

- Se eliminaron las cuatro políticas de escritura auditadas (incluida la
  subida anónima a matrimonios) y las dos SELECT auxiliares con sufijo `_1`
  que añadió el Dashboard.
- El Dashboard añade sufijos que no se pueden renombrar. Por eso, en la
  versión 2.3 del diagnóstico y en la versión 2 de
  `macro1_02_storage_reversion.sql` se usan los nombres reales.
- Los dos buckets siguen públicos (SEC-02 pendiente, por decisión del responsable).

## Reversión

| Paso | Reversión | Ejecutor compatible |
|---|---|---|
| 1 | `macro1_01_public_reversion.sql` | `postgres` (SQL Editor) |
| 2 | `reversion_186_30Y2.sql` | `postgres` |
| 3 | `macro1_02_storage_reversion.sql` v2 | Solo un rol miembro de `supabase_storage_admin`. Con `postgres` aborta en R-1 sin cambios; usar el procedimiento del Dashboard descrito en su cabecera |
| 6 | `sec_db02_01_reversion.sql` con la instantánea del paso 5 pegada en el marcador | `postgres` |
| 7 | `sec_db02_02_participantes_fk_reversion.sql` | `postgres` |
| 8 | `sec_db05_participantes_unicidad_reversion.sql` | `postgres` |

Revertir en orden inverso (8 → 1). Ninguna reversión borra registros.
Las reversiones 3 y 1 reabren vulnerabilidades (subida anónima y
escrituras directas); solo deben usarse ante un fallo que lo justifique.

## Verificación local de la rama de publicación

Rama `release/integracion-macro1`, creada desde `40dd555`:

- 184 pruebas aprobadas, 0 fallidas: las 174 integradas más 10 de
  `tests/usuarios-api.test.cjs` (4 de la protección de la propia cuenta en
  DELETE y 6 del funcionamiento sin clave administrativa), con dobles en
  memoria, sin red ni SQL.
- TypeScript, ESLint y build aislado aprobados.

```powershell
npm test
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run lint
node scripts/build-isolated.cjs
```

`npm test` ejecuta todos los archivos `tests/*.test.cjs`. El comando de
`03-CONTRATOS-OPERACION.md` omite `integracion.test.cjs` y
`usuarios-api.test.cjs`, por lo que solo ejecuta 144.

## Entornos sin clave administrativa (Vercel Preview)

`SUPABASE_SERVICE_ROLE_KEY` solo está configurada en el entorno
Production de Vercel y no debe habilitarse en Preview. Desde
`lib/supabase/admin.ts` v2 el cliente administrativo se crea de forma
diferida (`obtenerSupabaseAdmin()`), solo en el servidor, y nunca al
importar el módulo. El build ya no depende de la clave.

Sin la clave:

| Función | Ruta | Comportamiento |
|---|---|---|
| Crear usuario | `POST /api/administracion/usuarios` | 503 «La administración de usuarios no está disponible en este entorno.» |
| Editar usuario, rol o estado | `PUT /api/administracion/usuarios/[id]` | 503, sin modificar nada |
| Eliminar usuario | `DELETE /api/administracion/usuarios/[id]` | 503, sin inactivar ni borrar |

- La autorización se evalúa antes de pedir el cliente. Sin sesión, la
  respuesta sigue siendo 401, y para un rol distinto de Administrador, 403.
- No hay clave alternativa ni degradación de controles: sin la clave no
  existe cliente administrativo.
- Todo lo demás funciona igual en Preview, porque usa la clave pública y
  RLS: inicio de sesión, menús por rol, consulta de usuarios, inventario,
  préstamos, Kardex, matrimonios y módulos de operación. Si Preview apunta
  a la base de datos de producción, sus escrituras son reales: en Preview
  solo deben hacerse pruebas de lectura.
- `scripts/build-isolated.cjs` ya no define la clave, para reproducir las
  condiciones de Preview. El build anterior la definía con un valor
  ficticio y por eso no detectó el fallo.

## Pendientes

- SEC-02: bucket `matrimonios` público (listado y descarga sin sesión).
- SEC-07: borrar un perfil deja préstamos, movimientos y matrimonios sin
  autor (SET NULL); con asignaciones en `equipos_servicio` el borrado falla
  después de eliminar la cuenta Auth y el perfil queda inactivo.
- Cascadas de `detalle_prestamo → prestamos` y de `rol_permisos`; ningún
  cliente tiene DELETE en esas tablas.
- `permisos` y `rol_permisos`: RLS sin políticas; la aplicación no las usa.
- Valores predeterminados de `supabase_admin` en `public` que incluyen a
  `anon` (configuración de la plataforma).
- Rol Matrimonio (`sec_db02_03_matrimonio_BORRADOR.sql`).
- Revocar la autorización OAuth temporal del MCP.
