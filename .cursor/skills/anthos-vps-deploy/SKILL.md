---
name: anthos-vps-deploy
description: >-
  Deploy seguro de Anthos/Plantas al VPS: conservar data/uploads y app.db,
  verificar fotos referenciadas, permisos de cron y secretos. Usar cuando el
  usuario pida deploy, subir al VPS, producción 149.50.156.136/plantas, o
  cambios que afecten data/, uploads, notify-today o crontab.
disable-model-invocation: true
---

# Deploy seguro Anthos (VPS)

## Regla principal

**Usar siempre `python scripts/deploy-vps.py`** — no improvisar con tar/cp manual.

En cada deploy hay que conservar `data/app.db` + `data/uploads/` y comprobar que las fotos siguen ahí.

### Por qué la base quedaba en 0 bytes (NO repetir)

El script viejo hacía esto mal:

1. Extraía el tarball en `plantas.new` **incluyendo** `data/.gitkeep` → ya existía `plantas.new/data/`
2. Corría `cp -a /opt/plantas/data /opt/plantas.new/data` → Linux anida la copia → **`data/data/app.db`** (real) y **`data/app.db`** vacío (0 bytes)
3. Si el `cp` fallaba, un `|| mkdir -p .../uploads` **ocultaba el error** y el deploy seguía

**Reglas duras:**
- El tarball **nunca** incluye la carpeta `data/`
- Antes de copiar: `rm -rf plantas.new/data`
- Verificar `app.db` > 1 KB **antes** del swap
- Build en `plantas.new` **antes** del swap (si falla, producción intacta)
- `systemctl stop plantas` antes de tocar archivos
- `prisma db push` **antes** de `migrate-multi-garden.ts`
- **Prohibido** `|| mkdir` como fallback silencioso en pasos de data

## Contexto del proyecto

- **Producción:** `http://149.50.156.136/plantas` → `/opt/plantas`
- **Base:** `/opt/plantas/data/app.db` (SQLite)
- **Fotos:** `/opt/plantas/data/uploads/` — rutas en DB: `/api/uploads/{uuid}.jpg`
- **Cron avisos:** `scripts/notify-today.sh` → `POST /plantas/api/push/notify-today`
- **Backup útil:** `/opt/plantas.old/data/` si un deploy falló

El tarball de deploy **no incluye** fotos ni `app.db` locales (la PC no tiene las del patio). Hay que **preservar en el servidor** lo que ya existe.

## Checklist obligatorio (antes de dar por terminado)

```
Deploy seguro:
- [ ] Backup remoto de app.db (fecha en el nombre)
- [ ] data/ del VPS copiada intacta (app.db + uploads/)
- [ ] Conteo de archivos en data/uploads/ > 0 si hay portadas en DB
- [ ] Fotos referenciadas existen en disco
- [ ] chmod 755 en scripts/notify-today.sh
- [ ] crontab usa `bash /opt/plantas/scripts/notify-today.sh`
- [ ] Secretos presentes (.env, firebase-adminsdk.json si aplica)
- [ ] Servicio plantas active + HTTP 200 en /plantas/login
```

## Cómo deployear

```powershell
$env:VPS_HOST='149.50.156.136'
$env:VPS_PORT='5926'
$env:VPS_USER='root'
$env:VPS_PASS='...'
$env:LOCAL_ROOT='C:\Users\katia\OneDrive\Escritorio\Plantas'
python scripts/deploy-vps.py
```

Requiere `pip install paramiko`.

## Preservar data/uploads/

Al deployear (el script `deploy-vps.py` ya hace esto):

1. `systemctl stop plantas`
2. Backup: `cp -a /opt/plantas/data/app.db .../app.db.bak-FECHA`
3. Extraer código en `/opt/plantas.new` **sin** `data/`
4. `rm -rf /opt/plantas.new/data && cp -a /opt/plantas/data /opt/plantas.new/data`
5. Build en `.new`; solo si OK → swap `mv plantas plantas.old && mv plantas.new plantas`
6. Si algo falla, producción queda en `/opt/plantas` o se restaura desde `/opt/plantas.old/data/`

## Verificar fotos

Ejecutar en el VPS después del deploy:

```bash
# Archivos en disco
find /opt/plantas/data/uploads -type f ! -name '.gitkeep' | wc -l

# Plantas/pájaros con portada en DB
sqlite3 /opt/plantas/data/app.db \
  "SELECT COUNT(*) FROM Plant WHERE coverPhotoPath IS NOT NULL AND length(coverPhotoPath)>0;"

# Referencias rotas (debe dar missing 0)
python3 - <<'PY'
import sqlite3, os
conn = sqlite3.connect("/opt/plantas/data/app.db")
cur = conn.cursor()
paths = [r[0] for r in cur.execute(
  "SELECT coverPhotoPath FROM Plant WHERE coverPhotoPath IS NOT NULL AND length(coverPhotoPath)>0"
)]
paths += [r[0] for r in cur.execute(
  "SELECT coverPhotoPath FROM Bird WHERE coverPhotoPath IS NOT NULL AND length(coverPhotoPath)>0"
)]
missing = [p for p in paths if not os.path.isfile("/opt/plantas/data/uploads/" + p.split("/")[-1])]
print("referenced", len(paths), "missing", len(missing))
if missing:
  raise SystemExit("FOTOS FALTANTES — no cerrar deploy")
PY

# Muestra HTTP 200
FN=$(sqlite3 /opt/plantas/data/app.db \
  "SELECT coverPhotoPath FROM Plant WHERE coverPhotoPath IS NOT NULL LIMIT 1;" | xargs basename)
curl -s -o /dev/null -w "upload:%{http_code}\n" \
  "http://127.0.0.1:3000/plantas/api/uploads/$FN"
```

**Fallo:** `missing > 0` o `upload:404` → restaurar uploads desde backup y no declarar éxito.

## Verificar cron

```bash
stat -c '%a %n' /opt/plantas/scripts/notify-today.sh   # debe ser 755 (o al menos ejecutable)
crontab -l | grep notify-today                          # debe usar `bash .../notify-today.sh`
tail -3 /var/log/plantas/notify-today.log               # últimas ejecuciones OK
```

Si el permiso no es ejecutable:

```bash
chmod 755 /opt/plantas/scripts/notify-today.sh
```

Crontab recomendado:

```cron
CRON_TZ=America/Argentina/Buenos_Aires
0 15 * * 1-5 bash /opt/plantas/scripts/notify-today.sh
0 10 * * 0,6 bash /opt/plantas/scripts/notify-today.sh
```

(Ajustar hora según lo acordado con la usuaria.)

## Otros secretos que no deben perderse

- `/opt/plantas/.env` (AUTH_SECRET, PUSH_NOTIFY_SECRET, FIREBASE_SERVICE_ACCOUNT_PATH, …)
- `/opt/plantas/secrets/firebase-adminsdk.json` (600, fuera de git)

Tras deploy, confirmar que Firebase Admin responde (login Google) y que un `notify-today` manual devuelve HTTP 200.

## Resumen al usuario

Al cerrar un deploy, reportar en español:

- Plantas / eventos / fotos en disco (conteos)
- Si cron quedó ejecutable
- Si hubo restauración desde backup
