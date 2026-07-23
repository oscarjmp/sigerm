# 02. Base de Datos

## Objetivo

Documentar la estructura completa de la base de datos de SIGERM como fuente oficial del proyecto.

Este documento describe:

- Tablas.
- Columnas.
- Tipos de datos.
- Llaves primarias.
- Llaves foráneas.
- Restricciones.
- Relaciones.
- Reglas de negocio.
- Flujo de información.

Toda la información aquí documentada proviene del esquema real de Supabase del proyecto SIGERM.
---

# Tabla: articulos

## Propósito

Almacena el inventario general de artículos administrados por SIGERM.

## Llave primaria

| Campo | Tipo |
|--------|------|
| id | uuid |

## Columnas

| Campo | Tipo | Nulo | Descripción |
|--------|------|------|-------------|
| id | uuid | No | Identificador único. |
| codigo | varchar | Sí | Código interno del artículo. |
| nombre | varchar | No | Nombre del artículo. |
| categoria | varchar | Sí | Categoría del artículo. |
| descripcion | text | Sí | Descripción del artículo. |
| cantidad | integer | Sí | Existencia total. |
| disponibles | integer | Sí | Existencia disponible. |
| unidad | varchar | Sí | Unidad de medida. |
| estado | varchar | Sí | Estado físico del artículo. |
| ubicacion | varchar | Sí | Ubicación dentro del almacén. |
| imagen | text | Sí | Ruta o URL de la imagen. |
| activo | boolean | Sí | Indica si el artículo permanece activo. |
| es_consumible | boolean | Sí | Define si disminuye definitivamente al utilizarse. |
| created_at | timestamp | Sí | Fecha de creación del registro. |

## Relaciones

La tabla **articulos** se relaciona con:

- detalle_prestamo
- movimientos

mediante el campo **articulo_id**.
