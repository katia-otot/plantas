# Problemas resueltos

Registro vivo de incidentes y soluciones del proyecto Plantas/Anthos.  
**Orden:** lo más reciente arriba. El agente debe consultar este archivo antes de depurar.

---

## 2026-09-01 — Avisos push: cron vs scheduler interno

**Síntoma:** Confusión sobre crontab cada minuto; horario del menú no coincidía con envíos en producción.

**Contexto:** Notificaciones FCM/Web Push; horario configurable en menú (`GardenSettings`).

**Causa:** El envío programado dependía del crontab del VPS (horarios fijos o polling cada minuto), separado del horario guardado en la app.

**Solución:** Scheduler interno (`lib/notification-scheduler.ts` + `instrumentation.ts`). Al arrancar `plantas` y al guardar horario en el menú, la app programa el próximo aviso. **Quitar** entradas de `notify-today` del crontab para no duplicar.

**Prevención:** Tras deploy, verificar `journalctl -u plantas | grep notification-scheduler`. Prueba manual: botón en menú o `scripts/notify-today.sh`.

---

## 2026-08-30 — Deploy deja `app.db` en 0 bytes (base anidada en `data/data/`)

**Síntoma:** Tras deploy, la app da error 500 (`digest: 2665091590`); `app.db` pesa 0 bytes; login roto; fotos desaparecen.

**Contexto:** Script de deploy con tarball que incluía `data/.gitkeep` + `cp -a` sobre destino ya existente.

**Causa:** Dos bugs en el script viejo:
1. El tarball extraía `data/` en `plantas.new` **antes** del `cp -a`. Con el destino ya creado, Linux copia la carpeta **adentro** → queda `data/data/app.db` (la real) y `data/app.db` vacío (0 bytes).
2. El fallback `|| mkdir -p .../uploads` **ocultaba** el fallo del copy y el deploy seguía igual.

**Solución inmediata:**
1. `systemctl stop plantas`
2. Restaurar DB: `cp -a /opt/plantas.old/data/app.db /opt/plantas/data/app.db`
3. Restaurar uploads desde `/opt/plantas.old/data/uploads/`
4. `prisma db push` → `migrate-multi-garden.ts` → `npm run build` → `systemctl restart plantas`

**Prevención (obligatorio):**
- Usar **`python scripts/deploy-vps.py`** (excluye `data/` del tarball, borra `plantas.new/data` antes de copiar, verifica tamaño de DB, build en `.new` antes del swap).
- **Nunca** `cp -a origen/data destino/data` si `destino/data` ya existe — siempre `rm -rf destino/data` primero.
- **Nunca** `|| mkdir` como fallback silencioso en pasos críticos.
- Parar `plantas` **antes** de copiar archivos.

---

## 2026-08-30 — Deploy al VPS borra o deja vacío `data/uploads/`

**Síntoma:** Después de subir código al VPS, las portadas de plantas/pájaros dan 404; `data/uploads/` vacío o solo `.gitkeep`; la DB sigue referenciando fotos que ya no existen en disco.

**Contexto:** Deploy a producción (`/opt/plantas`, `http://149.50.156.136/plantas`).

**Causa:** El tarball de deploy no incluye fotos ni `app.db` del patio (en local no están las del servidor). Extraer código encima de `/opt/plantas` sin preservar `data/` pisa o vacía `uploads/`.

**Solución:**
1. Backup remoto: `cp -a /opt/plantas/data /opt/plantas/data.bak-$(date +%F)`.
2. Subir código a `/opt/plantas.new`, no directo sobre `data/`.
3. Copiar data intacta: `cp -a /opt/plantas/data /opt/plantas.new/data`.
4. Swap atómico de directorios.
5. Si `uploads/` quedó vacío, restaurar desde `/opt/plantas.old/data/uploads/`.
6. Verificar referencias rotas en SQLite y HTTP 200 en `/plantas/api/uploads/{archivo}`.

**Prevención:** Nunca deployear sin checklist de preservación de `data/` + conteo de archivos en `uploads/`. Ver skill `anthos-vps-deploy`.

---

## 2026-08-30 — Cron de avisos (`notify-today`) no corre

**Síntoma:** No llegan notificaciones push programadas; el log de cron vacío o "Permission denied".

**Contexto:** VPS, crontab con `scripts/notify-today.sh`.

**Causa:** El script no tiene permiso de ejecución (`chmod`) o crontab lo invoca sin `bash`.

**Solución:**
```bash
chmod 755 /opt/plantas/scripts/notify-today.sh
crontab -l | grep notify-today   # debe usar: bash /opt/plantas/scripts/notify-today.sh
tail -3 /var/log/plantas/notify-today.log
```

**Prevención:** Incluir verificación de permisos y crontab en cada deploy. Crontab recomendado con `CRON_TZ=America/Argentina/Buenos_Aires`.

---

## 2026-08-30 — Login Google rechazado con redirect a IP cruda del VPS

**Síntoma:** OAuth / Google Cloud rechaza URIs como `http://149.50.156.136/...`; login no completa en producción.

**Contexto:** Auth en VPS, Firebase + Auth.js.

**Causa:** Google no permite redirect URIs con IP cruda; hay que usar dominio autorizado de Firebase Hosting.

**Solución:** Bridge en `https://plantas-patio.web.app/auth-login.html` → usuario firma con Google → vuelve a `/plantas/login` con ID token → servidor verifica con firebase-admin. Desplegar hosting con `cd notify-web && npx firebase deploy --only hosting`. Variables: `FIREBASE_SERVICE_ACCOUNT_PATH`, `AUTH_SECRET`, `FIREBASE_AUTH_REQUIRED=1`.

**Prevención:** No intentar OAuth directo contra la IP; mantener bridge y dominios en Firebase Console (`plantas-patio.web.app`, `localhost`).

---

## 2026-08-30 — Secretos del VPS perdidos al redeploy

**Síntoma:** Tras deploy, login o push dejan de funcionar; faltan `.env` o `firebase-adminsdk.json`.

**Contexto:** Deploy VPS, archivos fuera de git.

**Causa:** `.env` y JSON de service account no van en el tarball; un deploy limpio no los restaura solo.

**Solución:** Antes del swap, confirmar que existen `/opt/plantas/.env` y `/opt/plantas/secrets/firebase-adminsdk.json` (permisos 600). Copiarlos desde backup si hace falta.

**Prevención:** Checklist de secretos post-deploy; nunca commitear credenciales.
