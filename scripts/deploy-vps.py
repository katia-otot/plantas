#!/usr/bin/env python3
"""Deploy seguro de Anthos al VPS.

Preserva app.db, uploads/, .env y secrets/. Construye en plantas.new ANTES del
swap para no romper producción si falla el build.

Uso (PowerShell):
  $env:VPS_HOST='149.50.156.136'
  $env:VPS_PORT='5926'
  $env:VPS_USER='root'
  $env:VPS_PASS='...'
  $env:LOCAL_ROOT='C:\\Users\\...\\Plantas'
  python scripts/deploy-vps.py

Requiere: pip install paramiko
"""

from __future__ import annotations

import io
import os
import sys
import tarfile
import time
from datetime import date
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Falta paramiko: pip install paramiko", file=sys.stderr)
    raise SystemExit(1) from None

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ["VPS_HOST"]
PORT = int(os.environ.get("VPS_PORT", "22"))
USER = os.environ["VPS_USER"]
PASSWORD = os.environ["VPS_PASS"]
LOCAL_ROOT = Path(os.environ["LOCAL_ROOT"])
REMOTE_DIR = os.environ.get("REMOTE_DIR", "/opt/plantas")
MIN_DB_BYTES = 1024

EXCLUDE_DIRS = {
    "node_modules",
    ".next",
    ".git",
    ".cursor",
    "agent-transcripts",
    "notify-web",
    "data",  # NUNCA empaquetar data/ del repo local
}
EXCLUDE_FILES = {".env", ".env.local"}


def should_include(path: Path) -> bool:
    rel = path.relative_to(LOCAL_ROOT)
    if rel.parts and rel.parts[0] in EXCLUDE_DIRS:
        return False
    if set(rel.parts) & EXCLUDE_DIRS:
        return False
    if path.name in EXCLUDE_FILES:
        return False
    if path.suffix in {".db", ".db-journal", ".db-wal", ".db-shm"}:
        return False
    lower = path.name.lower()
    if "firebase-adminsdk" in lower or "service-account" in lower:
        return False
    return True


def make_tarball() -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for path in LOCAL_ROOT.rglob("*"):
            if path.is_file() and should_include(path):
                tar.add(
                    path,
                    arcname=str(path.relative_to(LOCAL_ROOT)).replace("\\", "/"),
                )
    return buffer.getvalue()


def run(client: paramiko.SSHClient, command: str, timeout: int = 1800) -> str:
    print(f"$ {command}")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-5000:] if len(out) > 5000 else out)
    if err.strip():
        print(err[-3000:] if len(err) > 3000 else err)
    if code != 0:
        raise RuntimeError(f"Command failed ({code}): {command}")
    return out


def main() -> None:
    backup_date = date.today().isoformat()
    new_dir = f"{REMOTE_DIR}.new"
    old_dir = f"{REMOTE_DIR}.old"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}:{PORT}...")
    client.connect(
        HOST,
        port=PORT,
        username=USER,
        password=PASSWORD,
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
    )

    # 1. Parar servicio antes de tocar archivos
    run(client, "systemctl stop plantas || true")
    time.sleep(1)

    # 2. Backup de app.db (no borrar backups viejos)
    run(
        client,
        f"test -f {REMOTE_DIR}/data/app.db && "
        f"cp -a {REMOTE_DIR}/data/app.db "
        f"{REMOTE_DIR}/data/app.db.bak-{backup_date} && "
        f"ls -la {REMOTE_DIR}/data/app.db.bak-{backup_date} || "
        f"echo 'WARN: no hay app.db en producción'",
    )

    # 3. Subir código SIN data/
    archive = make_tarball()
    print(f"Archive MB: {len(archive) / 1024 / 1024:.2f}")

    sftp = client.open_sftp()
    with sftp.file("/tmp/plantas-deploy.tar.gz", "wb") as f:
        f.write(archive)

    # 4. Extraer en .new, borrar cualquier data/ del tarball, copiar data real
    run(
        client,
        f"rm -rf {new_dir} && mkdir -p {new_dir} && "
        f"tar -xzf /tmp/plantas-deploy.tar.gz -C {new_dir} && "
        f"rm -f /tmp/plantas-deploy.tar.gz && "
        f"rm -rf {new_dir}/data && "
        f"cp -a {REMOTE_DIR}/data {new_dir}/data && "
        f"cp -a {REMOTE_DIR}/.env {new_dir}/.env && "
        f"cp -a {REMOTE_DIR}/secrets {new_dir}/secrets 2>/dev/null || true",
    )

    # 5. Verificar DB antes de build/swap (abortar si está vacía)
    run(
        client,
        f"test -s {new_dir}/data/app.db && "
        f"test $(stat -c%s {new_dir}/data/app.db) -ge {MIN_DB_BYTES} && "
        f"ls -la {new_dir}/data/app.db && "
        f"find {new_dir}/data/uploads -type f ! -name '.gitkeep' | wc -l",
    )

    # 6. Build en .new — si falla, producción no se toca
    run(
        client,
        f"cd {new_dir} && "
        "chmod 755 scripts/notify-today.sh 2>/dev/null || true && "
        "npm install && "
        "NEXT_PUBLIC_BASE_PATH=/plantas npx prisma db push && "
        "npx tsx scripts/migrate-multi-garden.ts && "
        "NEXT_PUBLIC_BASE_PATH=/plantas npm run build && "
        "test -f .next/BUILD_ID",
        timeout=1800,
    )

    # 7. Swap atómico solo después de build OK
    run(
        client,
        f"rm -rf {old_dir} && "
        f"mv {REMOTE_DIR} {old_dir} && "
        f"mv {new_dir} {REMOTE_DIR}",
    )

    # 7b. Migrar schema en la DB activa (DATABASE_URL apunta a /opt/plantas/data)
    run(
        client,
        f"cd {REMOTE_DIR} && NEXT_PUBLIC_BASE_PATH=/plantas npx prisma db push",
    )

    run(client, "systemctl restart plantas")
    time.sleep(4)
    run(client, "systemctl is-active plantas")
    run(
        client,
        "curl -s -o /dev/null -w 'login:%{http_code}\\n' "
        "http://127.0.0.1/plantas/login",
    )
    run(
        client,
        f"stat -c '%s' {REMOTE_DIR}/data/app.db && "
        f"find {REMOTE_DIR}/data/uploads -type f ! -name '.gitkeep' | wc -l",
    )

    # 8. Quitar cron viejo de notify-today (scheduler interno en la app)
    run(
        client,
        "(crontab -l 2>/dev/null | grep -v notify-today || true) | crontab - || true",
    )
    run(
        client,
        "crontab -l 2>/dev/null | grep notify-today && "
        "echo 'WARN: sigue habiendo cron notify-today' || "
        "echo 'cron notify-today: none (OK)'",
    )
    run(
        client,
        "journalctl -u plantas -n 40 --no-pager | grep notification-scheduler | tail -3 || "
        "echo 'WARN: no hay log del scheduler aún (revisar tras unos segundos)'",
    )

    sftp.close()
    client.close()
    print(f"Deploy OK: http://{HOST}/plantas/mapa")


if __name__ == "__main__":
    main()
