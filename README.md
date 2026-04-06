
 # 🛒 Sistema POS - Gestión y Análisis de Ventas

## 📌 Descripción

Aplicación fullstack de punto de venta (POS) desarrollada para gestionar ventas de un negocio y analizar los datos generados mediante una base de datos SQL.

El sistema permite registrar transacciones, almacenar información de productos y generar métricas clave para la toma de decisiones.

---

## 🚀 Tecnologías utilizadas

* Frontend: React.js
* Backend: Node.js / Express
* Base de datos: SQL (MySQL / PostgreSQL / SQLite)

---

## ⚙️ Funcionalidades

* Registro de ventas en tiempo real
* Gestión de productos
* Persistencia de datos en base de datos relacional
* API REST para comunicación frontend-backend
* Consultas SQL para análisis de datos:

  * Ventas totales
  * Productos más vendidos
  * Ingresos por período

---

## 📊 Ejemplo de consulta SQL

```sql
SELECT producto, SUM(cantidad) AS total_vendido
FROM ventas
GROUP BY producto
ORDER BY total_vendido DESC;
```

---

## 🧠 Aprendizajes

* Desarrollo de aplicaciones fullstack
* Integración entre React y APIs en Node.js
* Diseño y normalización de bases de datos
* Escritura de consultas SQL para análisis de datos
* Manejo de estados y componentes en React

---

## 📦 Instalación y uso

### 1. Clonar el repositorio

```bash
git clone https://github.com/maximilianowaigand/pos-comercial.git
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

---

## 📁 Estructura del proyecto

```
/frontend   → Aplicación React
/backend    → API en Node.js
/database   → Scripts SQL
```

---



## 🎯 Futuras mejoras

* Dashboard con gráficos
* Autenticación de usuarios
* Exportación de reportes
* Deploy en la nube

---

## 👨‍💻 Autor

maximiliano waigand

 # pos-comercial
