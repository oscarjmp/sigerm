# SIGERM — consolidación MACRO-INTEGRATION-02

Fecha: 25 de noviembre de 2026.
Worktree: C:\Users\Usuario\Documents\GitHub\sigerm-codex.
Rama: feature/encuentros.
Base integrada: 802d59cecbe0b7721c73c47d7a76bc2e832a4cc0.

Este documento sustituye los estados provisionales de DEV-01/02/03.
Los cuatro módulos son exclusivos del Administrador en esta etapa.
La integración local mediante rebase está autorizada. No se modifica
producción ni se ejecuta SQL; no se autoriza push, integración con main
ni despliegue. Se preservan las correcciones de seguridad de Claude.

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
botones. Se conserva la matriz de Claude; no se conceden permisos a otros roles.

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
y soloAdministrador=true. Sidebar ya consume esas entradas y comprueba tanto
el permiso existente como el rol Administrador. Se preservan sus enlaces
previos y el Sidebar móvil reutiliza el mismo componente.

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

Se conservaron las 144 pruebas anteriores y se agregaron 30 pruebas de
integración del menú, permisos, middleware e integridad de scripts.

- Pruebas: 174 aprobadas, 0 fallidas.
- TypeScript: aprobado.
- ESLint del bloque: aprobado, sin errores ni advertencias.
- ESLint completo: aprobado, 0 errores y 0 advertencias; corrección de UsuarioForm conservada desde 802d59c.
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

## Dependencias y acuerdos de producción

1. Confirmar/aplicar privilegios y RLS de los cuatro módulos, solo Administrador,
   y acceso a los catálogos existentes. Las denegaciones pueden verse como
   cero filas; la aplicación no puede deducir inexistencia global.
2. Garantizar UNIQUE(encuentro_id, matrimonio_id) para evitar inscripciones
   simultáneas duplicadas. La preconsulta de aplicación no evita la carrera.
   No se aplicó SQL ni se eliminaron duplicados existentes.
3. Mantener K-2 compatible con las políticas de UPDATE y los null históricos.
   Validar actividad/visibilidad de nuevas referencias de forma atómica si
   se requiere proteger contra desactivación concurrente.
4. Resuelto localmente: UsuarioForm.tsx:75 fue corregido por Claude en
   802d59c y se conserva sin modificaciones adicionales.
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

Contenido del commit funcional original: 30 archivos nuevos y 7 archivos compartidos
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
- Sidebar.tsx: integrado en esta etapa; controles exclusivos de Administrador.

Se excluyen CSV de metadatos, .env, credenciales, secretos, node_modules,
.next, logs, tsbuildinfo y temporales mediante selección explícita de paths.
No se usa git add indiscriminado. El CSV recibido se conserva sin modificar
y permanece fuera del commit.

## Integración local realizada

- Claude: fa770150c70cf044f941bd4db70c9502b69aa167 y
  802d59cecbe0b7721c73c47d7a76bc2e832a4cc0, conservados como ancestros.
- Codex original: eb543807bc46bfb896bd541f891549a89590c92b.
- Codex reaplicado: ff24ec73a3921b1f13863cb262b92a6cbe6cbdfb.
- Rebase de feature/encuentros sobre security/macro1 completado sin conflictos.
  git range-diff confirmó que el parche funcional se conservó idéntico.
- Los archivos de seguridad, UsuarioForm, middleware, matriz de permisos,
  .gitignore y SQL son idénticos a los de 802d59c.
- Los 16 hashes de SHA256SUMS coinciden con los bytes de los scripts locales.
  Esta comprobación solo lee archivos; no ejecuta SQL.
- Sidebar incorpora Encuentros, Participantes, Equipos de servicio y
  Configuración. Exige sesión, permiso de lectura y rol Administrador.
  El Sidebar móvil reutiliza el mismo componente.
- Conservados K-2, altas con referencias obligatorias, ediciones históricas
  parciales, bajas lógicas existentes, errores 23505/23503 y ausencia de
  borrado físico en los nuevos módulos.
- La regla de Claude ignora el CSV recuperado. No se versionan CSV,
  credenciales, secretos ni artefactos temporales.

### Resultado integrado

174 pruebas aprobadas, 0 fallidas: 144 previas y 30 de integración.
TypeScript aprobado. ESLint general aprobado, 0 errores y 0 advertencias.
Build aislado aprobado: compilación, tipos, generación 20/20 y optimización
final. No se utilizaron datos reales ni conexiones a Supabase en las pruebas.

Las pruebas nuevas cubren Sidebar por rol, permisos retirados a otros
perfiles, sesiones, rutas protegidas anidadas, conservación de cookies,
enlace activo e integridad de los scripts.

### Cambios adicionales al commit funcional original

- components/layout/Sidebar.tsx
- lib/operacion/permisos.ts
- tests/integracion.test.cjs
- docs/03-CONTRATOS-OPERACION.md

El commit definitivo de esta etapa se registra encima del commit funcional
reaplicado; su identificador se obtiene con git log -1.

### Límites y pendientes externos

No hay bloqueos para la integración local. Los scripts RLS, privilegios,
FK e integridad UNIQUE están incorporados como archivos, pero no se ejecutaron.
Su aplicación y validación remota requieren autorización independiente.
Los ensayos locales no certifican el estado actual de la base de producción.

No se modificó el worktree de Claude; permanece en security/macro1.
No se hizo push, merge con main, rebase de otra rama ni despliegue.
No se crearon copias ni worktrees adicionales. El siguiente paso productivo
debe autorizarse por separado y recompilarse con configuración apropiada;
los artefactos del build ficticio no deben desplegarse.
