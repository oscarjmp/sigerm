# Base de Datos SIGERM

## Motor

PostgreSQL administrado por Supabase.

---

# Tablas principales

## articulos

Almacena todos los artículos del inventario.

Campos principales

- id
- codigo
- nombre
- categoria
- descripcion
- cantidad
- estado
- ubicacion
- imagen
- activo
- created_at

---

## prestamos

Almacena cada préstamo realizado.

Campos principales

- id
- folio
- solicitante
- responsable
- fecha_prestamo
- fecha_devolucion
- estado
- observaciones

---

## detalle_prestamo

Relaciona los artículos con cada préstamo.

Campos principales

- id
- prestamo_id
- articulo_id
- cantidad

---

## usuarios

Almacena los usuarios del sistema.

Campos principales

- id
- auth_id
- nombre
- apellido_paterno
- apellido_materno
- email
- telefono
- activo
- rol_id

---

## roles

Catálogo de roles del sistema.

---

# Relaciones

usuarios
↓

roles

prestamos
↓

detalle_prestamo

detalle_prestamo
↓

articulos

---

# Seguridad

Todas las tablas utilizan:

- Row Level Security (RLS)
- Políticas de acceso
- Supabase Auth