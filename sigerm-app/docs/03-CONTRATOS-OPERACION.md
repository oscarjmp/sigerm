# SIGERM — consolidación MACRO-INTEGRATION-01

Fecha: 25 de noviembre de 2026.
Worktree: C:\Users\Usuario\Documents\GitHub\sigerm-codex.
Rama: feature/encuentros.
Base: 347d66e8af12b4cc5b70033253b52b165dc4e888.

Este documento sustituye los estados provisionales de DEV-01/02/03.
Los cuatro módulos son exclusivos del Administrador en esta etapa.
No se integran ramas ni se modifican producción, roles, RLS o seguridad
de usuarios. El commit local está autorizado; no se autoriza push/despliegue.

## Funcionalidad consolidada

| Módulo | Operaciones |
| --- | --- |
| Encuentros | Directorio, detalle, alta, edición, fechas opcionales, sede, estado, consecutivo identity, búsqueda, filtros e indicadores |
| Participantes | Inscripción por matrimonio, habitación, observaciones, edición parcial e historial de inscripciones |
| Equipos de servicio | Asignación por encuentro y usuario, área, cargo, directorio y edición parcial |
| Configuración | Alta y edición explícita por id de múltiples organizaciones, parroquias y ubicaciones; no singleton |

Se reutilizan MainLayout, SigermHero, SectionCard, StatCard, PremiumCard,
DataTable, SearchInput, EmptyState, Loader y Sonner. La UI conserva grids
responsivos, controles accesibles, tablas desplazables, búsqueda sin acentos,
botones de agrupación accesibles y estados de carga, vacío/error y guardado.
No hay borrado físico ni nuevas operaciones de materiales.

## K-2: referencias históricas nulas

Lecturas admitidas:
- participantes.encuentro_id y participantes.matrimonio_id pueden ser null.
- equipos_servicio.encuentro_id y equipos_servicio.usuario_id pueden ser null.
- La interfaz muestra Sin asignar para esos null; un UUID no visible se
  distingue como referencia no disponible.

Altas:
- Se requieren UUID válidos de encuentro y matrimonio en Participantes.
- Se requieren UUID válidos de encuentro y usuario en Servicio.
- Se comprueba existencia/visibilidad y estado activo de la persona elegida.

Edición:
- Participantes y Servicio envían únicamente los campos modificados.
- Un valor nulo, inactivo o no visible que se conserva no se reenvía ni
  obliga a completar campos ajenos a la modificación.
- Habitación/observaciones o área/cargo se pueden editar aunque las FK
  históricas sigan nulas o los catálogos no estén disponibles.
- Una referencia modificada exige UUID válido y validación en servidor.
  No se admite vaciar una referencia asignada enviando null o cadena vacía.
- Si cambia solo una FK de Participantes, se consulta la otra FK actual
  del servidor para comprobar duplicidad cuando el par esté completo.
- Un patch vacío no ejecuta UPDATE. Las actualizaciones se limitan por id
  y solo se confirman al devolver exactamente una fila válida del mismo id.

Este tratamiento no cambia las restricciones SQL ni amplía políticas.
Claude debe mantener compatibles los WITH CHECK con la conservación de
null históricos; una regla global que exija completar todas las FK en cada
UPDATE puede seguir rechazando estos registros aunque el cliente sea correcto.

## Contratos utilizados

| Tabla | Columnas reales utilizadas | Relaciones / operaciones |
| --- | --- | --- |
| encuentros | id, nombre, numero, fecha_inicio, fecha_fin, sede, estado, created_at | SELECT/INSERT/UPDATE; id y numero generados por BD |
| participantes | id, encuentro_id, matrimonio_id, habitacion, observaciones, created_at | FK a encuentros/matrimonios; SELECT/INSERT/UPDATE parcial |
| equipos_servicio | id, encuentro_id, usuario_id, area, cargo, created_at | FK a encuentros/usuarios; SELECT/INSERT/UPDATE parcial |
| configuracion | id, organizacion, parroquia, ciudad, estado, pais, created_at | SELECT/INSERT/UPDATE; múltiples filas |
| matrimonios | id, esposo, esposa, activo | Solo SELECT de catálogo |
| usuarios | id, nombre, apellido_paterno, apellido_materno, activo | Solo SELECT mínimo de catálogo |
| ministerios | nombre | Solo SELECT en Configuración |

Encuentros: nombre máximo 150, sede 200, estado 30; las fechas son opcionales
y el término no puede ser anterior al inicio cuando ambas existen.
Participantes: habitación 20 y observaciones opcionales; límite de aplicación
de 4000 caracteres para observaciones, no un límite SQL supuesto.
Servicio: área/cargo máximo 100, obligatorios al crear; al editar solo se
validan los campos proporcionados. Configuración: organización hasta 200,
parroquia 200, ciudad/estado/país 100; campos de ubicación opcionales.

Las altas de Participantes, Servicio y Configuración generan UUID en servidor.
No se aceptan ids de alta ni campos arbitrarios del formulario. Los campos
propuestos de capacidad, asistencia, estado de participación, ministerio_id,
matrimonio_id de servicio y auditoría ficticia no se persisten.

Los contratos se contrastaron localmente con el CSV recuperado recibido.
La equivalencia con DATA-CONTRACT-01 original y el estado remoto vigente debe
confirmarla Claude. El CSV no es parte del commit ni una dependencia de tests.
SHA256 de referencia: 20D752E794BB63534304BA594D1991F727D8D1590915A1323D6FFBF465B692A1.

## Autorización y Sidebar

Las cuatro páginas y cada Server Action usan requerirAdministradorOperacion,
que primero reutiliza requerirPermiso y después exige ROLES.ADMINISTRADOR.
El cliente también oculta la interfaz para otros roles. No basta con ocultar
botones. No se modificaron lib/auth, roles ni la matriz compartida.

| Módulo | Permiso de lectura | Alta / edición | Condición adicional |
| --- | --- | --- | --- |
| Encuentros | VER_ENCUENTROS | CREAR_ENCUENTRO / EDITAR_ENCUENTRO | Administrador |
| Participantes | VER_ENCUENTROS | CREAR_ENCUENTRO / EDITAR_ENCUENTRO | Administrador |
| Servicio | VER_SERVIDORES | CREAR_SERVIDOR / EDITAR_SERVIDOR | Administrador |
| Configuración | ADMINISTRAR_CONFIGURACION | ADMINISTRAR_CONFIGURACION | Administrador |

El catálogo de matrimonios mantiene VER_MATRIMONIOS. El de usuarios requiere
visibilidad RLS de usuarios y no solicita contactos, roles ni auth_id.
La correspondencia específica de permisos de Participantes debe ratificarse
con Claude, sin habilitar otros roles en esta etapa.

lib/operacion/permisos.ts exporta navegacionOperacion con las cuatro rutas
y soloAdministrador=true, preparado para el Sidebar futuro. Claude debe
aplicar tanto el permiso existente como la condición de Administrador.
No se modificó components/layout/Sidebar.tsx para evitar superponer su trabajo.

## Errores y confirmación

- PostgreSQL 23505: registro duplicado; no se muestra éxito.
- PostgreSQL 23503: referencia inexistente o restricción de integridad;
  no se muestra éxito ni se expone el diagnóstico interno.
- Denegaciones RLS/perfil, cero filas, respuesta incompatible y fallos de red
  se manejan sin confirmación falsa.
- Un fallo de red con resultado incierto solicita revisar el directorio antes
  de reintentar; no presupone que el servidor rechazó ni guardó el registro.
- Un fallo de refresco posterior a confirmación conserva el éxito y solicita
  recargar la vista.
- Un ref bloquea envíos inmediatos repetidos; los controles del formulario
  se bloquean mientras se procesa. No es idempotencia distribuida.
- Las consultas paginadas detectan totales cambiantes e ids repetidos;
  no se promete un snapshot transaccional.

## Verificación final

Se aprovechó la suite previa de 108 pruebas y se añadieron 36 de K-2,
edición parcial, errores, Administrador y acceso a páginas antes de consultas.

- Pruebas: 144 aprobadas, 0 fallidas.
- TypeScript: aprobado.
- ESLint del bloque: aprobado, sin errores ni advertencias.
- ESLint completo: 1 error preexistente en UsuarioForm.tsx:75; 0 advertencias, pendiente de Claude.
- Build aislado completo: aprobado, compilación, TypeScript y generación de páginas 20/20.
- git diff --check: sin errores de espacios.

Las pruebas son unitarias, de eventos de componentes, renderizado estático
y persistencia/concurrencia simulada. No se utilizaron registros reales.
No sustituyen pruebas autenticadas de RLS ni revisión visual en dispositivos.
No se repitió una auditoría completa ni se crearon entornos piloto.

Comandos reproducibles:

```powershell
node --test tests/operacion.test.cjs tests/persistencia.test.cjs tests/calidad.test.cjs tests/macro-integracion.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run lint
node scripts/build-isolated.cjs
```

El build usa valores ficticios solo en su proceso y bloquea conexiones de
datos por fetch/http/https; solo permite Google Fonts. No crea .env.local.
Los placeholders no son credenciales. No publicar esos artefactos: requieren
recompilación con configuración autorizada en el proceso de integración.

## Dependencias pendientes de Claude

1. Confirmar/aplicar privilegios y RLS de los cuatro módulos, solo Administrador,
   y acceso a los catálogos existentes. Las denegaciones pueden verse como
   cero filas; la aplicación no puede deducir inexistencia global.
2. Garantizar UNIQUE(encuentro_id, matrimonio_id) para evitar inscripciones
   simultáneas duplicadas. La preconsulta de aplicación no evita la carrera.
   No se aplicó SQL ni se eliminaron duplicados existentes.
3. Mantener K-2 compatible con las políticas de UPDATE y los null históricos.
   Validar actividad/visibilidad de nuevas referencias de forma atómica si
   se requiere proteger contra desactivación concurrente.
4. Resolver UsuarioForm.tsx:75, react-hooks/set-state-in-effect. Ese archivo
   gestiona usuarios/roles/activo y no fue modificado por Codex.
5. Acordar prevención de sobrescrituras por edición concurrente; no hay campo
   de versión/updated_at en estas tablas. No se inventó uno.
6. Confirmar procedencia y vigencia del contrato original y reglas de
   duplicidad de servicio/configuración antes de imponer restricciones.
7. Coordinar la transición general a Administrador/Matrimonio. Codex no
   modifica el catálogo de roles ni implementa aún solicitudes de materiales,
   autorizaciones, entregas, vales, consumibles/retornables, devoluciones,
   existencias o adquisiciones.
8. Capacidad de encuentros permanece expresamente fuera del alcance.

## Inventario para integración

Contenido funcional propio: 30 archivos nuevos y 7 archivos compartidos
modificados (37 archivos previstos para el commit).

Nuevos:
- app/{encuentros,participantes,equipos-servicio,configuracion}/{page,loading,error}.tsx
- components/operacion/{FormularioOperacion,OperacionCliente}.tsx
- lib/operacion/{modelos,contrato,catalogos,permisos,repositorio,acciones,autorizacion}.ts
- scripts/{build-isolated,build-network-guard}.cjs
- tests/{operacion,persistencia,calidad,macro-integracion}.test.cjs
- tests/helpers/{operacion,interaccion}.cjs
- docs/03-CONTRATOS-OPERACION.md

Compartidos que requieren revisar diffs con Claude:
- components/ui/{SearchInput,EmptyState,Loader,DataTable}.tsx
- components/matrimonios/MatrimonioForm.tsx: únicamente carga de ministerios.
- components/inventario/ArticuloForm.tsx: únicamente vista previa Next Image.
- lib/pdf/prestamoPdf.ts: únicamente tipado de lastAutoTable.
- Sidebar.tsx: futura integración; sin cambios desde Codex.

Se excluyen CSV de metadatos, .env, credenciales, secretos, node_modules,
.next, logs, tsbuildinfo y temporales mediante selección explícita de paths.
No se usa git add indiscriminado. El CSV recibido se conserva sin modificar
y permanece fuera del commit.

## Estrategia futura, sin ejecutarla

1. Claude consolida la seguridad y resuelve las dependencias anteriores.
2. Revisar manualmente los siete archivos compartidos, Sidebar, nuevas rutas
   y posibles coincidencias con security/macro1; conservar la seguridad de su autor.
3. Integrar únicamente tras autorización humana, tomando la seguridad revisada
   como base. No reemplazar archivos completos para resolver conflictos.
4. Repetir verificaciones sobre el resultado integrado y realizar pruebas
   de perfiles/RLS/concurrencia en el destino expresamente autorizado.
5. Recompilar con configuración autorizada antes de cualquier publicación.

El commit local consolida el bloque funcional, no acredita seguridad remota
ni autoriza integración, push o despliegue.
