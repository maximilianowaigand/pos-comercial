# POS Panaderia

Sistema de punto de venta para panaderia, desarrollado como aplicacion de escritorio con Electron y una interfaz web en React. Permite administrar productos, registrar ventas, consultar historial, imprimir tickets y visualizar metricas del negocio.

## Descripcion

POS Panaderia centraliza la operacion diaria de caja en una sola aplicacion. El frontend esta construido con React y Vite, el backend expone una API REST con Express y los datos se guardan localmente en SQLite.

El proyecto tambien incluye integracion para impresora termica, exportacion de ventas a Excel, dashboard de estadisticas y una base preparada para analisis SQL.

## Funcionalidades

- Registro de ventas con detalle de productos, cantidades, metodo de pago y descuentos.
- Gestion de productos con nombre, precio, costo y categoria.
- Busqueda y filtrado de productos por categoria.
- Historial de ventas con detalle y reimpresion de tickets.
- Dashboard con totales, clientes, ticket promedio, comparativas y ventas por hora.
- Exportacion de ventas a Excel.
- Impresion de tickets mediante impresora termica.
- Persistencia local con SQLite.
- Empaquetado como aplicacion de escritorio con Electron.

## Tecnologias

- React
- Vite
- Node.js
- Express
- SQLite
- Electron
- node-thermal-printer
- ExcelJS

## Estructura del proyecto

```text
.
+-- backend/      API REST, base SQLite, servicios y controladores
+-- database/     Scripts SQL de esquema, datos iniciales y consultas
+-- electron/     Configuracion de la aplicacion de escritorio
+-- frontend/     Interfaz React/Vite
+-- dist/         Salida generada para distribucion
+-- package.json  Scripts principales del proyecto
```

## Requisitos

- Node.js
- npm
- Windows, si se va a usar el empaquetado portable configurado para Electron

## Instalacion

Desde la raiz del proyecto:

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

## Uso en desarrollo

Para levantar backend, frontend y Electron al mismo tiempo:

```bash
npm run dev
```

Servicios utilizados:

- Frontend: `http://localhost:3000`
- Backend/API: `http://localhost:3001`

Tambien se pueden ejecutar por separado:

```bash
npm run dev:frontend
npm run dev:backend
npm run electron
```

## Build

Para compilar el frontend:

```bash
npm run build
```

Para generar la aplicacion de escritorio portable:

```bash
npm run dist
```

## API principal

Algunas rutas disponibles:

- `GET /api/productos`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`
- `GET /api/ventas`
- `POST /api/ventas`
- `GET /api/ventas/:id`
- `GET /api/ventas/total-dia`
- `GET /api/ventas/total-mes`
- `GET /api/stats/dashboard`
- `GET /api/export-excel`
- `POST /api/print`

## Base de datos

La aplicacion usa SQLite y crea las tablas necesarias desde el backend. Los scripts de referencia estan en `database/`:

- `sqlite-schema.sql`: estructura de tablas, indices y triggers.
- `seed.sql`: datos iniciales de ejemplo.
- `analitycs-queries.sql`: consultas para analizar ventas.

Tablas principales:

- `productos`
- `ventas`
- `detalle_venta`
- `clima`

## Autor

Maximiliano Waigand
