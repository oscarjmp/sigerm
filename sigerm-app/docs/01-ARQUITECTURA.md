# SIGERM

# Arquitectura del Sistema

Versión 1.0

---

# Objetivo

Este documento describe la arquitectura oficial del Sistema Integral de Gestión para Encuentros de Renovación Matrimonial (SIGERM).

Toda nueva funcionalidad deberá respetar esta arquitectura.

---

# Stack Tecnológico

Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

Backend

- Supabase

Base de Datos

- PostgreSQL

Infraestructura

- Vercel

Control de versiones

- GitHub

---

# Arquitectura General

SIGERM utiliza una arquitectura modular.

Cada módulo es independiente.

La lógica de negocio permanece separada de la interfaz.

La base de datos es el núcleo del sistema.

---

# Módulos principales

- Inventario
- Préstamos
- Matrimonios
- Encuentros
- Participantes
- Equipos de Servicio
- Usuarios
- Roles
- Configuración
- Auditoría

---

# Modelo General

Roles

↓

Usuarios

↓

Equipos de Servicio

↓

Encuentros

↓

Participantes

↓

Matrimonios

↓

Préstamos

↓

Detalle de Préstamos

↓

Artículos

↓

Movimientos

---

# Principios

- Clean Architecture
- SOLID
- DRY
- KISS
- Componentes reutilizables
- Código limpio
- TypeScript estricto

---

# Objetivo de desarrollo

Todo cambio deberá:

- Mantener compatibilidad.
- Evitar duplicidad.
- Ser escalable.
- Ser documentado.