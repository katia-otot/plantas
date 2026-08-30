# Anthos

Web para llevar el control de plantas del patio: riego por estación, postergar por lluvia, fertilizante, poda, anti-bichos e historial con fotos.

*Anthos* (griego antiguo ἄνθος) significa flor.

## Acceso (Google vía Firebase)

El patio se comparte entre cuentas dueñas. Hoy están autorizadas:

- `Nechegoyen90529@gmail.com`
- `katiagadea19@gmail.com`

Cómo funciona: **un solo patio**; cada dueña inicia sesión con Google y ve **los mismos datos** (plantas, pájaros, notas, historial, fotos). No se migran ni se reasignan plantas a usuarios. Las filas existentes en SQLite quedan como están.

### Por qué Firebase Auth (y no OAuth directo a la IP)

Google Cloud rechaza URIs de redirección con IP cruda (`http://149.50.156.136/...`). Firebase Auth usa el dominio autorizado `plantas-patio.web.app` / `plantas-patio.firebaseapp.com`. En el VPS, el botón de login redirige a:

`https://plantas-patio.web.app/auth-login.html`

ahí se firma con Google y se vuelve a `/plantas/login` con un ID token; el servidor lo verifica con **firebase-admin** y crea la sesión Auth.js.

En `localhost` el login puede hacerse en la misma app (popup), si `localhost` está en dominios autorizados de Firebase.

### Configurar en Firebase Console

Proyecto: **plantas-patio** (el mismo de notificaciones FCM).

1. **Authentication** → **Get started** (si aún no) → **Sign-in method** → **Google** → Enable → guardar.
2. **Authentication** → **Settings** → **Authorized domains** — deben figurar:
   - `localhost`
   - `plantas-patio.firebaseapp.com`
   - `plantas-patio.web.app`
   - (opcional más adelante) tu dominio propio; **no** hace falta la IP del VPS.
3. **Project settings** → **Service accounts** → **Generate new private key** → guardar el JSON **solo en el servidor** (nunca en git).

### Variables de entorno

En `.env` local y en el VPS:

```bash
# Sesión Auth.js (obligatorio en producción)
AUTH_SECRET=generá-un-secreto-largo
# Include /plantas (app home). Auth.js API stays at /api/auth internally (Next strips basePath).
AUTH_URL=http://149.50.156.136/plantas
NEXT_PUBLIC_BASE_PATH=/plantas

# Dueñas extra (opcional; las dos de arriba ya están en código)
# AUTH_OWNER_EMAILS=otra@gmail.com

# Firebase Admin (verificar ID tokens + FCM). Una de estas dos:
FIREBASE_SERVICE_ACCOUNT_PATH=/ruta/segura/plantas-patio-firebase-adminsdk.json
# o bien:
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Forzar login en el middleware (recomendado en VPS cuando el service account ya está)
FIREBASE_AUTH_REQUIRED=1

# Cliente web (opcionales; hay defaults del proyecto plantas-patio)
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=plantas-patio.firebaseapp.com
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=plantas-patio
# NEXT_PUBLIC_FIREBASE_APP_ID=...
# NEXT_PUBLIC_FIREBASE_AUTH_BRIDGE_URL=https://plantas-patio.web.app/auth-login.html
```

Ya **no** se usan `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` para el login de la app.

### Bootstrap dueñas (sin tocar plantas)

```bash
npx tsx scripts/bootstrap-patio-owners.ts
```

Solo asegura el garden `default` y los `GardenMember` por email. **No borra** plantas ni historial.

### Deploy del bridge de login (Firebase Hosting)

Tras cambios en `notify-web/public/auth-login.html`:

```bash
cd notify-web
npx firebase deploy --only hosting
```

### Pasos VPS (resumen)

1. Subir código nuevo.
2. Poner `FIREBASE_SERVICE_ACCOUNT_PATH` (o JSON) + `AUTH_SECRET` + `FIREBASE_AUTH_REQUIRED=1`.
3. `npm install && npm run build &&` reiniciar el servicio `plantas`.
4. Desplegar hosting con `auth-login.html` si aún no está.
5. Probar: abrir `/plantas/login` → Google → volver al patio con los mismos datos.

Para agregar otra dueña: sumá el email a `AUTH_OWNER_EMAILS` (separados por coma), corré el bootstrap y reiniciá.

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
