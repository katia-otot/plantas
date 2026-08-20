# Plantas del patio

Web para llevar el control de plantas del patio: riego por estación, postergar por lluvia, fertilizante, poda, anti-bichos e historial con fotos.

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
npm install
npm run db:push
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el celular o la PC (misma red Wi‑Fi si usás el celular).

## Uso

1. **Hoy**: tareas pendientes y acciones rápidas.
2. **Plantas**: listado y alta de plantas con intervalos de riego verano/invierno.
3. **Ficha**: historial, fotos, botones Regué / Fertilicé / Podé / Tratamiento. La lluvia se registra desde Hoy.

## Datos

- Base SQLite: `data/app.db`
- Fotos: `data/uploads/`

Hacé backup copiando esas carpetas.

## Producción

```bash
npm run build
npm start
```

Para compartir en casa, podés exponer el puerto 3000 en tu red local o desplegar en un VPS.
