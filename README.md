# POS Panaderia

Sistema de punto de venta para panaderia, desarrollado como aplicacion de escritorio con Electron y una interfaz web en React. Permite administrar productos, registrar ventas, consultar historial, imprimir tickets y visualizar metricas del negocio.

## Descripcion

POS Panaderia centraliza la operacion diaria de caja en una sola aplicacion. El frontend esta construido con React y Vite, el backend expone una API REST con Express y los datos se guardan localmente en SQLite.

El proyecto tambien incluye facturacion electronica por ARCA, impresion de tickets, exportacion de ventas a Excel, dashboard de estadisticas y una base preparada para analisis SQL.

## Funcionalidades

- Registro de ventas con detalle de productos, cantidades, metodo de pago y descuentos.
- Gestion de productos con nombre, precio habitual, costo y categoria.
- Promociones por fecha de finalizacion o por cupo de unidades, con aplicacion automatica del precio promocional en el POS.
- Busqueda y filtrado de productos por categoria.
- Historial de ventas con detalle y reimpresion de tickets.
- Dashboard con totales, clientes, ticket promedio, comparativas y ventas por hora.
- Exportacion a Excel preparada para Power BI: ventas, detalle de productos, pagos, movimientos de caja, arqueos y clima.
- Impresion de tickets y carteles de oferta para productos en promocion mediante la impresora termica configurada.
- Gestion de caja con ingresos, egresos, pagos recurrentes, apertura, arqueo y cierre diario.
- Facturacion electronica directa con ARCA, perfiles de emisor y cola de reintentos.
- Persistencia local con SQLite.
- Empaquetado como aplicacion de escritorio con Electron.

## Tecnologias

- React
- Vite
- Node.js
- Express
- SQLite
- Electron
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

## Tests automatizados

Las pruebas del backend usan una base SQLite temporal, por lo que no modifican
los productos ni ventas de la aplicacion.

```bash
npm --prefix backend test
```

Actualmente verifican el registro de ventas con descuento, la validacion de
pagos, los pagos mixtos y los movimientos manuales de caja.

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
- `POST /api/print-promo/:productId`
- `GET /api/arca/perfiles`
- `GET /api/arca/test`

## Base de datos

La aplicacion usa SQLite y crea las tablas necesarias desde el backend. Los scripts de referencia estan en `database/`:

- `sqlite-schema.sql`: estructura de tablas, indices y triggers.
- `seed.sql`: datos iniciales de ejemplo.
- `analitycs-queries.sql`: consultas para analizar ventas.

Tablas principales:

- `productos`
- `ventas`
- `detalle_venta`
- `pagos_venta`
- `movimientos_caja`, `movimientos_recurrentes` y `pagos_movimiento`
- `cierres_caja_diaria` y `cierres_balance_mensual`
- `facturacion_queue`
- `clima_diario`

Los productos pueden tener un precio promocional, una fecha limite, un cupo de unidades y un motivo. La promocion termina al llegar la fecha o agotarse el cupo, lo que ocurra primero. El POS muestra el precio habitual y el promocional, separa las unidades con descuento de las restantes y guarda el precio aplicado en el detalle de la venta.

Desde la lista de productos tambien se puede imprimir un cartel de oferta con el nombre del producto y ambos precios. El cartel se envia a la impresora termica configurada para los tickets.

## Power BI

La exportacion de Excel genera un modelo con hojas relacionadas para importar en Power BI:

- `Ventas` y `Detalle ventas`, relacionadas por `Id venta`.
- `Detalle ventas` y `Productos`, relacionadas por `Id producto`.
- `Pagos ventas` para analizar pagos mixtos por venta.
- `Movimientos caja`, `Pagos movimientos` y `Arqueos caja` para flujo y control de efectivo.
- `Clima`, relacionable con las tablas de ventas por `Fecha`.

El archivo incluye una hoja `Guia Power BI` que documenta el propósito de cada tabla.

## Autor

Maximiliano Waigand
